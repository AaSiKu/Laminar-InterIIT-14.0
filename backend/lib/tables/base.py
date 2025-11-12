from typing import Union, Literal
from datetime import datetime, timedelta
from ..node import Node

TimedeltaType = Union[int, float, timedelta, None]
DateTimeType = int | float | datetime | None

Reducer = Literal["any", "argmax", "argmin", "avg", "count", "count_distinct", "count_distinct_approximate", "earliest", "latest", "max", "min", "ndarray", "sorted_tuple", "stateful_many", "stateful_single", "sum", "tuple", "unique"]

class TableNode(Node):
    category: Literal["table"]

class TemporalNode(TableNode):
    category: Literal["temporal"]
