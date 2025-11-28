from pydantic import BaseModel
from typing import Any, Dict, Optional, Type, Union
from fastapi import APIRouter, Request, status, HTTPException
from backend.lib.utils import node_map
import inspect


router = APIRouter()
NODES: Dict[str, BaseModel] = node_map


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



@router.get("/all")
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

@router.get("/{node_name}")
def schema_for_node(node_name: str):
    """
    Returns the JSON schema for a specific node type.
    """
    schema_obj = get_schema_for_node(node_name)
    return schema_obj   
