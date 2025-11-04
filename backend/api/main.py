#TODO: Exception Handling
import sys, os
from pymongo import MongoClient
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse
from typing import Any, Dict, Union, Optional, Type
import inspect
from pydantic import BaseModel
from contextlib import asynccontextmanager
import docker
import bcrypt
from validate_email import validate_email
from fastapi.middleware.cors import CORSMiddleware

from lib.validate import node_map
NODES: Dict[str, BaseModel] = node_map


# save logic

from pydantic import BaseModel



from backend.pipeline.dockerScript import (
    run_docker_container_with_json, stop_docker_container
)

# https://fastapi.tiangolo.com/fa/advanced/events/
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.docker_client = docker.from_env()
    yield
    app.state.docker_client.close()


roles= {"admin", "user"}


app = FastAPI(title="Pipeline API")

origins = [
    "http://localhost.tiangolo.com",
    "https://localhost.tiangolo.com",
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



# from pydantic import BaseModel
# from typing import List, Optional

# # Each key-value property inside data.properties
# class Property(BaseModel):
#     label: str
#     value: str

# # Position object
# class Position(BaseModel):
#     x: float
#     y: float

# # Data object inside a Node
# class NodeData(BaseModel):
#     label: str
#     properties: List[Property]

# # Each node in the graph
# class Node(BaseModel):
#     id: str
#     type: str
#     position: Position
#     data: NodeData

# # Each edge between nodes
# class Edge(BaseModel):
#     id: str
#     source: str
#     sourceHandle: Optional[str] = None
#     target: str
#     targetHandle: Optional[str] = None
#     type: Optional[str] = None
#     label: Optional[str] = None
#     animated: Optional[bool] = False

# # The overall graph schema
# class GraphSchema(BaseModel):
#     nodes: List[Node]
#     edges: List[Edge]

client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client["pipeline_db"]
collection = db["graphs"]


class Graph(BaseModel):
    graph: str

@app.post("/save")
def save(data: Graph):
    try:
        result = collection.insert_one(data.model_dump())
        return {"message": "Saved successfully", "id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))