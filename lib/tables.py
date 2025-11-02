from typing import Any, Optional, List, Union, Tuple, Literal
from pydantic import Field
from datetime import datetime, timedelta
import pathway as pw
from node import Node

class FilterNode(Node):
    category: str = Field(default="Table") 
    col: int
    op: str
    value: float

class SortNode(Node):
    category: str = Field(default="Table") 
    key: str  # which column to sort
    # instance: Field(default=None)

class SlidingNode(Node):
    category: Literal["temporal"]
    origin: float | datetime
    hop: float | timedelta
    duration: Optional[float | timedelta] = None
    ratio: Optional[int] = None

class TumblingNode(Node):
    category: Literal["temporal"]
    origin: float | datetime | None
    duration: float | timedelta

class SessionNode(Node):
    category: Literal["temporal"]
    max_gap: Optional[float | timedelta] = None
    predicate: Optional[str] = None

class WindowByNode(Node):
    category: Literal["temporal"]
    time_col: int
    window_type: str  # sliding, tumbling, session
    instance_col: Optional[int] = None

class IntervalsOverNode(Node):
    category: Literal["temporal"]
    at_col: int
    lower_bound: float | timedelta
    upper_bound: float | timedelta
    is_outer: bool = True



class JoinNode(Node):
    """Join node configuration.

    Attributes:
        category: logical category
        node_id: node identifier
        on: list of tuples (table1_col, table2_col) for join conditions
        how: 'inner'|'left'|'right'|'outer' or pw.JoinMode
        result_id: optional id expression for result
        left_instance: optional instance column for left table
        right_instance: optional instance column for right table
        left_exactly_once: optimization flag for left table
        right_exactly_once: optimization flag for right table
    """
    category: str = Field(default="Table")
    node_id: str = Field(default="join")
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")
    result_id: Optional[Any] = Field(default=None)
    left_instance: Optional[Any] = Field(default=None)
    right_instance: Optional[Any] = Field(default=None)
    left_exactly_once: bool = Field(default=False)
    right_exactly_once: bool = Field(default=False)


class InnerJoinNode(JoinNode):
    """Inner join node configuration."""
    node_id: str = Field(default="join_inner")
    how: Union[str, pw.JoinMode] = Field(default="inner")


class LeftJoinNode(JoinNode):
    """Left join node configuration."""
    node_id: str = Field(default="join_left")
    how: Union[str, pw.JoinMode] = Field(default="left")


class RightJoinNode(JoinNode):
    """Right join node configuration."""
    node_id: str = Field(default="join_right")
    how: Union[str, pw.JoinMode] = Field(default="right")


class OuterJoinNode(JoinNode):
    """Outer join node configuration."""
    node_id: str = Field(default="join_outer")
    how: Union[str, pw.JoinMode] = Field(default="outer")

class ConcatNode(Node):
    """Concatenates this table with other tables.
    
    Requires schemas to be identical and IDs to be disjoint.
    Maps to pw.Table.concat().
    """
    category: str = Field(default="Table")
    node_id: str = Field(default="concat")


class ConcatReindexNode(Node):
    """Concatenates this table with other tables and reindexes.
    
    Maps to pw.Table.concat_reindex().
    """
    category: str = Field(default="Table")
    node_id: str = Field(default="concat_reindex")


class IntersectNode(Node):
    """Keeps rows from the left table whose IDs appear in the right table.
    
    Maps to pw.Table.intersect().
    """
    category: str = Field(default="Table")
    node_id: str = Field(default="intersect")

class DifferenceNode(Node):
    """Keeps rows from the left table whose IDs do NOT appear in the right table.
    
    Maps to pw.Table.difference().
    """
    category: str = Field(default="Table")
    node_id: str = Field(default="difference")

class UpdateRowsNode(Node):
    """Updates rows of left table with rows from right table (matched by ID).
    
    Maps to pw.Table.update_rows().
    """
    category: str = Field(default="Table")
    node_id: str = Field(default="update_rows")


class UpdateCellsNode(Node):
    """Updates cells of left table with values from right table (matched by ID).
    
    Maps to pw.Table.update_cells().
    """
    category: str = Field(default="Table")
    node_id: str = Field(default="update_cells")


class RestrictNode(JoinNode):
    """Restrict node configuration. Restricts left table universe to keys appearing in right table."""
    category: str = Field(default="Table")
    node_id: str = Field(default="restrict")
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")