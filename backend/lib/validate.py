import inspect
from pydantic import ValidationError
from typing import List, Dict, Any, Literal, get_args, get_origin
from . import io_nodes
from . import tables
from . import rag
from .node import Node

def get_node_class_map():
    """
    Collect all node classes from lib/io_node.py, lib/tables.py, and lib/rag.py
    that define a class attribute `node_id`, and return a mapping
    of node_id -> class reference.
    """
    node_class_map = {}
    modules = [io_nodes, tables, rag]

    for module in modules:
        for name, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != module.__name__:
                continue
            if 'node_id' in cls.model_fields:
                node_id_type = cls.model_fields['node_id'].annotation
                if not (get_origin(node_id_type) is Literal):
                    continue
                node_id_value = get_args(node_id_type)[0]
                node_class_map[node_id_value] = cls

    return node_class_map


node_map = get_node_class_map()

# TODO: Make sure only input nodes are the source nodes for any graph
def validate_nodes(node_data_list: List[Dict[str, Any]]) -> List[Node]:
    """
    Validate an array of node objects using dynamically loaded Pydantic models.

    Each dict in node_data_list must have a 'node_id', 'category' key.
    The function looks up the corresponding class from node_class_map[node_id],
    instantiates it to trigger validation, which require the 'data'.'properties' key
    and returns the list of validated instances.

    Raises:
        KeyError: if node_id or category or data is not found in class map.
        ValidationError: if node JSON fails model validation.
    """

    node_class_map = get_node_class_map()
    validated_nodes = []

    for node_data in node_data_list:
        if "node_id" not in node_data:
            raise ValueError(f"Node missing 'node_id': {node_data}")

        if "category" not in node_data:
            raise ValueError(f"Node missing 'category': {node_data}")

        node_id = node_data["node_id"]
        if node_id not in node_class_map:
            raise KeyError(f"Unknown node_id '{node_id}'")

        node_class = node_class_map[node_id]

        if "data" not in node_data or "properties" not in node_data["data"] or len(node_data["data"]["properties"]) == 0:
            raise ValueError(f"Error parsing 'properties': {node_data}" )

        parsed_node_data = {}
        parsed_node_data["node_id"] = node_id
        parsed_node_data["category"] = node_data["category"]
        for prop_dict in node_data["data"]["properties"]:
            _label = prop_dict["label"]
            _value = prop_dict["value"]
            parsed_node_data[_label] = _value

        print(parsed_node_data)

        try:
            validated = node_class(**parsed_node_data)
            validated_nodes.append(validated)
        except ValidationError as e:
            raise ValueError(f"Validation failed for node_id='{node_id}': {e}") from e

    return validated_nodes

if __name__ == "__main__":
    for nid, cls in node_map.items():
        print(f"{nid}: {cls.__name__}")
