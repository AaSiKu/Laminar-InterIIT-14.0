import typer
import pandas as pd
import pathway as pw
from typing import Any, Dict, List
from pydantic import BaseModel
import json
import sys
from pathlib import Path

sys.path.insert(0, "./backend")

from backend.lib.utils import node_map
from backend.pipeline.mappings import mappings

app = typer.Typer()


def build_json_value(field_name: str, parent_path: str = "") -> Any:
    """Interactively build a JSON value with type selection."""
    full_path = f"{parent_path}.{field_name}" if parent_path else field_name
    
    # Ask for the type
    typer.echo(f"\nSelect type for '{full_path}':")
    typer.echo("  1. String")
    typer.echo("  2. Integer")
    typer.echo("  3. Float/Number")
    typer.echo("  4. Boolean")
    typer.echo("  5. List/Array")
    typer.echo("  6. Object/Dictionary")
    typer.echo("  7. Null/None")
    
    choice = typer.prompt("Enter choice (1-7)", type=int, default=1)
    
    # Handle based on type
    if choice == 1:  # str
        return typer.prompt(f"Enter string value for '{full_path}'", default="")
    
    elif choice == 2:  # int
        return typer.prompt(f"Enter integer value for '{full_path}'", type=int, default=0)
    
    elif choice == 3:  # float
        return typer.prompt(f"Enter float value for '{full_path}'", type=float, default=0.0)
    
    elif choice == 4:  # bool
        return typer.confirm(f"Enter boolean value for '{full_path}'", default=False)
    
    elif choice == 7:  # null
        return None
    
    elif choice == 5:  # list
        items = []
        typer.echo(f"\nBuilding list for '{full_path}':")
        while True:
            add_item = typer.confirm(
                f"Add item to list '{full_path}'? (currently {len(items)} items)",
                default=(len(items) == 0)
            )
            if not add_item:
                break
            item = build_json_value(f"[{len(items)}]", full_path)
            items.append(item)
        return items
    
    elif choice == 6:  # dict
        obj = {}
        typer.echo(f"\nBuilding object for '{full_path}':")
        while True:
            add_key = typer.confirm(
                f"Add key to object '{full_path}'? (currently {len(obj)} keys)",
                default=(len(obj) == 0)
            )
            if not add_key:
                break
            key = typer.prompt(f"Enter key name for '{full_path}'")
            if not key:
                continue
            if key in obj:
                overwrite = typer.confirm(f"Key '{key}' already exists. Overwrite?", default=False)
                if not overwrite:
                    continue
            obj[key] = build_json_value(key, full_path)
        return obj
    
    return None


def get_pydantic_input(model: type[BaseModel]) -> Dict[str, Any]:
    """Build a JSON object interactively for the Pydantic model."""
    typer.echo(f"\n=== Building configuration for {model.__name__} ===\n")
    typer.echo("You'll be asked to build a JSON object field by field.\n")
    
    # Show model fields
    typer.echo("Available fields:")
    for field_name, field_info in model.model_fields.items():
        required = "required" if field_info.is_required() else "optional"
        typer.echo(f"  - {field_name} ({field_info.annotation}) [{required}]")
    
    typer.echo("\nStarting interactive JSON builder...\n")
    
    data = {}
    for field_name, field_info in model.model_fields.items():
        is_optional = not field_info.is_required()
        
        if is_optional:
            include = typer.confirm(f"Include optional field '{field_name}'?", default=False)
            if not include:
                continue
        
        typer.echo(f"\nConfiguring field: {field_name}")
        data[field_name] = build_json_value(field_name)
    
    # Show final JSON
    typer.echo("\n=== Final Configuration ===")
    typer.echo(json.dumps(data, indent=2))
    
    # Validate with Pydantic
    confirm = typer.confirm("Accept this configuration?", default=True)
    
    if not confirm:
        retry = typer.confirm("Retry configuration?", default=True)
        if retry:
            return get_pydantic_input(model)
        else:
            raise typer.Exit(code=0)
    
    # Validate
    try:
        validated = model(**data)
        return validated.model_dump()
    except Exception as e:
        typer.echo(f"\nValidation error: {e}", err=True)
        retry = typer.confirm("Retry configuration?", default=True)
        if retry:
            return get_pydantic_input(model)
        else:
            raise


def create_test_dataframe(num_rows: int, table_index: int = 0) -> pd.DataFrame:
    """Create a test pandas DataFrame with various column types."""
    import time
    base_timestamp = int(time.time()) - (num_rows * 3600)
    
    # Add table index suffix to column names
    suffix = f"_{table_index}" if table_index > 0 else ""
    
    df = pd.DataFrame({
        f'name{suffix}': [f'User_{i}' for i in range(1, num_rows + 1)],
        f'score{suffix}': [95.5 + (i % 20) * 0.5 for i in range(num_rows)],
        f'active{suffix}': [i % 2 == 0 for i in range(num_rows)],
        f'created_at{suffix}': pd.to_datetime([f'2024-01-{(i % 28) + 1:02d}' for i in range(num_rows)]),
        f'timestamp_int{suffix}': [base_timestamp + (i * 3600) for i in range(num_rows)],
        f'timestamp_float{suffix}': [float(base_timestamp) + (i * 3600.5) for i in range(num_rows)],
        f'datetime_string{suffix}': [f'2024-01-{(i % 28) + 1:02d} {(i % 24):02d}:{(i % 60):02d}:00' for i in range(num_rows)],
        f'tags{suffix}': [['python', 'ai'] if i % 3 == 0 else ['data'] if i % 3 == 1 else ['ml', 'analytics'] for i in range(num_rows)],
        f'metadata{suffix}': [{'key': f'value{i}', 'index': i} for i in range(num_rows)],
    })
    
    return df



