from typing import List, Tuple, Dict, Optional
from typing_extensions import TypedDict
from collections import defaultdict
from lib.node import Node
from lib.agents import Agent


class Flowchart(TypedDict):
    """Raw flowchart data from JSON file."""
    edges: List[Tuple[int, int]]
    nodes: List[Dict[str, Node]]
    agents: Optional[List[Agent]]
    triggers: Optional[List[int]]
    name: Optional[str]


class Graph(Flowchart):
    """Validated and processed graph structure."""
    parsing_order: List[int]
    dependencies: defaultdict[int, List[int]]
    nodes: List[Node]
    metric_node_descriptions: Dict[int,str]
    
