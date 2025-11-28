import logging
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson.objectid import ObjectId
from fastapi import FastAPI, Request, status, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.security import OAuth2PasswordBearer
from typing import Any, Dict, Union, Optional, Type
from pydantic import BaseModel
from contextlib import asynccontextmanager
import inspect
import docker
import logging
from jose import JWTError, jwt
import httpx
import socket
import json
from backend.lib.utils import node_map
from utils.logging import get_logger, configure_root
from .dockerScript import (
    run_pipeline_container, stop_docker_container
)
from aiokafka import AIOKafkaConsumer


from backend.auth.routes import router as auth_router
from backend.auth.routes import get_current_user


import asyncio
from bson.json_util import dumps
from datetime import datetime, timedelta
from typing import List


configure_root()
logger = get_logger(__name__)

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "db")
WORKFLOW_COLLECTION = os.getenv("MONGO_COLLECTION", "pipelines")
NOTIFICATION_COLLECTION = os.getenv("NOTIFICATION_COLLECTION", "notifications")
USER_COLLECTION = os.getenv("USER_COLLECTION", "users")
print("NOTIFICATION COLLECTION", NOTIFICATION_COLLECTION)
print("WORKFLOW COLLECTION", WORKFLOW_COLLECTION)
print("USERS COLLECTION", USER_COLLECTION)
# Global variables
mongo_client = None
db = None
workflow_collection = None
notification_collection = None
user_collection = None
docker_client = None
NODES: Dict[str, BaseModel] = node_map

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db, workflow_collection, notification_collection, user_collection, docker_client

    # ---- STARTUP ----
    if not MONGO_URI:
        raise RuntimeError("MONGO_URI not set in environment")

    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[MONGO_DB]
    workflow_collection = db[WORKFLOW_COLLECTION]
    user_collection = db[USER_COLLECTION]
    notification_collection = db[NOTIFICATION_COLLECTION]
    print(f"Connected to MongoDB at {MONGO_URI}, DB: {MONGO_DB}", flush=True)

    app.state.user_collection = user_collection
    app.state.secret_key = os.getenv("SECRET_KEY")
    app.state.algorithm = os.getenv("ALGORITHM", "HS256")
    app.state.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
    app.state.revoked_tokens = set()
    app.state.refresh_token_expire_minutes = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 43200))  # default 30 days



    docker_client = docker.from_env()
    print(f"Connected to docker daemon")

    asyncio.create_task(watch_changes())
    print("Started MongoDB change stream listener")


    yield

     # ---- SHUTDOWN ----
    if docker_client:
        docker_client.close()
        print("Docker connection closed")
    if mongo_client:
        mongo_client.close()
        print("MongoDB connection closed.")


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


# ---------------- AUTH HELPERS ---------------- #
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ---------------- HELPER FUNCTIONS ---------------- #
def get_base_pydantic_model(model_class: type) -> type:
    """
    Traverses the Method Resolution Order (MRO) of a class to find the first
    Pydantic BaseModel subclass.
    """
    mro = getattr(model_class, "__mro__", ())
    for i, cls in enumerate(mro):
        if cls is BaseModel:
            return mro[i - 1] if i > 0 else cls
    return model_class


@app.get("/schema/all")
def schema_index(request: Request):
    """
    Returns category wise list of all available node types.
    """
    io_node_ids = [node_id for node_id, cls in NODES.items() if cls.__module__.startswith('backend.lib.io_nodes')]
    table_ids = [node_id for node_id, cls in NODES.items() if cls.__module__.startswith('backend.lib.tables')]
    agent_ids = [node_id for node_id, cls in NODES.items() if cls.__module__.startswith('backend.lib.agents')]
    return {
        "io_nodes": io_node_ids,
        "table_nodes": table_ids,
        "agent_nodes": agent_ids,
    }

def get_schema_for_node(node: Union[str, Type[Any]]) -> dict:
    """
    Retrieves the Pydantic JSON schema for a given node type.
    """
    if inspect.isclass(node):
        cls: Optional[Type[Any]] = node
    else:
        cls = NODES.get(node)

    if cls is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"node not found: {node}")

    if not (inspect.isclass(cls) and issubclass(cls, BaseModel)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="node is not a Pydantic model class")

    if hasattr(cls, "model_json_schema"):
        schema = cls.model_json_schema(mode='serialization')
    else:
        schema = cls.model_json_schema(mode='serialization')

    return schema


