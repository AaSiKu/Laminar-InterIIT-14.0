from typing import Literal, List, Tuple
from .base import TableNode, Reducer

ops = Literal["==", "<", "<=", ">=", ">", "!=", "startswith", "endswith", "find"]
class FilterNode(TableNode):
    node_id: Literal["filter"]
    # col, operation, value
    filters: List[Tuple[str, ops, int | float | str]]
    n_inputs: Literal[1] = 1

class GroupByNode(TableNode):
    node_id: Literal["group_by"]
    columns: List[str]
    # prev_col, reducer, new_col
    reducers: List[Tuple[str, Reducer, str]]
    n_inputs: Literal[1] = 1
