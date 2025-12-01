import json
from typing import Dict, List, Set, Tuple
from collections import defaultdict
from .validate import validate_nodes, validate_graph_topology
from lib.agents import Agent
from .types import Graph, Flowchart
from lib.utils import get_node_class_map
from lib.node import Node
from .mappings import mappings

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
    
    # Identify metric nodes and generate descriptions
    metric_node_descriptions = identify_metric_nodes_with_descriptions(
        nodes, data["edges"], id2index_map, dependencies, parsing_order
    )
    
    return {
        **data,
        "parsing_order": parsing_order,
        "nodes": nodes,
        "dependencies": dependencies,
        "agents": agents,
        "metric_node_descriptions": metric_node_descriptions,
    }


def build_parent_graph_description(
    metric_node_idx: int,
    nodes: List[Node],
    dependencies: Dict[int, List[int]],
    parsing_order: List[int]
) -> str:
    """
    Build a natural language description of the parent graph for a metric node.
    
    Args:
        metric_node_idx: Index of the metric node
        nodes: List of validated node instances
        dependencies: Mapping of node index to list of parent indices
        parsing_order: Topologically sorted node indices
    
    Returns:
        Natural language description of the parent graph
    """
    # Find all ancestors of the metric node
    ancestors = set()
    to_visit = [metric_node_idx]
    
    while to_visit:
        current = to_visit.pop()
        if current in ancestors:
            continue
        ancestors.add(current)
        
        # Add parent nodes to visit
        if current in dependencies:
            to_visit.extend(dependencies[current])
    
    # Get ancestors in topological order
    ordered_ancestors = [idx for idx in parsing_order if idx in ancestors]
    
    # Build input variable mapping for each node
    # Input nodes get no variables, others get $1, $2, etc. based on their inputs
    input_vars: Dict[int, List[str]] = {}
    
    for idx in ordered_ancestors:
        node = nodes[idx]
        
        # Input nodes (source nodes) have no inputs
        if idx not in dependencies or len(dependencies[idx]) == 0:
            input_vars[idx] = []
        else:
            # Create input variable references ($1, $2, etc.)
            parent_indices = dependencies[idx]
            input_vars[idx] = [f"${i+1}" for i in range(len(parent_indices))]
    
    # Generate description lines
    description_lines = []
    
    for position, idx in enumerate(ordered_ancestors, start=1):
        node = nodes[idx]
        inputs = input_vars.get(idx, [])
        node_mapping = mappings[node.node_id]
        # Use the node's stringify method if available
        if (stringify := node_mapping.get("stringify")):
            node_desc = stringify(node,inputs)
        else:
            # Fallback: use node_id and category
            node_desc = f"{node.node_id} node"
            if inputs:
                node_desc += f" on {', '.join(inputs)}"
        
        description_lines.append(f"{position}. {node_desc}")
    
    return "\n".join(description_lines)


def identify_metric_nodes_with_descriptions(
    nodes: List[Node],
    edges: List[dict],
    id2index_map: Dict[str, int],
    dependencies: Dict[int, List[int]],
    parsing_order: List[int]
) -> Dict[int, str]:
    """
    Identify metric nodes (nodes connected to TriggerRCA) and generate
    natural language descriptions of their parent graphs.
    
    Args:
        nodes: List of validated node instances
        edges: List of edge dictionaries from flowchart
        id2index_map: Mapping of node IDs to indices
        dependencies: Mapping of node index to list of parent indices
        parsing_order: Topologically sorted node indices
    
    Returns:
        Dictionary mapping metric node index to its parent graph description
    """
    metric_descriptions = {}
    
    # Find all TriggerRCA nodes
    trigger_rca_indices = [
        idx for idx, node in enumerate(nodes)
        if node.node_id == "trigger_rca"
    ]
    
    if not trigger_rca_indices:
        return metric_descriptions
    
    # For each TriggerRCA node, find its input nodes (metric nodes)
    for trigger_idx in trigger_rca_indices:
        # Get parent nodes of this TriggerRCA node
        if trigger_idx in dependencies:
            for metric_node_idx in dependencies[trigger_idx]:
                # Generate description for this metric node
                description = build_parent_graph_description(
                    metric_node_idx,
                    nodes,
                    dependencies,
                    parsing_order
                )
                metric_descriptions[metric_node_idx] = description
    
    return metric_descriptions
