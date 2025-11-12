from typing import Literal, List, Tuple
from .base import TableNode

ops = Literal["==", "<", "<=", ">=", ">", "!=", "startswith", "endswith", "find"]
class FilterNode(TableNode):
    node_id: Literal["filter"]
    # col, operation, value
    filters: List[Tuple[str, ops, int | float | str]]
    n_inputs: Literal[1] = 1
