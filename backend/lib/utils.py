import inspect
from typing import Dict, Literal, get_args, get_origin
from . import io_nodes
from . import tables
# from . import rag
from . import alert


def get_node_class_map() -> Dict[str, type]:
    """
    Collect all node classes from lib/io_node.py, lib/tables.py, and lib/rag.py
    that define a class attribute `node_id`, and return a mapping
    of node_id -> class reference.
    """
    node_class_map = {}
    modules = [
        io_nodes,
        tables,
        alert
        # rag
    ]

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


if __name__ == "__main__":
    for nid, cls in node_map.items():
        print(f"{nid}: {cls.__name__}")
