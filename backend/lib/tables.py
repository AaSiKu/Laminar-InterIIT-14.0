from typing import Any, Optional, List, Union, Tuple, Literal
from pydantic import Field
from datetime import datetime, timedelta
import pathway as pw
from .node import Node

class TableNode(Node):
    category: Literal["table"]

class TemporalNode(TableNode):
    category: Literal["temporal"]


class FilterNode(TableNode):
    node_id: Literal["filter"]
    col: str
    op: Literal["==", "<", "<=", ">=", ">", "!="]
    value: float
    n_inputs : Literal[1] = 1


class SortNode(TableNode):
    node_id: Literal["sort"]
    col: str  # which column to sort
    n_inputs : Literal[1] = 1

class WindowByNode(TemporalNode):
    n_inputs: Literal[1] = 1
    time_col: str
    instance_col: Optional[int] = None

class SlidingNode(WindowByNode):
    node_id: Literal["sliding"]
    origin: float | datetime | None
    hop: float | timedelta
    duration: float | timedelta


class TumblingNode(WindowByNode):
    node_id: Literal["tumbling"]
    origin: float | datetime | None
    duration: float | timedelta


class SessionNode(WindowByNode):
    node_id: Literal["session"]
    max_gap: Optional[float | timedelta] = None



class JoinNode(TableNode):
    n_inputs: Literal[2] = 2
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: pw.JoinMode = pw.JoinMode.INNER



class ConcatNode(TableNode):
    node_id: Literal["concat"]
    n_inputs: Literal[2] = 2

class UpdateRowsNode(TableNode):
    node_id: Literal["update_rows"]
    n_inputs: Literal[2] = 2