from toposort import toposort_flatten
from typing import TypedDict, List, Tuple, Dict, Union
from collections import defaultdict
import json
import os
from dotenv import load_dotenv
load_dotenv(os.getenv("ENV_FILE", default="myapp/.env"))
from lib.validate import validate_nodes
from lib.node import Node
from lib.agent import Agent
from .agentic import build_agentic_graph
from .mappings import mappings
import pathway as pw
from langgraph.graph.state import CompiledStateGraph


pw.set_license_key(os.environ["PATHWAY_LICENSE_KEY"])


class Flowchart(TypedDict):
    edges: List[Tuple[int,int]]
    nodes: List[Dict[str,Node]]
    agents: List[Agent]
    triggers: List[int]
    name: str
class Graph(Flowchart):
    parsing_order : list[int]
    dependencies: defaultdict[int, list[int]]
    nodes: List[Node]


flowchart_file = "flowchart.json"
"""
Reads the flowchart, toposorts it and returns the dependency order.
"""
def read() -> Graph:
    with open(flowchart_file, "r") as f:
        data : Flowchart = json.load(f)
        # array of nodes, in this file nodes will be identified by their indexes in this array
        nodes = validate_nodes(data["nodes"])
        dependencies = defaultdict[int,list](list)
        agents = [Agent(**agent) for agent in data["agents"]]

        for (_from,_to) in data["edges"]:
            dependencies[_to].append(_from)

        for origin,dep in dependencies.items():
            node = nodes[origin]
            if len(dep) != node.n_inputs:
                raise Exception(f"A {node.node_id} node can only have {node.n_inputs} inputs")
            
        return {
            **data,
            "parsing_order" : [0] if len(nodes) == 1 else toposort_flatten(dependencies,nodes),
            "nodes" : nodes,
            "dependencies" : dependencies,
            "agents": agents,
        }
"""
Builds the entire pathway computational graph in the order of toposort after which we only need to call pw.run
"""
def build(graph : Graph):
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

def return_on_trigger(trigger_schema: type[pw.Schema], description: str, supervisor_agent: CompiledStateGraph):
    schema = trigger_schema.columns_to_json_serializable_dict()
    def on_change(key: pw.Pointer, row: dict, time: int, is_addition: bool):
        prompt = f"""
This is a trigger from a table with
Schema: {json.dumps(schema, indent=4)}\n
and description: {description}.

The row id of the update is {key}.
The new row content is {json.dumps(row,indent=4)}.
Time of update is {time}
{"This row is a new addition to the table" if is_addition else f"This update corresponds to a change in already existing row with id {key}"}
"""
        response = supervisor_agent.invoke({
            "messages": [{"role": "system", "content": prompt}]
        })
        with open("output2.log", "a+") as f:
            print(response["messages"][-1].content,file=f)
    return on_change


if __name__ == "__main__":
    graph = read()
    node_outputs : List[pw.Table] = build(graph)
    # Build agentic graph i.e register all user defined agents along with their tools to langggraph supervisor agent
    supervisor = build_agentic_graph(graph["agents"], graph["name"])
    # Loop through all triggers, and use pw.io.subscribe on each table that is a trigger
    for trigger in graph["triggers"]:
        # TODO: Check if trigger node is not the RAG node. If it is the rag node, raise error or do not subscribe
        trigger_node = node_outputs[trigger]
        tool_description = graph["nodes"][trigger].tool_description
        if not tool_description:
            raise Exception("Every trigger node should have a description")
        
        # the on_change function of the trigger should invoke the langgraph supervisor agent with the trigger data and trigger description
        pw.io.subscribe(trigger_node, return_on_trigger(trigger_node.schema, tool_description, supervisor))



    pw.run()
    

