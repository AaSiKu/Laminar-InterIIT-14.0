import json
from typing import TypedDict, List, Tuple, Dict,  Literal, Optional
from collections import defaultdict
from toposort import toposort_flatten
from lib.validate import validate_nodes
from lib.node import Node
from lib.agent import Agent
from lib.alert import AlertNode

import os
from dotenv import load_dotenv
load_dotenv()

from .agentic import build_agentic_graph
from .mappings import mappings, get_col
from postgres_util import connection_string
import pathway as pw


# TODO: Fix setup tools deprecation warnings
# TODO: Fix numpy v1 vs v2 conflicts warnings 
# TODO: Fix beartype warnings


pw.set_license_key(os.environ["PATHWAY_LICENSE_KEY"])


class Prompt(pw.Schema):
    prompt: str


class Flowchart(TypedDict):
    edges: List[Tuple[int,int]]
    nodes: List[Dict[str,Node]]
    agents: Optional[List[Agent]] = []
    triggers: Optional[List[int]] = []
    name: Optional[str] = ""
class Graph(Flowchart):
    parsing_order : list[int]
    dependencies: defaultdict[int, list[int]]
    nodes: List[Node]


flowchart_file = os.getenv("FLOWCHART_FILE", "flowchart.json")

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
        data : Flowchart = json.load(f)
        # array of nodes, in this file nodes will be identified by their indexes in this array
        nodes = validate_nodes(data["nodes"])

        agents = [Agent(**agent) for agent in data["agents"]] if hasattr(data,"agents") else []

        # TODO: Do not allow any outputs from the RAG node
        # build an id index mapping for edges
        id2index_map = id2index(data["nodes"])
        dependencies = defaultdict[int,list](list)
        for edge in data["edges"]:
            dependencies[id2index_map[edge["target"]]].append(id2index_map[edge["source"]])

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

def build(graph : Graph):
    """
    Builds the entire pathway computational graph in the order of toposort after which we only need to call pw.run
    """
    nodes = graph["nodes"]
    node_outputs : List[pw.Table] = [None] * len(nodes)

    for node_index in graph["parsing_order"]:
        node = nodes[node_index]
        mapping = mappings[node.node_id]

        ## Note: VERY IMPORTANT, we are assuming that the edges array in the flowchart file provides dependencies in the order they are to be used
        ## i.e if node 3 requires node 1 as the first input and node 2 as the second input , then in the edges array in flowchart file
        ## (1,3) will come first then (2,3)
        args = [node_outputs[input_node_ind] for input_node_ind in graph["dependencies"][node_index]]
        if node.node_id == "alert":
            input_node = nodes[graph["dependencies"][node_index][0]]
            if not hasattr(input_node,"trigger_description"):
                raise Exception("Every trigger node should have a description")
            node.input_trigger_description = input_node.trigger_description
        table = mapping["node_fn"](args,node)

        if table is None:
            continue
        node_outputs[node_index] = table
        ## Persist snapshot to postgres
        cols = table.schema.primary_key_columns() or []
        primary_keys = [get_col(table, col) for col in cols]
        if len(cols) == 0:
            table = table.with_columns(
                __row_id = pw.this.id
            )
            primary_keys= [table.__row_id]
        pw.io.postgres.write(table, connection_string, f"{node.node_id}__{node_index}", output_table_type="snapshot", primary_key=primary_keys, init_mode="create_if_not_exists")
        

        # TODO: For the RAG node, expose it as a tool to our agentic graph
    return node_outputs



    
if __name__ == "__main__":
    graph = read()
    node_outputs : List[pw.Table] = build(graph)
    # Build agentic graph i.e register all user defined agents along with their tools to langggraph supervisor agent
    supervisor = build_agentic_graph(graph["agents"], graph["name"] if hasattr(graph,"name") else "", graph["nodes"], node_outputs)

    answer_tables : Dict[str,pw.Table] = {}
    for trigger in (graph["triggers"] if hasattr(graph,"agents") else []):
        # TODO: Check if trigger node is not the RAG node. If it is the rag node, raise error or do not subscribe
        trigger_node = node_outputs[trigger]
        trigger_description = graph["nodes"][trigger].trigger_description
        if not trigger_description:
            raise Exception("Every trigger node should have a description")
        trigger_name = f"{graph["nodes"][trigger].node_id}_{trigger}"
        answer_tables[trigger_name] = supervisor["trigger"](trigger_name,trigger_description, trigger_node.schema, input_table=trigger_node).successful

    # TODO: Shift to a better input connector for prompts
    prompts = pw.io.csv.read("prompts.csv", schema=Prompt, mode="streaming")
    prompts_answers:pw.Table = supervisor["prompt"](input_table=prompts).successful
    if len(answer_tables.values()) > 0:
        all_answers = prompts_answers.concat_reindex(*answer_tables.values())
    else:
        all_answers = prompts_answers
    all_answers = all_answers.with_columns(
        row_id = pw.this.id
    )
    pw.io.postgres.write(all_answers, connection_string, f"all_answers", output_table_type="snapshot", primary_key=[all_answers.row_id], init_mode="create_if_not_exists")

    # TODO: Implement logging (appending) to a file output and error handling which will be stored/sent to the frontend for all cases 
    pw.run()


