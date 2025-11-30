import json
from typing import Dict, List
from collections import defaultdict
from .validate import validate_nodes, validate_graph_topology
from lib.agents import Agent
from .types import Graph, Flowchart


def id2index(nodes: List[dict]) -> Dict[str, int]:
    """
    Convert node IDs to their indices in the node list.
    
    Args:
        nodes: List of node dictionaries with 'id' field
    
    Returns:
        Mapping of node id to node index
    
    Raises:
        KeyError: If a node is missing the 'id' field
    """
    mapping = {}
    for index, node in enumerate(nodes):
        if 'id' not in node:
            raise KeyError(f"Node at index {index} missing 'id' field")
        mapping[node['id']] = index
    return mapping


def read_flowchart_file(filepath: str) -> Flowchart:
    """
    Read and parse the flowchart JSON file.
    
    Args:
        filepath: Path to the flowchart JSON file
    
    Returns:
        Parsed flowchart data
    """
    with open(filepath, "r") as f:
        return json.load(f)


def parse_agents(data: Flowchart) -> List[Agent]:
    """
    Parse agents from flowchart data.
    
    Args:
        data: Flowchart data
    
    Returns:
        List of Agent instances
    """
    if data.get("agents",None) is None:
        return []
    
    return [Agent(**agent) for agent in data.get("agents")]


def read_and_validate_graph(filepath: str) -> Graph:
    """
    Read the flowchart file, validate it, and return the graph structure.
    
    Args:
        filepath: Path to the flowchart JSON file
    
    Returns:
        Validated graph with nodes, dependencies, and parsing order
    """
    # Read flowchart data
    data = read_flowchart_file(filepath)
    
    # Validate and parse nodes
    nodes = validate_nodes(data["nodes"])
    
    # Parse agents
    agents = parse_agents(data)
    
    # Build id-to-index mapping
    id2index_map = id2index(data["nodes"])
    
    # Validate graph topology and get parsing order and dependencies
    parsing_order, dependencies = validate_graph_topology(
        nodes, data["edges"], id2index_map
    )
    
    return {
        **data,
        "parsing_order": parsing_order,
        "nodes": nodes,
        "dependencies": dependencies,
        "agents": agents,
    }
