import pathway as pw
from typing import Any, List, Optional, Tuple, Union
from pydantic import BaseModel, Field


class Node(BaseModel):
    """Base node for pathway table operations.

    Attributes:
        category: logical category (e.g. 'io', 'transform', 'join')
        node_id: node id (string) used to identify the node type
    """
    category: str
    node_id: str


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


class ConcatNode(JoinNode):
    """Concat node configuration. Concatenates two tables (requires disjoint ids)."""
    category: str = Field(default="Table")
    node_id: str = Field(default="concat")
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")


class ConcatReindexNode(JoinNode):
    """Concat with reindex node configuration. Concatenates and reindexes all rows."""
    category: str = Field(default="Table")
    node_id: str = Field(default="concat_reindex")
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")


class IntersectNode(JoinNode):
    """Intersect node configuration. Restricts left table to keys appearing in right table."""
    category: str = Field(default="Table")
    node_id: str = Field(default="intersect")
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")


class DifferenceNode(JoinNode):
    """Difference node configuration. Restricts left table to keys NOT appearing in right table."""
    category: str = Field(default="Table")
    node_id: str = Field(default="difference")
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")


class UpdateRowsNode(JoinNode):
    """Update rows node configuration. Updates rows of left table with rows from right table."""
    category: str = Field(default="Table")
    node_id: str = Field(default="update_rows")
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")


class UpdateCellsNode(JoinNode):
    """Update cells node configuration. Updates cells of left table with values from right table."""
    category: str = Field(default="Table")
    node_id: str = Field(default="update_cells")
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")


class RestrictNode(JoinNode):
    """Restrict node configuration. Restricts left table universe to keys appearing in right table."""
    category: str = Field(default="Table")
    node_id: str = Field(default="restrict")
    on: List[Union[Tuple[str, str], Any]] = Field(default_factory=list)
    how: Union[str, pw.JoinMode] = Field(default="inner")