from typing import Literal, List, Tuple, TypedDict
from .base import TableNode, ReducerDict

ops = Literal["==", "<", "<=", ">=", ">", "!=", "startswith", "endswith", "find"]


class Filter(TypedDict):
    col: str
    op: ops
    value: int | float | str

class FilterNode(TableNode):
    node_id: Literal["filter"]
    # col, operation, value
    filters: List[Filter]
    n_inputs: Literal[1] = 1

class GroupByNode(TableNode):
    node_id: Literal["group_by"]
    columns: List[str]
    # prev_col, reducer, new_col
    reducers: List[ReducerDict]
    n_inputs: Literal[1] = 1

class SelectNode(TableNode):
    node_id: Literal["select"]
    columns: List[str]
    n_inputs: Literal[1] = 1

class RenameNode(TableNode):
    node_id: Literal["rename"]
    # old_name, new_name
    mapping: List[Tuple[str, str]]
    n_inputs: Literal[1] = 1

class WithoutNode(TableNode):
    node_id: Literal["without"]
    columns: List[str]
    n_inputs: Literal[1] = 1