@app.command()
def test_mapping(node_id: str):
    """
    Test a mapping by creating a table and running the node transformation.
    
    Args:
        node_id: The ID of the node to test
    """
    typer.echo(f"Testing mapping for node: {node_id}")
    
    # Get node schema from node_map
    if node_id not in node_map:
        typer.echo(f"Error: Node ID '{node_id}' not found in node_map", err=True)
        typer.echo(f"Available nodes: {', '.join(node_map.keys())}")
        raise typer.Exit(code=1)
    
    node_class = node_map[node_id]
    typer.echo(f"Found node class: {node_class.__name__}\n")
    
    # Detect number of input tables from node class
    num_tables = getattr(node_class.model_fields.get('n_inputs'), 'default', 1)
    if num_tables is None:
        num_tables = 1
    
    typer.echo(f"Node expects {num_tables} input table(s)\n")
    
    # Create multiple test DataFrames
    dataframes = []
    input_tables = []
    
    for i in range(num_tables):
        if num_tables > 1:
            typer.echo(f"\n--- Table {i + 1} of {num_tables} ---")
        num_rows = typer.prompt(f"How many rows for table {i + 1}?" if num_tables > 1 else "How many rows to generate?", type=int, default=10)
        
        if num_rows <= 0:
            typer.echo("Number of rows must be positive", err=True)
            raise typer.Exit(code=1)
        
        typer.echo(f"Creating test DataFrame {i + 1} with {num_rows} rows...")
        df = create_test_dataframe(num_rows, table_index=i)
        dataframes.append(df)
        
        typer.echo(f"\nTest DataFrame {i + 1}:\n{df.head().to_string()}\n")
    
    # Collect node parameters
    try:
        # Ask if user has JSON ready
        has_json = typer.confirm("Do you have JSON configuration ready to paste?", default=False)
        
        if has_json:
            typer.echo("\nPaste your JSON configuration (press Ctrl+D or Ctrl+Z when done):")
            json_lines = []
            try:
                while True:
                    line = input()
                    json_lines.append(line)
            except EOFError:
                pass
            
            json_str = '\n'.join(json_lines)
            try:
                node_data = json.loads(json_str)
                typer.echo("\nJSON parsed successfully!")
                typer.echo(json.dumps(node_data, indent=2))
                
                # Validate with Pydantic
                validated = node_class(**node_data)
                node_data = validated.model_dump()
            except json.JSONDecodeError as e:
                typer.echo(f"\nInvalid JSON: {e}", err=True)
                raise typer.Exit(code=1)
            except Exception as e:
                typer.echo(f"\nValidation error: {e}", err=True)
                raise typer.Exit(code=1)
        else:
            node_data = get_pydantic_input(node_class)
        
        typer.echo("\nConfiguration complete!")
        
        # Create Pathway tables
        typer.echo("\nConverting to Pathway tables...")
        for i, df in enumerate(dataframes):
            pw_table = pw.debug.table_from_pandas(df)
            input_tables.append(pw_table)
            typer.echo(f"Table {i + 1} schema: {pw_table.schema}")
        
        # Instantiate the node
        typer.echo(f"\nCreating {node_class.__name__} instance...")
        node_instance = node_class(**node_data)
        typer.echo(f"Node created: {node_instance}")
        
        # Run the mapping
        typer.echo("\nRunning mapping transformation...")
        
        output_table = mappings[node_id]["node_fn"](input_tables, node_instance)
        
        typer.echo(f"Output table schema: {output_table.schema}")
        
        # Compute and display results
        typer.echo("\nComputing results...")
        result_df = pw.debug.table_to_pandas(output_table)
        
        typer.echo(f"\nMapping completed successfully!")
        total_input_rows = sum(len(df) for df in dataframes)
        typer.echo(f"Total input rows: {total_input_rows}, Output rows: {len(result_df)}")
        typer.echo(f"\nOutput DataFrame:\n{result_df.head()}")
        
        # Ask to save results
        save_results = typer.confirm("Save results to CSV?", default=False)
        
        if save_results:
            import time
            output_path = typer.prompt(
                "Enter output path",
                default=f"output_{node_id}_{int(time.time())}.csv"
            )
            result_df.to_csv(output_path, index=False)
            typer.echo(f"Results saved to: {output_path}")
        
    except KeyboardInterrupt:
        typer.echo("\n\nOperation cancelled by user")
        raise typer.Exit(code=0)
    except Exception as e:
        typer.echo(f"\nError during mapping: {e}", err=True)
        import traceback
        typer.echo(f"\n{traceback.format_exc()}")
        raise typer.Exit(code=1)


@app.command()
def list_nodes():
    """List all available node IDs from node_map."""
    typer.echo("Available nodes:")
    for node_id, node_class in node_map.items():
        typer.echo(f"  - {node_id}: {node_class.__name__}")


if __name__ == "__main__":
    app()