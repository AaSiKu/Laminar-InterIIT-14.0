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


def create_test_dataframe(num_rows: int) -> pd.DataFrame:
    """Create a test pandas DataFrame with various column types."""
    import time
    base_timestamp = int(time.time()) - (num_rows * 3600)
    
    df = pd.DataFrame({
        'name': [f'User_{i}' for i in range(1, num_rows + 1)],
        'score': [95.5 + (i % 20) * 0.5 for i in range(num_rows)],
        'active': [i % 2 == 0 for i in range(num_rows)],
        'created_at': pd.to_datetime([f'2024-01-{(i % 28) + 1:02d}' for i in range(num_rows)]),
        'timestamp_int': [base_timestamp + (i * 3600) for i in range(num_rows)],
        'timestamp_float': [float(base_timestamp) + (i * 3600.5) for i in range(num_rows)],
        'datetime_string': [f'2024-01-{(i % 28) + 1:02d} {(i % 24):02d}:{(i % 60):02d}:00' for i in range(num_rows)],
        'tags': [['python', 'ai'] if i % 3 == 0 else ['data'] if i % 3 == 1 else ['ml', 'analytics'] for i in range(num_rows)],
        'metadata': [{'key': f'value{i}', 'index': i} for i in range(num_rows)],
    })
    
    return df


@app.command()
def create_table(node_id: str):
    """
    Create a Pathway table from pandas with dynamic schema based on node_id.
    
    Args:
        node_id: The ID of the node to create a table for
    """
    typer.echo(f"Creating table for node: {node_id}")
    
    # Get node schema from node_map
    if node_id not in node_map:
        typer.echo(f"Error: Node ID '{node_id}' not found in node_map", err=True)
        typer.echo(f"Available nodes: {', '.join(node_map.keys())}")
        raise typer.Exit(code=1)
    
    node_class = node_map[node_id]
    typer.echo(f"Found node class: {node_class.__name__}\n")
    
    # Ask for number of rows
    num_rows = typer.prompt("How many rows to generate?", type=int, default=100)
    
    if num_rows <= 0:
        typer.echo("Number of rows must be positive", err=True)
        raise typer.Exit(code=1)
    
    # Create DataFrame
    typer.echo(f"Creating pandas DataFrame with {num_rows} rows of sample data...")
    df = create_test_dataframe(num_rows)
    
    typer.echo("\nSample DataFrame created:")
    typer.echo(f"Shape: {df.shape}")
    typer.echo(f"\nFirst 5 rows:\n{df.head().to_string()}")
    typer.echo(f"\nLast 5 rows:\n{df.tail().to_string()}")
    typer.echo(f"\nColumn types:\n{df.dtypes}")
    
    # Now collect actual node parameters
    typer.echo(f"\n\nNow, let's configure the actual {node_class.__name__} parameters:\n")
    
    try:
        node_data = get_pydantic_input(node_class)
        typer.echo("\nConfiguration complete!")
        
        # Create Pathway table from pandas
        typer.echo("\nConverting pandas DataFrame to Pathway table...")
        pw_table = pw.debug.table_from_pandas(df)
        
        typer.echo("Pathway table created successfully!")
        typer.echo(f"Table schema: {pw_table.schema}")
        
        # Create node instance
        node_instance = node_class(**node_data)
        typer.echo(f"Node instance created: {node_instance}")
        
    except KeyboardInterrupt:
        typer.echo("\n\nOperation cancelled by user")
        raise typer.Exit(code=0)
    except Exception as e:
        typer.echo(f"\nError: {e}", err=True)
        raise typer.Exit(code=1)


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
    
    # Ask for number of rows
    num_rows = typer.prompt("How many rows to generate?", type=int, default=10)
    
    if num_rows <= 0:
        typer.echo("Number of rows must be positive", err=True)
        raise typer.Exit(code=1)
    
    # Create test DataFrame
    typer.echo(f"Creating test DataFrame with {num_rows} rows...")
    df = create_test_dataframe(num_rows)
    
    typer.echo(f"\nTest DataFrame:\n{df.head().to_string()}\n")
    
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
        
        # Create Pathway table
        typer.echo("\nConverting to Pathway table...")
        input_table = pw.debug.table_from_pandas(df)
        typer.echo(f"Input table schema: {input_table.schema}")
        
        # Instantiate the node
        typer.echo(f"\nCreating {node_class.__name__} instance...")
        node_instance = node_class(**node_data)
        typer.echo(f"Node created: {node_instance}")
        
        # Run the mapping
        typer.echo("\nRunning mapping transformation...")
        
        output_table = mappings[node_id]["node_fn"]([input_table],node_instance)
        
        typer.echo(f"Output table schema: {output_table.schema}")
        
        # Compute and display results
        typer.echo("\nComputing results...")
        result_df = pw.debug.table_to_pandas(output_table)
        
        typer.echo(f"\nMapping completed successfully!")
        typer.echo(f"Input rows: {len(df)}, Output rows: {len(result_df)}")
        typer.echo(f"\nOutput DataFrame:\n{result_df.to_string()}")
        
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
