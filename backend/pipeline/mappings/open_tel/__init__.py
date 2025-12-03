from .logs import read_logs
from .metrics import read_metrics
from .spans import read_spans
from ..helpers import MappingValues

open_tel_mappings : dict[str, MappingValues] = {
    "open_tel_spans_input": {
        "node_fn": read_spans
    },
    "open_tel_metrics_input":{
        "node_fn": read_metrics
    },
    "open_tel_logs_input": {
        "node_fn": read_logs
    }
}