from toposort import toposort, toposort_flatten
from typing import TypedDict, Callable, Any
from collections import defaultdict
import pathway as pw
import json

class MappingValues(TypedDict):
    node_fn: Callable[[list[pw.Table] | pw.Table], pw.Table]

    # function that takes parameters (the parameters are defined in lib/) and returns the kwargs dict that is directly passed to the pathway_obj_ref
    kwargs_parser: Callable[..., dict[str, Any]]

mappings : dict[str, MappingValues] =  {

}

# Purpose: get all hyperparameters field names and values defined in the classes in lib/ for a particular node object
def get_all_params(obj):
    # Get all attributes (both from instance and class)
    keys = set(dir(obj))

    # Exclude Python internal ones (start/end with '__')
    exclude = {"id", "category"}
    keys = {k for k in keys if not (k.startswith('__') and k.endswith('__')) and k not in exclude}

    return { key: getattr(obj, key) for key in keys}


class Graph(TypedDict):
    parsing_order : list[int]
    dependencies: defaultdict[int, list[int]]
    # TODO: change this type from Any to the base class we would get from lib/
    nodes: Any

flowchart_file = "flowchart.json"
"""
Reads the flowchart, toposorts it and returns the dependency order.
"""
def read() -> Graph:
    with open(flowchart_file, "r") as f:
        data = json.loads(f)
        # array of nodes, in this file nodes will be identified by their indexes in this array
        nodes = data["nodes"]
        # TODO: VALIDATE if this is a valid graph or not using a validate function we will implement in lib/
        dependencies = defaultdict(list)
        for (_from,_to) in data["edges"]:
            dependencies[_to].append(_from)

        return {
            "parsing_order" : toposort_flatten(dependencies,nodes),
            "nodes" : nodes,
            "dependencies" : dependencies,
        }
"""
Builds the entire pathway computational graph in the order of toposort after which we only need to call pw.run
"""
def build(graph : Graph):
    nodes = graph["nodes"]
    node_outputs = [None] * len(nodes)
    for node_index in graph["parsing_order"]:
        node = nodes[node_index]
        mapping = mappings[node.id]

        ## Note: VERY IMPORTANT, we are assuming that the edges array in the flowchart.json provides dependencies in the order they are to be used
        ## i.e if node 3 requires node 1 as the first input and node 2 as the second input , then in the edges array in flowchart.json
        ## (1,3) will come first then (2,3)
        args = [node_outputs[input_node_ind] for input_node_ind in graph["dependencies"][node_index]]
        kwargs = mapping["kwargs_parser"](**get_all_params(node))
        node_outputs[node_index] = mapping["node_fn"](*args,**kwargs)



if __name__ == "__main__":
    graph = read()
    build(graph)
    pw.run()

