import os
import logging
import os
import docker
import asyncio
from dotenv import load_dotenv
from typing_extensions import Annotated
from typing import Any, Dict, List, Union, Optional, Type
from pydantic import BaseModel, Field
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from backend.api.routers.auth.database import Base
from backend.api.routers.main_router import router
from backend.api.routers.websocket import watch_changes
from utils.logging import get_logger, configure_root

configure_root()
logger = get_logger(__name__)
load_dotenv()


MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "db")
WORKFLOW_COLLECTION = os.getenv("WORKFLOW_COLLECTION", "workflows")
NOTIFICATION_COLLECTION = os.getenv("NOTIFICATION_COLLECTION", "notifications")
VERSION_COLLECTION = os.getenv("VERSION_COLLECTION", "versions")
# Global variables
mongo_client = None
db = None
workflow_collection = None
notification_collection = None
version_collection = None
user_collection = None
docker_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db, workflow_collection, notification_collection, user_collection, docker_client, version_collection

    # ---- STARTUP ----
    if not MONGO_URI:
        raise RuntimeError("MONGO_URI not set in environment")

    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[MONGO_DB]
    workflow_collection = db[WORKFLOW_COLLECTION]
    version_collection = db[VERSION_COLLECTION]
    notification_collection = db[NOTIFICATION_COLLECTION]
    print(f"Connected to MongoDB at {MONGO_URI}, DB: {MONGO_DB}", flush=True)

    # Create SQL database tables for users
    try:
        from backend.api.routers.auth.database import get_engine
        db_engine = get_engine()
        # Use begin() for transaction, but check=True to ensure it works
        async with db_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        print("SQL database tables created/verified", flush=True)
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL database: {e}")
        logger.error("User authentication features will not work until PostgreSQL is available.")
        print(f"ERROR: PostgreSQL connection failed: {e}", flush=True)
        print("ERROR: User authentication features will not work until PostgreSQL is available.", flush=True)
        print("Run 'python3 backend/auth/init_db.py' to create the tables manually.", flush=True)

    app.state.workflow_collection = workflow_collection
    app.state.version_collection = version_collection
    app.state.notification_collection= notification_collection
    app.state.mongo_client=mongo_client
    app.state.secret_key = os.getenv("SECRET_KEY", "default_secret_key")
    app.state.algorithm = os.getenv("ALGORITHM", "HS256")
    app.state.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
    app.state.refresh_token_expire_minutes = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 43200))
    app.state.revoked_tokens = set()  # default 30 days
    app.state.docker_client = docker.from_env()
    
    print(f"Connected to docker daemon")

    asyncio.create_task(watch_changes(notification_collection))
    print("Started MongoDB change stream listener")


    yield

     # ---- SHUTDOWN ----
    if docker_client:
        docker_client.close()
        print("Docker connection closed")
    if mongo_client:
        mongo_client.close()
        print("MongoDB connection closed.")
    try:
        from backend.api.routers.auth.database import get_engine
        db_engine = get_engine()
        await db_engine.dispose()
        print("SQL database connection closed.")
    except Exception as e:
        logger.warning(f"Error closing PostgreSQL connection: {e}")


app = FastAPI(title="Pipeline API", lifespan=lifespan)

origins = [
    # TODO: Add final domain, port here
    "http://localhost:4173",
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:8083"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

