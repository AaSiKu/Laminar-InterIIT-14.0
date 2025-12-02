from typing import Literal, List, Tuple, Optional
from typing_extensions import TypedDict
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


class JSONSelectNode(TableNode):
    node_id: Literal["json_select"]
    json_column: str
    property: str | int
    property_type: Literal["json", "str", "int", "float", "bool"]
    new_column_name: Optional[str]

class FlattenNode(TableNode):
    node_id : Literal["flatten"]
    column: str