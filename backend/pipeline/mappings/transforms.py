from typing import List, Dict, Any
import pathway as pw
from lib.tables import JoinNode, ConcatNode
from .helpers import MappingValues, get_col, get_this_col, select_for_join

# Operator mapping for filter node
_op_map = {
    ">": "__gt__",
    "<": "__lt__",
    "==": "__eq__",
    "!=": "__ne__",
    ">=": "__ge__",
    "<=": "__le__",
}

# BUG: Cannot handle the case where the two tables each have one or more columns with the same name
# POSSIBLE FIX: When this error arises, ask the user to rename one of the conflicting columns
def _join(inputs: List[pw.Table], node: JoinNode) -> Dict[str, Any]:
    left, right = inputs
    expression = []
    for col1, col2 in node.on:
        col1 = get_col(left, col1)
        col2 = get_col(right, col2)
        expression.append(col1 == col2)
    how_map = {key: getattr(pw.JoinMode, key.upper()) for key in ["left", "right", "inner", "outer"]}
    
    without1 = [col1 for col1, _ in node.on]
    without2 = [col2 for _, col2 in node.on]

    other_columns = []

    for col1, col2 in node.on:
        if col1 == col2:
            other_columns.append(get_col(left, col1))
        else:
            other_columns.append(get_col(left, col1))
            other_columns.append(get_col(right, col2))
    
    return {
        'how_map': how_map,
        "expression": expression,
        "without1": without1,
        "without2": without2,
        "other_columns": other_columns
    }

def asof_now_join(inputs: List[pw.Table], node):
    params = _join(inputs, node)
    left, right = inputs
    join_id = (left.id if node.join_id == "self" else right.id) if hasattr(node, "join_id") else None
    return left.asof_now_join(
        right,
        *params["expression"],
        how=params["how_map"][node.how],
        id=join_id
    ).select(
        *select_for_join(
            left,
            right,
            params["without1"],
            params["without2"],
            params["other_columns"]
        )
    )

def join(inputs: List[pw.Table], node: JoinNode):
    params = _join(inputs, node)
    left, right = inputs
    return left.join(
        right,
        *params["expression"],
        how=params["how_map"][node.how],
    ).select(
        *select_for_join(
            left,
            right,
            params["without1"],
            params["without2"],
            params["other_columns"]
        )
    )

transform_mappings: dict[str, MappingValues] = {
    "filter": {
        "node_fn": lambda inputs, node: inputs[0].filter(
            getattr(get_this_col(node.col), _op_map.get(node.op))(node.value)
        ),
    },
    "sort": {
        "node_fn": lambda inputs, node: inputs[0].sort(key=get_this_col(node.col)),
    },
    "concat": {
        "node_fn": lambda inputs, node: inputs[0].concat(inputs[1]),
    },
    "join": {
        "node_fn": join,
    },
    "asof_now_join": {
        "node_fn": asof_now_join,
    },
}
