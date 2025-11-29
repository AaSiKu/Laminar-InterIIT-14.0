from typing import Callable, Any, List, Optional, Dict
from typing_extensions import TypedDict
import pathway as pw
from lib.io_nodes import PairOfStrings, ColumnType

class MappingValues(TypedDict):
    node_fn: Callable[[list[pw.Table], Any], pw.Table]

# Helper functions
get_col = lambda table, col_name: getattr(table, col_name)
get_this_col = lambda col_name: getattr(pw.this, col_name)

def apply_datetime_conversions(table: pw.Table, datetime_columns: Optional[List[PairOfStrings]]) -> pw.Table:
    """
    Apply datetime conversions to specified columns in a table.

    Args:
        table: The input table
        datetime_columns: List of pair of strings (column_name, format_string) for datetime conversion

    Returns:
        Table with datetime columns converted
    """
    if not datetime_columns:
        return table

    conversions = {}
    for columns in datetime_columns:
        if len(columns) != 2:
            raise ValueError(f"Invalid key, value side, datetime_column is of size {len(columns)}")
        [col_name, fmt] = columns
        if not hasattr(table, col_name):
            raise ValueError(f"Column '{col_name}' not found in table")

        col = get_col(table, col_name)

        # Handle Unix timestamp formats
        if fmt == "unix_seconds":
            conversions[col_name] = col.dt.from_timestamp(unit="s")
        elif fmt == "unix_milliseconds":
            conversions[col_name] = col.dt.from_timestamp(unit="ms")
        elif fmt == "unix_microseconds":
            conversions[col_name] = col.dt.from_timestamp(unit="us")
        else:
            # Handle strptime format strings
            conversions[col_name] = col.dt.strptime(fmt=fmt)

    return table.with_columns(**conversions)

def select_for_join(left: pw.Table, right: pw.Table, without1: List[str], without2: List[str], other_columns: List):
    """Helper function to select columns for join operations."""
    columns_1 = [get_col(left, col_name) for col_name in left.column_names() if col_name not in without1]
    columns_2 = [get_col(right, col_name) for col_name in right.column_names() if col_name not in without2]
    return columns_1 + columns_2 + other_columns


def parse_table_schema(schema: List[ColumnType]) -> Dict[str, str]:
    final_table_schema = {}
    for column in schema:
        final_table_schema[column.key] = column.value
    return final_table_schema