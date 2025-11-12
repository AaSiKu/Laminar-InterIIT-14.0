# Mapping Test Tool

A CLI tool for testing Pathway node mappings with interactive configuration and data generation.

## Features

- Interactive JSON configuration builder
- Generate test DataFrames with various data types
- Test node transformations with sample data
- Validate Pydantic models interactively
- Export results to CSV

## Installation

```bash
pip install typer pandas pathway pydantic
```

## Usage

### List Available Nodes

```bash
python -m tests.mappings list-nodes
```

Shows all available node IDs and their corresponding classes.

### Test a Mapping

```bash
python -m tests.mappings test-mapping <node_id>
```

Interactive workflow:
1. Enter number of rows to generate (default: 10)
2. Choose configuration method:
   - Paste JSON configuration directly, or
   - Use interactive builder (step-by-step)
3. View input data and transformation results
4. Optionally save results to CSV

**Example:**

```bash
python -m tests.mappings test-mapping filter_node
```

### Create a Table

```bash
python -m tests.mappings create-table <node_id>
```

Creates a Pathway table from pandas DataFrame with sample data.

## Interactive JSON Builder

When using the interactive builder, you'll be prompted to build JSON objects field by field:

### Supported Types

1. **String** - Text values
2. **Integer** - Whole numbers
3. **Float/Number** - Decimal numbers
4. **Boolean** - True/False values
5. **List/Array** - Collections of items
6. **Object/Dictionary** - Nested JSON objects
7. **Null/None** - Empty values

### Building Complex Structures

**Lists:**
- Add items one by one
- Each item can be any supported type
- Confirm when done adding items

**Objects:**
- Add key-value pairs interactively
- Each value can be any supported type
- Supports nested objects
- Prevents duplicate keys (with overwrite option)

## Sample Data Structure

The test DataFrame includes:

- `name`: String values (User_1, User_2, ...)
- `score`: Float values (95.5 - 105.0)
- `active`: Boolean values (alternating)
- `created_at`: Datetime objects
- `timestamp_int`: Integer timestamps
- `timestamp_float`: Float timestamps
- `datetime_string`: ISO formatted datetime strings
- `tags`: List of strings
- `metadata`: Dictionary objects

## JSON Configuration Methods

### Method 1: Paste JSON

```bash
python -m tests.mappings test-mapping my_node
# When prompted: "Do you have JSON configuration ready to paste?" -> Yes
# Paste your JSON, then press Ctrl+D (Unix) or Ctrl+Z (Windows)
```

Example JSON:
```json
{
  "field1": "value1",
  "field2": 42,
  "nested": {
    "key": "value"
  }
}
```

### Method 2: Interactive Builder

```bash
python -m tests.mappings test-mapping my_node
# When prompted: "Do you have JSON configuration ready to paste?" -> No
# Follow the interactive prompts for each field
```

## Output

The tool provides:
- Input DataFrame preview (first and last 5 rows)
- Column types and schema information
- Transformation results
- Row count comparison (input vs output)
- Option to export results as CSV

## Error Handling

- **Invalid node ID**: Shows list of available nodes
- **JSON parsing errors**: Detailed error messages with retry option
- **Pydantic validation errors**: Shows validation issues with retry option
- **Keyboard interrupt**: Graceful exit with Ctrl+C

## Tips

- Use `--help` on any command for detailed information
- Start with fewer rows (e.g., 10) for testing
- Review the sample data structure before configuration
- Save important results to CSV for later analysis
- Use JSON paste method for repeated testing with same config

## Examples

### Testing a Filter Node

```bash
python -m tests.mappings test-mapping filter_node
# Enter number of rows: 10
# Configure filter conditions interactively
# View filtered results
```

### Testing a Transform Node

```bash
python -m tests.mappings test-mapping transform_node
# Enter number of rows: 50
# Paste pre-configured JSON
# Export results to CSV
```

## Troubleshooting

**Import errors:**
- Ensure `backend` directory is accessible
- Check `sys.path` includes project root

**Schema mismatches:**
- Verify node_id exists in node_map
- Check Pydantic model field definitions

**Data type issues:**
- Review generated DataFrame column types
- Ensure mapping handles all input types correctly
```
