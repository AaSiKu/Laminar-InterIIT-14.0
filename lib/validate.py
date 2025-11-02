import inspect
from pydantic import ValidationError
from typing import List, Dict, Any, Literal, get_args, get_origin
import io_nodes
import tables

def get_node_class_map():
    """
    Collect all node classes from lib/io_node.py and lib/tables.py
    that define a class attribute `node_id`, and return a mapping
    of node_id -> class reference.
    """
    node_class_map = {}
    modules = [io_nodes, tables]

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

def validate_nodes(node_data_list: List[Dict[str, Any]]):
    """
    Validate an array of node objects using dynamically loaded Pydantic models.

    Each dict in node_data_list must have a 'node_id' key.
    The function looks up the corresponding class from node_class_map[node_id],
    instantiates it to trigger validation, and returns the list of validated instances.

    Raises:
        KeyError: if node_id is not found in class map.
        ValidationError: if node JSON fails model validation.
    """

    node_class_map = get_node_class_map()
    validated_nodes = []

    for node_data in node_data_list:
        if "node_id" not in node_data:
            raise ValueError(f"Node missing 'node_id': {node_data}")

        node_id = node_data["node_id"]
        if node_id not in node_class_map:
            raise KeyError(f"Unknown node_id '{node_id}'")

        node_class = node_class_map[node_id]

        try:
            validated = node_class(**node_data)
            validated_nodes.append(validated)
        except ValidationError as e:
            raise ValidationError(
                f"Validation failed for node_id='{node_id}': {e}"
            ) from e

    return validated_nodes

if __name__ == "__main__":
    for nid, cls in node_map.items():
        print(f"{nid}: {cls.__name__}")
