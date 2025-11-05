import sys, os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson.objectid import ObjectId
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, Union, Optional, Type
import inspect
from pydantic import BaseModel
from contextlib import asynccontextmanager
import docker
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from lib.validate import node_map
from backend.pipeline.dockerScript import (
    run_docker_container_with_json, stop_docker_container
)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "db")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "pipelines")

mongo_client = None
db = None
collection = None
docker_client = None
NODES: Dict[str, BaseModel] = node_map

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db, collection, docker_client

    # ---- STARTUP ----
    if not MONGO_URI:
        raise RuntimeError("MONGO_URI not set in environment")

    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[MONGO_DB]
    collection = db[MONGO_COLLECTION]
    print(f"Connected to MongoDB at {MONGO_URI}, DB: {MONGO_DB}", flush=True)
    docker_client = docker.from_env()
    print(f"Connected to docker demon")

    yield

     # ---- SHUTDOWN ----
    if docker_client:
        docker_client.close()
        print("Docker connection closed")
    if mongo_client:
        mongo_client.close()
        print("MongoDB connection closed.")


app = FastAPI(title="Pipeline API")

origins = [
    "http://localhost",
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Helper functions ------- #
def get_base_pydantic_model(model_class: type) -> type:
    mro = getattr(model_class, "__mro__", ())
    for i, cls in enumerate(mro):
        if cls is BaseModel:
            return mro[i - 1] if i > 0 else cls
    return model_class


@app.get("/schema/all")
def schema_index(request: Request):
    return {"nodes": list(NODES.keys())}

def get_schema_for_node(node: Union[str, Type[Any]]) -> dict:
    if inspect.isclass(node):
        cls: Optional[Type[Any]] = node
    else:
        cls = NODES.get(node)

    if cls is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"node not found: {node}")

    if not (inspect.isclass(cls) and issubclass(cls, BaseModel)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="node is not a Pydantic model class")

    if hasattr(cls, "model_json_schema"):
        return cls.model_json_schema()
    return cls.model_json_schema()


@app.get("/schema/{node_name}")
def schema_for_node(node_name: str):

    schema_obj = get_schema_for_node(node_name)
    return JSONResponse(schema_obj)


@app.post("/spinup")
async def docker_spinup(load: dict, request: Request):

    client = request.app.state.docker_client
    result = run_docker_container_with_json(client, load)
    return JSONResponse(result)

@app.post("/spindown")
async def docker_spindown(body: dict, request: Request):

    client = request.app.state.docker_client
    container_id = body.get("container_id")

    response = stop_docker_container(client, container_id)
    return JSONResponse(response)


# ------- User Actions on Workflow --------- #

class Graph(BaseModel):
    graph: str

@app.post("/save")
def save(data: Graph):
    try:
        result = collection.insert_one(data.model_dump())
        return {"message": "Saved successfully", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))