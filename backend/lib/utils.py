import inspect
from typing import Dict, Literal, Optional, get_args, get_origin
from typing_extensions import TypedDict
from pydantic import BaseModel
from . import io_nodes
from . import tables
from . import agents
from . import trigger_rca
from .open_tel import input_nodes
from .types import RdKafkaSettings

def get_node_class_map():
    """
    Collect all node classes from lib/io_node.py, lib/tables.py, and lib/rag.py
    that define a class attribute `node_id`, and return a mapping
    of node_id -> class reference.
    """
    node_map = {}
    modules = [
        io_nodes,
        tables,
        agents,
        trigger_rca,
        input_nodes
    ]

    for module in modules:
        for name, cls in inspect.getmembers(module, inspect.isclass):
            # Check if class is defined in this module or its submodules
            if not cls.__module__.startswith(module.__name__):
                continue
            if not issubclass(cls, BaseModel):
                continue
            if 'node_id' in cls.model_fields:
                node_id_type = cls.model_fields['node_id'].annotation
                if not (get_origin(node_id_type) is Literal):
                    continue
                node_id_value = get_args(node_id_type)[0]
                node_map[node_id_value] = cls

    return node_map


node_map = get_node_class_map()



def convert_rdkafka_settings(settings: RdKafkaSettings) -> Dict[str, str]:
    """
    
    Converts RdKafkaSettings to rdkafka format (dot.notation) (i.e pathway's expected format)
    
    Args:
        settings: RdKafkaSettings
        
    Returns:
        Dictionary with rdkafka settings in Pathway's expected format
        
    Example:
        Input: {"bootstrap_servers": "localhost:9092", "group_id": "my-group"}
        Output: {"bootstrap.servers": "localhost:9092", "group.id": "my-group"}
    """
    rdkafka_config = {}
    
    # Key mapping from snake_case to dot.notation
    key_mapping = {
        "bootstrap_servers": "bootstrap.servers",
        "security_protocol": "security.protocol",
        "sasl_mechanism": "sasl.mechanism",
        "sasl_username": "sasl.username",
        "sasl_password": "sasl.password",
        "group_id": "group.id",
        "auto_offset_reset": "auto.offset.reset",
    }
    
    for key, value in settings.items():
        if value is None or value == "":
            continue
            
        # Use mapping if available, otherwise convert snake_case to dot.notation
        rdkafka_key = key_mapping.get(key, key.replace("_", "."))
        rdkafka_config[rdkafka_key] = str(value)
    
    return rdkafka_config



if __name__ == "__main__":
    for nid, cls in node_map.items():
        print(f"{nid}: {cls.__name__}")
