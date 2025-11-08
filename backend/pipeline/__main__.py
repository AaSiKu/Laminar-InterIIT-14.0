import json
from typing import TypedDict, List, Tuple, Dict,  Literal
from collections import defaultdict
from toposort import toposort_flatten
from langgraph.graph.state import CompiledStateGraph
from lib.validate import validate_nodes
from lib.node import Node
from lib.agent import Agent

import os
from dotenv import load_dotenv
load_dotenv(os.getenv("ENV_FILE", default=".env"))

from .agentic import build_agentic_graph
from .mappings import mappings, get_col
from .postgre import connection_string_write
import pathway as pw


# Final agent answer schema


pw.set_license_key(os.environ["PATHWAY_LICENSE_KEY"])


class Prompt(pw.Schema):
    prompt: str


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
    node_outputs : List[pw.Table] = [None] * len(nodes)

    for node_index in graph["parsing_order"]:
        node = nodes[node_index]
        mapping = mappings[node.node_id]

        ## Note: VERY IMPORTANT, we are assuming that the edges array in the flowchart.json provides dependencies in the order they are to be used
        ## i.e if node 3 requires node 1 as the first input and node 2 as the second input , then in the edges array in flowchart.json
        ## (1,3) will come first then (2,3)
        args = [node_outputs[input_node_ind] for input_node_ind in graph["dependencies"][node_index]]
        table = mapping["node_fn"](args,node)

        if table is None:
            continue
        node_outputs[node_index] = table
        ## Persist snapshot to postgre
        primary_keys = [get_col(table,col) for col in table.schema.primary_key_columns()]
        pw.io.postgres.write(table, connection_string_write, f"{node.node_id}__{node_index}", output_table_type="snapshot", primary_key=primary_keys, init_mode="create_if_not_exists")

    return node_outputs



    
if __name__ == "__main__":
    graph = read()
    node_outputs : List[pw.Table] = build(graph)
    # Build agentic graph i.e register all user defined agents along with their tools to langggraph supervisor agent
    supervisor = build_agentic_graph(graph["agents"], graph["name"], graph["nodes"], node_outputs)

    answer_tables : Dict[str,pw.Table] = {}
    for trigger in graph["triggers"]:
        # TODO: Check if trigger node is not the RAG node. If it is the rag node, raise error or do not subscribe
        trigger_node = node_outputs[trigger]
        trigger_description = graph["nodes"][trigger].trigger_description
        if not trigger_description:
            raise Exception("Every trigger node should have a description")
        trigger_name = f"{graph["nodes"][trigger].node_id}_{trigger}"
        answer_tables[trigger_name] = supervisor["trigger"](trigger_name,trigger_description, trigger_node.schema, input_table=trigger_node).successful


    prompts = pw.io.csv.read("prompts.csv", schema=Prompt, mode="streaming")
    prompts_answers:pw.Table = supervisor["prompt"](input_table=prompts).successful

    all_answers = prompts_answers.concat_reindex(*answer_tables.values())
    all_answers = all_answers.with_columns(
        row_id = pw.this.id
    )
    pw.io.postgres.write(all_answers, connection_string_write, f"all_answers", output_table_type="snapshot", primary_key=[all_answers.row_id], init_mode="create_if_not_exists")

    pw.run()
    

