from lib.node import Node
from .mappings.open_tel.prefix import open_tel_trace_id
from typing import Optional, Dict, List, Any
from .types import MetricNodeDescription
from .mappings import mappings
import json

prefixes = ["_pw_left_","_pw_right_","_pw_grouped_", "_pw_windowed_"]


def is_special_column(column_name: str) -> bool:
    """
    Check if a column is special (contains the trace ID suffix).
    
    Args:
        column_name: Name of the column to check
    
    Returns:
        True if column is special, False otherwise
    """
    return open_tel_trace_id in column_name


def is_rename_node(node: Node) -> bool:
    """
    Check if a node performs transformations that modify column names
    (join, groupby, windowby operations).
    
    Args:
        node: Node instance to check
    
    Returns:
        True if node is a transformation node, False otherwise
    """
    transformation_types = {
        "join", "asof_join", "asof_now_join", 
        "interval_join", "window_join",
        "groupby", "windowby"
    }
    return node.node_id in transformation_types


def extract_original_column_name(column_name: str, node: Node) -> Optional[str]:

    """
    Extract the original column name by removing prefixes added by transformations.
    
    Args:
        column_name: Prefixed column name
        node: The transformation node that added the prefix
    
    Returns:
        Original column name without prefix, or None if not a transformed column
    """
    if is_rename_node(node):
        for prefix in prefixes:
            if column_name.startswith(prefix):
                return column_name[len(prefix):]
        return column_name
    else:
        raise Exception("No point in extracting original column name from a node that does not rename columns")

def return_ordered_ancestors(
    metric_node_idx: int,
    dependencies: Dict[int, List[int]],
    parsing_order: List[int]
):
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
    return ordered_ancestors

def find_special_column_sources(
    current_node_idx: int,
    special_col: str,
    nodes: Dict[int, Node],
    edges: List[Dict[str,Any]],
    id2index_map: Dict[str, int],
) -> List[int]:
    """
    For each special column in the current node, find the last node(s) that contained
    that column before any node other than (filter, json_select, flatten) was applied.
    
    Args:
        metric_node_idx: Index of the metric node
        nodes: Dictionary mapping node indices to Node instances
        node_outputs: List of Pathway tables (node outputs)
        edges: List of edge dictionaries with 'source' and 'target' keys
        id2index_map: Mapping from node IDs to indices
    
    Returns:
        Dictionary mapping special column names (in metric node) to source node indices
    """
    # Build adjacency list for backward traversal: target -> [(source, edge_order)]
    # edge_order determines left (0) vs right (1) for joins
    incoming_edges: Dict[int, List[tuple[int, int]]] = {}
    for edge in edges:
        source = edge['source']
        target = edge['target']
        source = id2index_map[source]
        target = id2index_map[target]
        if target not in incoming_edges:
            incoming_edges[target] = []
        incoming_edges[target].append(source)

    # Passthrough node types that don't change the semantic meaning
    semantic_nodes = {"filter", "json_select", "flatten"}
    
    if len(incoming_edges.get(current_node_idx,[])) == 0:
        return [current_node_idx]
    
    sources = []
    current_source = None
    while len(incoming_edges.get(current_node_idx,[])) > 0:
        
        current_node = nodes[current_node_idx]

        if current_node.node_id in semantic_nodes or hasattr(current_node,"input_schema"):
            if current_source is None:
                current_source = current_node_idx
            continue
        
        current_source = None
        # If this is a transformation node, extract original column name
        if is_rename_node(current_node):
            original_col = extract_original_column_name(special_col, current_node)
            
            
            # For join operations, determine which input(s) to track
            if current_node.node_id.find("join") != -1:
                # Check which side(s) the column came from based on prefix
                if special_col.startswith("_pw_left_"):
                    sources.extend(find_special_column_sources(incoming_edges[current_node_idx][0],original_col,nodes,edges,id2index_map))
                    break
                elif special_col.startswith("_pw_right_"):
                    sources.extend(find_special_column_sources(incoming_edges[current_node_idx][1],original_col,nodes,edges,id2index_map))
                    break
                else:
                    for parent_idx in incoming_edges[current_node_idx]:
                        sources.extend(find_special_column_sources(parent_idx,original_col,nodes,edges,id2index_map))
                    break
            else:
                special_col = original_col
    if current_source is not None:
        sources.append(current_source)
    
    current_node_idx = incoming_edges.get(current_node_idx,[None])[0]
    return sources 



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
    
    ordered_ancestors = return_ordered_ancestors(metric_node_idx,dependencies,parsing_order)

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
            input_vars[idx] = [f"${ordered_ancestors.index(i)+1}" for i in parent_indices]
    
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
            data = node.model_dump()
            if data.get("table_schema"):
                data.pop("table_schema")
            node_desc = f"{node.node_id} node {json.dumps(data)}"
        
        description_lines.append(f"{position}. {node_desc}")
    
    return "\n".join(description_lines), { idx: i+1 for i,idx in enumerate(ordered_ancestors)}


def identify_metric_nodes_with_descriptions(
    nodes: List[Node],
    edges: List[Dict[str,Any]],
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
                description, description_indexes_mapping = build_parent_graph_description(
                    metric_node_idx,
                    nodes,
                    dependencies,
                    parsing_order
                )
                metric_descriptions[metric_node_idx] = {
                    "description": description,
                    "description_indexes_mapping": description_indexes_mapping,
                    "special_columns_source_indexes": {
                    }
                }
    
    return metric_descriptions

def pretty_print_metric_nodes(metric_descriptions: List[MetricNodeDescription]):
    """Print metric node descriptions in a readable format."""
    for metric_idx in metric_descriptions:
        metric = metric_descriptions[metric_idx]
        print(f"\n{'='*80}")
        print(f"Metric Node Index: {metric_idx}")
        print(f"{'='*80}")
        
        if 'description' in metric:
            print("\nPipeline Description:")
            print(metric['description'])
        
        if 'description_indexes_mapping' in metric:
            print("\nNode Index Mapping:")
            for idx, pos in metric['description_indexes_mapping'].items():
                print(f"  Node {idx} -> Position ${pos}")
        
        if 'special_columns_source_indexes' in metric:
            print("\nSpecial Column Sources:")
            for col, sources in metric['special_columns_source_indexes'].items():
                print(f"  {col}: {sources}")
        
        print(f"{'='*80}\n")