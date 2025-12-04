from .input_connectors import input_connector_mappings
from .output_connectors import output_connector_mappings
from .transforms import transform_mappings
from .temporal import temporal_mappings
from .streaming_ml import ml_mappings
from .alerts import alert_node_fn
from .trigger_rca import trigger_rca
from .helpers import apply_datetime_conversions, MappingValues
from typing import Dict

# Combine all mappings
mappings: Dict[str,MappingValues] = {
    **output_connector_mappings,
    **input_connector_mappings,
    **transform_mappings,
    **temporal_mappings,
    "alert": {
        "node_fn": alert_node_fn
    },
    **ml_mappings,
    "trigger_rca": {
        "node_fn": trigger_rca
    }
}

__all__ = [
    "mappings",
    "input_connector_mappings",
    "output_connector_mappings",
    "transform_mappings",
    "temporal_mappings",
    "alert_node_fn",
    "apply_datetime_conversions",
    "MappingValues",
    "ml_mappings",
    "parse_table_schema",
    "trigger_rca"
]
