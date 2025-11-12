from typing import Any, Optional, List, Union, Tuple, Literal, TypedDict, ClassVar
from pydantic import Field
from datetime import datetime, timedelta
import pathway as pw
from .node import Node
from datetime import timedelta
from pydantic import BaseModel

TimedeltaType = Union[int, float, timedelta, None]
DateTimeType = int | float | datetime | None

class TableNode(Node):
    category: Literal["table"]

class TemporalNode(TableNode):
    category: Literal["temporal"]


class FilterNode(TableNode):
    node_id: Literal["filter"]
    # TODO: Handle filters on multiple columns and allow filtering based on string and datetime types
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
    is_groupby: ClassVar[bool] = True


class JoinNode(TableNode):
    node_id: Literal["join"]
    n_inputs: Literal[2] = 2
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Literal["left","right","inner", "outer"]
    left_exactly_once : Optional[bool] = False
    right_exactly_once : Optional[bool] = False

class AsofNowJoinNode(JoinNode):
    node_id: Literal['asof_now_join']
    join_id : Optional[Literal["self","other"]]

class ConcatNode(TableNode):
    node_id: Literal["concat"]
    n_inputs: Literal[2] = 2

class TemporalJoinNode(JoinNode):
    time_col1: str
    time_col2: str
    left_exactly_once: Optional[None]= None
    right_exactly_once: Optional[None]= None


class CommonBehaviour(TypedDict):
    delay : Optional[TimedeltaType]
    cutoff : Optional[TimedeltaType]
    keep_results : bool


class Session(TypedDict):
    max_gap: TimedeltaType
    window_type: Literal["session"]


class Sliding(TypedDict):
    hop: TimedeltaType
    duration: TimedeltaType
    origin: DateTimeType
    window_type: Literal["sliding"]

class Tumbling(TypedDict):
    duration: TimedeltaType
    origin: DateTimeType
    window_type: Literal["tumbling"]


class WindowByNode(TemporalNode):
    node_id: Literal["window_by"]
    n_inputs: Literal[1] = 1
    time_col: str
    instance_col: Optional[str] = None
    window: Union[Session,Sliding,Tumbling]
    behaviour: Optional[CommonBehaviour] = None

class AsofJoinNode(TemporalJoinNode):
    node_id: Literal["asof_join"]
    direction: Literal["backward","forward","nearest"]
    behaviour: Optional[CommonBehaviour] = None

class IntervalJoinNode(TemporalJoinNode):
    node_id: Literal["interval_join"]
    lower_bound: Union[timedelta,int]
    upper_bound: Union[timedelta,int]


class WindowJoinNode(TemporalJoinNode):
    node_id: Literal["window_join"]
    window: Union[Session,Sliding,Tumbling]

Reducer = Literal["any", "argmax", "argmin", "avg", "count", "count_distinct", "count_distinct_approximate", "earliest", "latest", "max", "min", "ndarray", "sorted_tuple", "stateful_many", "stateful_single", "sum", "tuple", "unique"]
class ReduceNode(TableNode):
    node_id: Literal["reduce"]
    # prev_col, reducer, new_col
    reducers: List[Tuple[str,Reducer,str]]
    retain_columns: Optional[List[str]]
    retain_instance: Optional[bool] = False
    n_inputs: Literal[1] = 1