#TODO: Exception Handling
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, Union, Optional, Type
import inspect
from pydantic import BaseModel
from contextlib import asynccontextmanager
import docker
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from lib.validate import node_map
NODES: Dict[str, BaseModel] = node_map


from backend.pipeline.dockerScript import (
    run_docker_container_with_json, stop_docker_container
)

# https://fastapi.tiangolo.com/fa/advanced/events/
@asynccontextmanager
async def lifespan(app: FastAPI):
    
    try:
        app.state.docker_client = docker.from_env()
        logger.info("docker client created")
    except Exception as e:
        app.state.docker_client = None
        logger.error(f"error initializing docker client: {str(e)}")
    
    yield
    
    if getattr(app.state, "docker_client", None):
        try:
            app.state.docker_client.close()
            logger.info("docker client closed")
        except Exception as e:
            logger.error(f"error closing docker file: {str(e)}")


app = FastAPI(title="Pipeline API", lifespan = lifespan)

def get_base_pydantic_model(model_class: type) -> type:
    mro = getattr(model_class, "__mro__", ())
    for i, cls in enumerate(mro):
        if cls is BaseModel:
            return mro[i - 1] if i > 0 else cls
    return model_class


@app.get("/schema/all")
def schema_index(request: Request):
    #return {"nodes": list(NODES.keys())}
    io_node_ids = [node_id for node_id, cls in NODES.items() if cls.__module__ == 'backend.lib.io_nodes']
    table_ids = [node_id for node_id, cls in NODES.items() if cls.__module__ == 'backend.lib.tables']
    return {
        "io_nodes": io_node_ids,
        "table_nodes": table_ids
    }

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
async def docker_spinup(request: Request):
    if not request.app.state.docker_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="docker client not available")
    
    try:
        payload = await request.json()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"invalid JSON body: {str(e)}")
    
    client = request.app.state.docker_client
    
    try:
        result = run_docker_container_with_json(client, payload)
        return JSONResponse(result, status_code=status.HTTP_201_CREATED)
    except Exception as exc:
        logger.error(f"spinup failed: {exc}")
        return JSONResponse({"error": str(exc)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)@app.post("/spinup")


@app.post("/spindown")
async def docker_spindown(request: Request):
    """
    Expects JSON body: {"container_id": "..."}.
    Stops and removes the container.
    """
    if not request.app.state.docker_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="docker client not available")
    
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"invalid JSON body: {str(e)}")
    
    container_id = body.get("container_id")
    if not container_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="provide container_id in body")
    
    client = request.app.state.docker_client
    
    try:
        result = stop_docker_container(client, container_id)
        return JSONResponse(result, status_code=status.HTTP_200_OK)
    except docker.errors.NotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"container {container_id} not found")
    except Exception as exc:
        logger.error(f"spindown failed: {exc}")
        return JSONResponse({"error": str(exc)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


