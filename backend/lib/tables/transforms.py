from typing import Literal
from .base import TableNode

class FilterNode(TableNode):
    node_id: Literal["filter"]
    # TODO: Handle filters on multiple columns and allow filtering based on string types
    col: str
    op: Literal["==", "<", "<=", ">=", ">", "!="]
    value: float
    n_inputs: Literal[1] = 1
