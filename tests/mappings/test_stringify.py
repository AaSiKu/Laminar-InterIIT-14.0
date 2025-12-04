import sys
sys.path.insert(0, "./backend")
from backend.pipeline.graph_reader import read_and_validate_graph
from backend.pipeline.graph_builder import build_computational_graph
from backend.pipeline.metric_node import find_special_column_sources, pretty_print_metric_nodes
from backend.pipeline.mappings.open_tel.prefix import is_special_column
import json

graph = read_and_validate_graph("_flowchart.json")

node_outputs = build_computational_graph(
        graph["nodes"],
        graph["parsing_order"],
        graph["dependencies"]
    )

for metric_node_idx in graph["metric_node_descriptions"].keys():
    graph["metric_node_descriptions"][metric_node_idx]["special_columns_source_indexes"] = {
        col: find_special_column_sources(metric_node_idx,col,graph) for col in node_outputs[metric_node_idx].column_names() if is_special_column(col) and 'trace_id' in col
    }


pretty_print_metric_nodes(graph["metric_node_descriptions"])