from typing import List, Dict, Any
import pathway as pw
from lib.tables import JoinNode, FilterNode
from lib.tables.transforms import GroupByNode, SelectNode, RenameNode, WithoutNode
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

def _join(inputs: List[pw.Table], node: JoinNode) -> Dict[str, Any]:
    left, right = inputs
    expression = []
    same_joined = []
    for col1, col2 in node.on:
        if col1 == col2:
            same_joined.append(col1)
        col1 = get_col(left, col1)
        col2 = get_col(right, col2)
        expression.append(col1 == col2)
    how_map = {key: getattr(pw.JoinMode, key.upper()) for key in ["left", "right", "inner", "outer"]}

    return {
        'how_map': how_map,
        "expression": expression,
        "same_joined_on":  same_joined
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
        **select_for_join(
            left,
            right,
            params["same_joined_on"],
            node.how
        ),
    )

def join(inputs: List[pw.Table], node: JoinNode):
    params = _join(inputs, node)
    left, right = inputs
    return left.join(
        right,
        *params["expression"],
        how=params["how_map"][node.how],
    ).select(
        **select_for_join(
            left,
            right,
            params["same_joined_on"],
            node.how
        ),
    )

def filter(inputs: List[pw.Table], node: FilterNode):
    args = True
    for filter in node.filters:
        col_name = filter["col"]
        op = filter["op"]
        value = filter["value"]
        col = get_this_col(col_name)
        if op in _op_map:
            args &= getattr(col, _op_map.get(op))(value)
        elif op == "contains":
            args &= col.str.find(value) != -1
        else:
            args &= getattr(col.str, op)(value)

    return inputs[0].filter(
        args
    )

def group_by(inputs: List[pw.Table], node: GroupByNode):
    table = inputs[0]
    
    # Build the groupby columns
    group_cols = [get_col(table, col) for col in node.columns]
    _reducers = [(red["col"], red["reducer"], red["new_col"]) for red in node.reducers]
    reducers = {
            new_col: getattr(pw.reducers, reducer)(get_this_col(prev_col)) for prev_col, reducer, new_col in _reducers
    }
    return table.groupby(*group_cols).reduce(*group_cols, **reducers)

transform_mappings: dict[str, MappingValues] = {
    "filter": {
        "node_fn": filter
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
    "group_by": {
        "node_fn": group_by,
    },
    "select": {
        "node_fn": lambda inputs, node: inputs[0].select(*[get_this_col(col) for col in node.columns]),
    },
    "rename": {
        "node_fn": lambda inputs, node: inputs[0].rename_by_dict({old: new for old, new in node.mapping}),
    },
    "without": {
        "node_fn": lambda inputs, node: inputs[0].without(*[get_this_col(col) for col in node.columns]),
    },
}
