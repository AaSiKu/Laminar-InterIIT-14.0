from typing import List, Dict, Any
import pathway as pw
from lib.tables import JoinNode, FilterNode
from lib.tables.transforms import GroupByNode, SelectNode, RenameNode, WithoutNode
from .helpers import MappingValues, get_col, get_this_col, select_for_join
from .open_tel.prefix import open_tel_trace_id

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
    _reducers = [(red["col"], red["reducer"], red["new_col"]) for red in node.reducers if red["col"].find(open_tel_trace_id) == -1]
    reducers = {
            new_col: getattr(pw.reducers, reducer)(get_this_col(prev_col)) for prev_col, reducer, new_col in _reducers
    }
    for col in table.column_names():
        if col.find(open_tel_trace_id) != -1:
            reducers[f"grouped_{col}"] = pw.reducers.ndarray(get_this_col(col))

    return table.groupby(*group_cols).reduce(*group_cols, **reducers)

transform_mappings: dict[str, MappingValues] = {
    "filter": {
        "node_fn": filter,
        "stringify": lambda node, inputs: f"Filters input {inputs[0]} where '{' and '.join([f"{filter.col} {filter.op} {filter.value}" for filter in node.filters])}'",
    },

    "join": {
        "node_fn": join,
        "stringify": lambda node, inputs: f"{node.how.upper()} Joins input {inputs[0]} with {inputs[1]} on {' AND '.join([f'{left}=={right}' for left, right in node.on])}",
    },
    "asof_now_join": {
        "node_fn": asof_now_join,
        "stringify": lambda node,inputs : f"{node.how.upper()} ASOF Now Joins input {inputs[0]} with {inputs[1]} on {' AND '.join([f'{left}=={right}' for left, right in node.on])}",
    },
    "group_by": {
        "node_fn": group_by,
        "stringify": lambda node, inputs: f"Groups input {inputs[0]} by {', '.join(node.columns)} and reduces with {', '.join([f"{reducer.new_col} = {reducer.reducer}({reducer.col})" for reducer in node.reducers])}",
    },
    "select": {
        "node_fn": lambda inputs, node: inputs[0].select(*[get_this_col(col) for col in node.columns]),
        "stringify": lambda node, inputs: f"Selects columns {', '.join(node.columns)} from input {inputs[0]}",
    },
    "without": {
        "node_fn": lambda inputs, node: inputs[0].without(*[get_this_col(col) for col in node.columns]),
        "stringify": lambda node, inputs: f"Returns a table without columns {', '.join(node.columns)} from input {inputs[0]}",
    },
}
