import sys
import os
import pandas as pd
import pathway as pw
import numpy as np

# Add root and backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from backend.pipeline.mappings.transforms import arithmetic, comparison, boolean
from backend.lib.tables.transforms import ArithmeticNode, ComparisonNode, BooleanNode

def create_test_table():
    df = pd.DataFrame({
        "a": [10, 20, 30, 40],
        "b": [2, 5, 3, 4],
        "bool_a": [True, False, True, False],
        "bool_b": [True, True, False, False]
    })
    return pw.debug.table_from_pandas(df), df

def test_arithmetic():
    print("Testing Arithmetic Operations...")
    table, df = create_test_table()
    
    ops = [
        ("+", lambda a, b: a + b),
        ("-", lambda a, b: a - b),
        ("*", lambda a, b: a * b),
        ("/", lambda a, b: a / b),
        ("//", lambda a, b: a // b),
        ("%", lambda a, b: a % b),
        ("**", lambda a, b: a ** b),
    ]

    for op_symbol, op_func in ops:
        print(f"  Testing operator: {op_symbol}")
        node = ArithmeticNode(
            category="table",
            node_id="arithmetic",
            col_a="a",
            col_b="b",
            operator=op_symbol,
            new_col="result"
        )
        
        result_table = arithmetic([table], node)
        result_df = pw.debug.table_to_pandas(result_table).sort_values("a").reset_index(drop=True)
        
        expected = op_func(df["a"], df["b"])
        
        # Check if result column matches expected
        # Using numpy isclose for float comparisons if needed, but direct comparison for integers usually works
        # For division, we might get floats
        if op_symbol == "/":
             assert np.allclose(result_df["result"], expected), f"Failed for {op_symbol}"
        else:
             assert result_df["result"].equals(expected), f"Failed for {op_symbol}\nGot:\n{result_df['result']}\nExpected:\n{expected}"
        
    print("Arithmetic tests passed!")

def test_comparison():
    print("Testing Comparison Operations...")
    table, df = create_test_table()
    
    ops = [
        ("==", lambda a, b: a == b),
        ("!=", lambda a, b: a != b),
        (">", lambda a, b: a > b),
        ("<", lambda a, b: a < b),
        (">=", lambda a, b: a >= b),
        ("<=", lambda a, b: a <= b),
    ]

    for op_symbol, op_func in ops:
        print(f"  Testing operator: {op_symbol}")
        node = ComparisonNode(
            category="table",
            node_id="comparison",
            col_a="a",
            col_b="b",
            operator=op_symbol,
            new_col="result"
        )
        
        result_table = comparison([table], node)
        result_df = pw.debug.table_to_pandas(result_table).sort_values("a").reset_index(drop=True)
        
        expected = op_func(df["a"], df["b"])
        
        assert result_df["result"].equals(expected), f"Failed for {op_symbol}\nGot:\n{result_df['result']}\nExpected:\n{expected}"
        
    print("Comparison tests passed!")

def test_boolean():
    print("Testing Boolean Operations...")
    table, df = create_test_table()
    
    ops = [
        ("&", lambda a, b: a & b),
        ("|", lambda a, b: a | b),
        ("^", lambda a, b: a ^ b),
    ]

    for op_symbol, op_func in ops:
        print(f"  Testing operator: {op_symbol}")
        node = BooleanNode(
            category="table",
            node_id="boolean",
            col_a="bool_a",
            col_b="bool_b",
            operator=op_symbol,
            new_col="result"
        )
        
        result_table = boolean([table], node)
        result_df = pw.debug.table_to_pandas(result_table).sort_values("a").reset_index(drop=True)
        
        expected = op_func(df["bool_a"], df["bool_b"])
        
        assert result_df["result"].equals(expected), f"Failed for {op_symbol}\nGot:\n{result_df['result']}\nExpected:\n{expected}"

    # Test NOT operator (unary)
    print("  Testing operator: ~")
    node = BooleanNode(
        category="table",
        node_id="boolean",
        col_a="bool_a",
        operator="~",
        new_col="result"
    )
    
    result_table = boolean([table], node)
    result_df = pw.debug.table_to_pandas(result_table).sort_values("a").reset_index(drop=True)
    
    expected = ~df["bool_a"]
    assert result_df["result"].equals(expected), f"Failed for ~\nGot:\n{result_df['result']}\nExpected:\n{expected}"

    print("Boolean tests passed!")

if __name__ == "__main__":
    test_arithmetic()
    test_comparison()
    test_boolean()
