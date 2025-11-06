import logging
import sys, os
import subprocess
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson.objectid import ObjectId
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware 
from typing import Any, Dict, Union, Optional, Type
import inspect
from pydantic import BaseModel
from contextlib import asynccontextmanager
import docker
from fastapi.middleware.cors import CORSMiddleware
import logging
import httpx
import socket
from backend.lib.validate import node_map
from utils.logging import get_logger, configure_root
from backend.api.dockerScript import (
    run_pipeline_container, stop_docker_container
)

configure_root()
logger = get_logger(__name__)

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "db")
WORKFLOW_COLLECTION = os.getenv("MONGO_COLLECTION", "pipelines")
USER_COLLECTION = os.getenv("USER_COLLECTION", "users")


# Global variables
mongo_client = None
db = None
workflow_collection = None
docker_client = None
NODES: Dict[str, BaseModel] = node_map

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db, workflow_collection, user_collection, docker_client

    # ---- STARTUP ----
    if not MONGO_URI:
        raise RuntimeError("MONGO_URI not set in environment")

    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[MONGO_DB]
    workflow_collection = db[WORKFLOW_COLLECTION]
    user_collection = db[USER_COLLECTION]
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


app = FastAPI(title="Pipeline API", lifespan=lifespan)
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
    io_node_ids = [node_id for node_id, cls in NODES.items() if cls.__module__ == 'backend.lib.io_nodes']
    table_ids = [node_id for node_id, cls in NODES.items() if cls.__module__ == 'backend.lib.tables']
    return {
        "io_nodes": io_node_ids,
        "table_nodes": table_ids
    }

def _remap_schema_types(schema: dict) -> dict:
    """
    Recursively traverses a JSON schema and remaps standard JSON types
    to Python-style type names.
    """
    if isinstance(schema, dict):
        for key, value in schema.items():
            if key == 'type':
                if value == 'string':
                    schema[key] = 'str'
                elif value == 'integer':
                    schema[key] = 'int'
                elif value == 'number':
                    schema[key] = 'float'
                elif value == 'boolean':
                    schema[key] = 'bool'
            else:
                schema[key] = _remap_schema_types(value)
    elif isinstance(schema, list):
        return [_remap_schema_types(item) for item in schema]
    return schema

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
        schema = cls.model_json_schema()
    else:
        schema = cls.model_json_schema()
    
    return _remap_schema_types(schema)


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
                    'container_id': result['id'],
                    'host_port': result['host_port'],
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

@app.post("/run")
async def run_pipeline_endpoint(request: PipelineIdRequest):
    """
    Triggers a pipeline to run in its container.
    """
    pipeline = await workflow_collection.find_one({'_id': ObjectId(request.pipeline_id)})
    if not pipeline or not pipeline.get('host_port'):
        raise HTTPException(status_code=404, detail="Pipeline not found or not running")

    port = pipeline['host_port']
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
    if not pipeline or not pipeline.get('host_port'):
        raise HTTPException(status_code=404, detail="Pipeline not found or not running")

    port = pipeline['host_port']
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
    pipeline_id: Optional[str]
    path: str
    pipeline: Any

@app.post("/save")
async def save(data: Graph):
    """
    Saves the workflow to pipline db
    """
    try:
        if data.pipeline_id:
            result = await workflow_collection.update_one(
                {'_id': ObjectId(data.pipeline_id)},
                {
                    '$set':{
                        'path': data.path,
                        'pipeline': data.pipeline 
                    }
                }
            )
            return {"message": "successfully updated pipeline"}
        else:
            result = await  workflow_collection.insert_one({
                # TODO: set the remaining fields
                'user': 'TODO: later save from the auth token extraction',
                'path': data.path,
                'pipeline': data.pipeline,
                'container_id': "",
                'host_port': "",
                'host_ip': "",
                'status': False
                })
            return {"message": "Saved successfully", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/retrieve")
async def retrieve(data: PipelineIdRequest):
    """
    Retrieve back the workflow json form mongo
    """
    try:
        result = await workflow_collection.find_one({'_id': ObjectId(data.pipeline_id)})
        result['_id'] = str(result['_id'])
        return {"message": "Pipeline data retrieved successfully", **result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))