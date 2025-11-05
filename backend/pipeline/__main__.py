from toposort import toposort_flatten
from typing import TypedDict, List
from collections import defaultdict
import json
from lib.validate import validate_nodes
from lib.node import Node
from .mappings import mappings
import pathway as pw
from dotenv import load_dotenv
import os

load_dotenv()

pw.set_license_key(os.environ["PATHWAY_LICENSE_KEY"])


class Graph(TypedDict):
    parsing_order : list[int]
    dependencies: defaultdict[int, list[int]]
    nodes: List[Node]

flowchart_file = "flowchart.json"

def id2index(nodes: List[dict]) -> dict[str, int]:
    """
    Converts the ids to index of the node, mapping for the toposort logic
    """
    mapping = {}
    for index, node in enumerate(nodes):
        if 'id' not in node:
            raise KeyError("No id present for edge mapping")
        mapping[node['id']] = index
    return mapping


def read() -> Graph:
    """
    Reads the flowchart, toposorts it and returns the dependency order.
    """
    with open(flowchart_file, "r") as f:
        data = json.load(f)
        # array of nodes, in this file nodes will be identified by their indexes in this array
        nodes = validate_nodes(data["nodes"])
        # build an id index mapping for edges
        id2index_map = id2index(data["nodes"])
        dependencies = defaultdict[int](list)
        for edge in data["edges"]:
            dependencies[id2index_map[edge["target"]]].append(id2index_map[edge["source"]])

        for origin,dep in dependencies.items():
            node = nodes[origin]
            if len(dep) != node.n_inputs:
                raise Exception(f"A {node.node_id} node can only have {node.n_inputs} inputs")
        return {
            "parsing_order" : [0] if len(nodes) == 1 else toposort_flatten(dependencies,nodes),
            "nodes" : nodes,
            "dependencies" : dependencies,
        }

def build(graph : Graph):
    """
    Builds the entire pathway computational graph in the order of toposort after which we only need to call pw.run
    """
    nodes = graph["nodes"]
    node_outputs = [None] * len(nodes)
    for node_index in graph["parsing_order"]:
        node = nodes[node_index]
        mapping = mappings[node.node_id]

        ## Note: VERY IMPORTANT, we are assuming that the edges array in the flowchart.json provides dependencies in the order they are to be used
        ## i.e if node 3 requires node 1 as the first input and node 2 as the second input , then in the edges array in flowchart.json
        ## (1,3) will come first then (2,3)
        args = [node_outputs[input_node_ind] for input_node_ind in graph["dependencies"][node_index]]
        node_outputs[node_index] = mapping["node_fn"](args,node)
    return node_outputs


if __name__ == "__main__":
    graph = read()
    print(graph["parsing_order"])
    node_outputs : List[pw.Table] = build(graph)
    pw.run()


