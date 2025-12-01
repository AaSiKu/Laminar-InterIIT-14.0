import sys
sys.path.insert(0, "./backend")
from backend.pipeline.graph_reader import read_and_validate_graph

output = read_and_validate_graph("flowchart.json")
print(output["metric_node_descriptions"])