@app.get("/schema/{node_name}")
def schema_for_node(node_name: str):
    """
    Returns the JSON schema for a specific node type.
    """
    schema_obj = get_schema_for_node(node_name)
    return schema_obj

# ------- Docker container functions ------- #
class PipelineIdRequest(BaseModel):
    pipeline_id: str

@app.post("/spinup")
async def docker_spinup(request: PipelineIdRequest):
    """
    Spins up a container from the 'pathway_pipeline' image.
    - Expects JSON: `{"pipeline_id": "..."`}
    - Returns the dynamically assigned host port.
    """
    client = docker_client
    if not client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Docker client not available")

    try:
        result = run_pipeline_container(client, request.pipeline_id)
        # A trick to get the primary outbound IP address of the machine by connecting to a public DNS server.
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        host_ip = s.getsockname()[0]
        s.close()
        # Save the results of the container
        await workflow_collection.update_one(
            {'_id': ObjectId(request.pipeline_id)},
            {
                '$set':{
                    'container_id': result['pipeline_container_id'],
                    'pipeline_host_port': result['pipeline_host_port'],
                    'agentic_host_port': result['agentic_host_port'],
                    'db_host_port': result['db_host_port'],
                    'host_ip': host_ip,
                    'status': False, # the status is of pipeline, it will be toggled from the docker container
                }
            }
        )
        return JSONResponse(result, status_code=status.HTTP_201_CREATED)
    except docker.errors.ImageNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as exc:
        logger.error(f"Spinup failed for '{request.pipeline_id}': {exc}")
        return JSONResponse({"error": str(exc)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.post("/spindown")
async def docker_spindown(request: PipelineIdRequest):
    """
    Stops and removes the container identified by its name (pipeline_id).
    - Expects JSON: `{"pipeline_id": "..."}`
    """
    client = docker_client
    if not client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Docker client not available")

    try:
        result = stop_docker_container(client, request.pipeline_id)
        await workflow_collection.update_one(
                {'_id': ObjectId(request.pipeline_id)},
                {
                    '$set':{
                        'container_id': "",
                        'host_port': "",
                        'host_ip': "",
                        'status': False,
                    }
                }
        )
        return JSONResponse(result, status_code=status.HTTP_200_OK)
    except docker.errors.NotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Container '{request.pipeline_id}' not found")
    except Exception as exc:
        logger.error(f"Spindown failed for '{request.pipeline_id}': {exc}")
        return JSONResponse({"error": str(exc)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# Include the modular auth router
app.include_router(auth_router, prefix="/auth", tags=["auth"])

@app.post("/run")
async def run_pipeline_endpoint(request: PipelineIdRequest):
    """
    Triggers a pipeline to run in its container.
    """
    pipeline = await workflow_collection.find_one({'_id': ObjectId(request.pipeline_id)})
    if not pipeline or not pipeline.get('pipeline_host_port'):
        raise HTTPException(status_code=404, detail="Pipeline not found or not running")

    port = pipeline['pipeline_host_port']
    ip = pipeline['host_ip']
    url = f"http://{ip}:{port}/trigger"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url)
            response.raise_for_status()
            await workflow_collection.update_one(
                {'_id': ObjectId(request.pipeline_id)},
                {'$set': {'status': True}}
            )
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to trigger pipeline: {exc}")

@app.post("/stop")
async def stop_pipeline_endpoint(request: PipelineIdRequest):
    """
    Stops a running pipeline in its container.
    """
    pipeline = await workflow_collection.find_one({'_id': ObjectId(request.pipeline_id)})
    if not pipeline or not pipeline.get('pipeline_host_port'):
        raise HTTPException(status_code=404, detail="Pipeline not found or not running")

    port = pipeline['pipeline_host_port']
    ip = pipeline['host_ip']
    url = f"http://{ip}:{port}/stop"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url)
            response.raise_for_status()
            await workflow_collection.update_one(
                {'_id': ObjectId(request.pipeline_id)},
                {'$set': {'status': False}}
            )
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to stop pipeline: {exc}")


# ------- User Actions on Workflow --------- #

class Graph(BaseModel):
    pipeline_id: Optional[str] = None
    path: str
    pipeline: Any

@app.post("/save")
async def save_graph(
    data: Graph,
    current_user: dict = Depends(get_current_user)
):
    """
    Saves a workflow graph to the pipeline database, linked to the current user.
    """
    try:
        user_identifier = str(current_user["_id"])
        print(f"Saving pipeline for user: {user_identifier}", flush=True)
        print(f"Pipeline ID: {data.pipeline_id}", flush=True)
        
        # If pipeline_id exists, try to update
        if data.pipeline_id:
            try:
                existing = await workflow_collection.find_one({
                    '_id': ObjectId(data.pipeline_id),
                    'user': user_identifier
                })
            except Exception as e:
                print(f"Error finding pipeline: {e}", flush=True)
                existing = None
            
            if existing:
                # Pipeline exists - update it
                result = await workflow_collection.update_one(
                    {'_id': ObjectId(data.pipeline_id)},
                    {
                        '$set': {
                            "path": data.path,
                            "pipeline": data.pipeline,
                        }
                    }
                )
                
                print(f"Updated pipeline: {data.pipeline_id}, matched: {result.matched_count}, modified: {result.modified_count}", flush=True)
                
                return {
                    "message": "Updated successfully",
                    "id": data.pipeline_id,
                    "user": user_identifier
                }
        
        # If we reach here, either no pipeline_id was provided or it didn't exist
        # Create new pipeline
        print(f"Creating new pipeline", flush=True)
        doc = {
            "user": user_identifier,
            "path": data.path,
            "pipeline": data.pipeline,
            "container_id": "",
            "host_port": "",
            "host_ip": "",
            "status": False
        }
        result = await workflow_collection.insert_one(doc)
        
        if not result.inserted_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to insert pipeline"
            )
        
        inserted_id = str(result.inserted_id)
        print(f"Inserted new pipeline: {inserted_id}", flush=True)
        
        return {
            "message": "Saved successfully",
            "id": inserted_id,
            "user": user_identifier
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.post("/retrieve")
async def retrieve(data: PipelineIdRequest):
    """
    Retrieve back the workflow json from mongo
    """
    try:
        result = await workflow_collection.find_one({'_id': ObjectId(data.pipeline_id)})
        if not result:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        
        result['_id'] = str(result['_id'])
        return {"message": "Pipeline data retrieved successfully", **result}
    except Exception as e:
        logger.error(f"Retrieve error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))



KAFKA_BOOTSTRAP_SERVER = os.getenv("KAFKA_BOOTSTRAP_SERVER", "localhost:9092")
SASL_USERNAME = os.getenv("KAFKA_SASL_USERNAME", None)
SASL_PASSWORD = os.getenv("KAFKA_SASL_PASSWORD", None)
SASL_MECHANISM = os.getenv("KAFKA_SASL_MECHANISM", None)
SECURITY_PROTOCOL = os.getenv("KAFKA_SECURITY_PROTOCOL",None)

@app.websocket("/ws/alerts/{pipeline_id}")
async def alerts_ws(websocket: WebSocket, pipeline_id: str):
    await websocket.accept()
    print(pipeline_id)
    topic = f"alert_{pipeline_id}"

    kwargs = {}
    if SASL_USERNAME:
        kwargs = {
            "security_protocol": SECURITY_PROTOCOL,
            "sasl_mechanisms": SASL_MECHANISM,
            "sasl_plain_username": SASL_USERNAME,
            "sasl_password": SASL_PASSWORD,
        }
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVER,
    )

    await consumer.start()
    try:
        async for msg in consumer:
            try:
                payload = json.loads(msg.value.decode())
            except:
                payload = {"raw": msg.value.decode()}

            await websocket.send_json(payload)

    except WebSocketDisconnect:
        pass
    finally:
        await consumer.stop()

@app.get("/kpi")
async def fetch_kpi():
    # send a request to mongodb pipelines collection and get all pipelines associated with userid
    # total: display all pipelines
    # running: those with status=true
    # broken: those with status=false
    cursor = workflow_collection.find({"user":"TODO: later save from the auth token extraction"})
    all_pipelines = await cursor.to_list(length=None)
    running = []
    for pipeline in all_pipelines:
        if pipeline["status"] is True:
            running.append(pipeline["_id"])
    KPI = {
        "total": [str(item["_id"]) for item in all_pipelines],
        "running": [str(item["_id"]) for item in all_pipelines if item.get("status") is True],
        "broken": [str(item["_id"]) for item in all_pipelines if item.get("status") is False],
    }

    KPI_stats= {
        "total": len(KPI["total"]),
        "running": len(KPI["running"]),
        "broken": len(KPI["broken"])
    }
    print(KPI)
    return KPI_stats
   

active_connections = set()

async def broadcast(message: str):
    '''
    Sends/Broadcasts the notification to all connections
    '''
    for websocket in list(active_connections):
        try:
            print(message)
            await websocket.send_text(message)
            break
        except:
            active_connections.remove(websocket)


@app.websocket("/ws/pipeline")
async def websocket_endpoint(websocket: WebSocket):
    '''
    Creates a websocket and keeps it alive
    Deletes when websocket is inactive
    '''
    await websocket.accept()
    active_connections.add(websocket)

    try:
        while True:
            # Keep connection alive
            test = await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)


async def watch_changes():
    '''
    Listens for any insertion to the notifications collection
    '''
    condition = [
    {"$match": {"operationType": "insert"}}
]
    try:
        async with notification_collection.watch(condition) as stream:
            print("Change stream listener started")
            async for change in stream:
                print("-----------------")
                print("Mongo change:", dumps(change["fullDocument"]))
                await broadcast(dumps(change["fullDocument"]))
    except Exception as e:
        print("⚠ ChangeStream NOT running:", e)

class Alert(BaseModel):
    actions: List[str]
    action_taken: str
    taken_at: datetime


class Notification(BaseModel):
    title: str
    desc: str
    alert: Alert
    type: str
    timestamp: datetime
    user_id: str

@app.post("/add_notification")
async def add_notification(data: Notification):
    '''
    Route to add a notification 
    Would be called by an agent
    '''
    result = await notification_collection.insert_one(data.model_dump())

    return {
        "status": "success",
        "inserted_id": str(result.inserted_id),
        "inserted_data": data.model_dump()
    }

@app.get("/kpi_stats")
async def fetch_kpi_stats():
    cursor = workflow_collection.find({"user":"TODO: later save from the auth token extraction"})
    all_pipelines = await cursor.to_list(length=None)
    current = datetime.now()

    # stat 1: total runtime
    total_runtime = timedelta()
    for pipeline in all_pipelines:
        if pipeline["status"] is True:
            total_runtime += (current - datetime.fromisoformat(pipeline["start_time"]))
    
    # stat 2: total alerts
    total_alerts = 0
    pending_alerts = 0
    total_warnings = 0
    cursor_notif = notification_collection.find({"user_id":"testing"})
    all_notifs = await cursor_notif.to_list(length=None)
    for notif in all_notifs:
        if notif["alert"]["actions"] != []:
            total_alerts += 1
            if notif["alert"]["action_taken"] != "":
                pending_alerts += 1
        if notif["type"] == "warning":
            total_warnings+=1
    return [
    {
      'id': 'total-runtime',
      'title': 'Total Runtime',
      'value': int(total_runtime.seconds),
      'subtitle': 'Total runtime of running pipelines',
      'iconType': 'timeline',
      'iconColor': '#3b82f6',
    },
    {
      'id': 'total-alerts',
      'title': 'Total Alerts',
      'value': int(total_alerts),
      'subtitle': 'Total number of alerts generated',
      'iconType': 'access-time',
      'iconColor': '#10b981',
    },
    {
      'id': 'pending-alerts',
      'title': 'Pending Alerts',
      'value': pending_alerts,
      'subtitle': 'Alerts with action not taken',
      'iconType': 'error-outline',
      'iconColor': '#ef4444',
    },
    {
      'id': 'total-warnings',
      'title': 'Total Warnings',
      'value': total_warnings,
      'subtitle': 'Number of warnings generated',
      'iconType': 'speed',
      'iconColor': '#f59e0b',
    },
  ]
    return {
        "total_runtime": total_runtime,
        "total_alerts": total_alerts,
        "pending_alerts": pending_alerts,
        "total_warnings": total_warnings
    }


@app.get("/api/workflows")
async def workflow_data():
    cursor = workflow_collection.find({"user":"TODO: later save from the auth token extraction", "status": True}).sort("last_updated", -1)
    recent_pipelines = await cursor.to_list(length=3)
    data =[]
    for pipeline in recent_pipelines:
        print(pipeline["last_updated"])
        data.append({
            "id": str(pipeline["_id"]), "lastModified": str(pipeline["last_updated"])
        })
    return data
    
    


    