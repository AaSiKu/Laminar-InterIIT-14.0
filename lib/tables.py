from typing import Any, Optional, List, Union, Tuple, Literal
from pydantic import Field
from datetime import datetime, timedelta
import pathway as pw
from node import Node

class TableNode(Node):
    category: Literal["Table"] 
class TemporalNode(TableNode):
    category: Literal["temporal"] 


class FilterNode(TableNode):
    node_id: Literal["filter"]
    col: int
    op: str
    value: float


class SortNode(TableNode):
    node_id: Literal["sort"]
    key: str  # which column to sort


class SlidingNode(TemporalNode):
    node_id: Literal["sliding"]
    origin: float | datetime
    hop: float | timedelta
    duration: Optional[float | timedelta] = None
    ratio: Optional[int] = None


class TumblingNode(TemporalNode):
    node_id: Literal["tumbling"]
    origin: float | datetime | None
    duration: float | timedelta


class SessionNode(TemporalNode):
    node_id: Literal["session"]
    max_gap: Optional[float | timedelta] = None
    predicate: Optional[str] = None


class WindowByNode(TemporalNode):
    node_id: Literal["window_by"]
    time_col: int
    window_type: Literal["sliding", "tumbling", "session"]
    instance_col: Optional[int] = None


class IntervalsOverNode(TemporalNode):
    node_id: Literal["intervals_over"]
    at_col: int
    lower_bound: float | timedelta
    upper_bound: float | timedelta
    is_outer: bool = True


class JoinNode(TableNode):
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")
    result_id: Optional[Any] = Field(default=None)
    left_instance: Optional[Any] = Field(default=None)
    right_instance: Optional[Any] = Field(default=None)
    left_exactly_once: bool = Field(default=False)
    right_exactly_once: bool = Field(default=False)


class InnerJoinNode(JoinNode):
    node_id: Literal["join_inner"]
    how: Union[str, pw.JoinMode] = Field(default="inner")


class LeftJoinNode(JoinNode):
    node_id: Literal["join_left"]
    how: Union[str, pw.JoinMode] = Field(default="left")


class RightJoinNode(JoinNode):
    node_id: Literal["join_right"]
    how: Union[str, pw.JoinMode] = Field(default="right")


class OuterJoinNode(JoinNode):
    node_id: Literal["join_outer"]
    how: Union[str, pw.JoinMode] = Field(default="outer")


class ConcatNode(TableNode):
    category: Literal["Table"]
    node_id: Literal["concat"]


class ConcatReindexNode(TableNode):
    category: Literal["Table"]
    node_id: Literal["concat_reindex"]


class IntersectNode(TableNode):
    category: Literal["Table"]
    node_id: Literal["intersect"]


class DifferenceNode(TableNode):
    category: Literal["Table"]
    node_id: Literal["difference"]


class UpdateRowsNode(TableNode):
    category: Literal["Table"]
    node_id: Literal["update_rows"]


class UpdateCellsNode(TableNode):
    category: Literal["Table"]
    node_id: Literal["update_cells"]


class RestrictNode(JoinNode):
    category: Literal["Table"]
    node_id: Literal["restrict"]
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")
