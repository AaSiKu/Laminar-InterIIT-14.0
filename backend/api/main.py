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

from lib.validate import node_map
NODES: Dict[str, BaseModel] = node_map


from backend.pipeline.dockerScript import (
    run_docker_container_with_json, stop_docker_container
)

# https://fastapi.tiangolo.com/fa/advanced/events/
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.docker_client = docker.from_env()
    yield
    app.state.docker_client.close()

app = FastAPI(title="Pipeline API", lifespan = lifespan)

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


