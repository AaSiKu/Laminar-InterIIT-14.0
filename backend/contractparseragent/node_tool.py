from langchain_core.tools import tool
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import inspect
import sys
from pathlib import Path

from lib.utils import get_node_class_map

def _get_node_type(node_id: str) -> str:
    """Get the node type based on node_id."""
    input_node_ids = {
        "kafka", "redpanda", "csv", "jsonlines", "airbyte", "debezium", "s3", "minio", 
        "deltalake", "iceberg", "plaintext", "http", "mongodb", "postgres", "sqlite", 
        "gdrive", "kinesis", "nats", "mqtt", "python", "open_tel_spans_input", 
        "open_tel_metrics_input", "open_tel_logs_input"
    }
    
    output_node_ids = {
        "kafka_write", "redpanda_write", "csv_write", "jsonlines_write", "postgres_write", 
        "mysql_write", "mongodb_write", "bigquery_write", "elasticsearch_write", 
        "dynamodb_write", "pubsub_write", "kinesis_write", "nats_write", "mqtt_write", 
        "logstash_write", "questdb_write"
    }
    
    if node_id in input_node_ids:
        return "input"
    elif node_id in output_node_ids:
        return "output"
    elif node_id in {"filter", "group_by", "json_select", "flatten"}:
        return "transform"
    elif node_id in {"join", "asof_now_join"}:
        return "join"
    elif node_id in {"asof_join", "interval_join", "window_join"}:
        return "temporal_join"
    elif node_id == "window_by":
        return "window"
    elif node_id in {"alert", "rag_node", "trigger_rca"}:
        return "agent"
    else:
        return "unknown"

# Mapping of all available nodes
NODE_CLASSES = get_node_class_map()


def _format_parameter_concise(field_name: str, field_info: Dict[str, Any], is_required: bool) -> str:
    """
    Format a parameter into a concise single-line description.
    
    Returns format: "type - description (default: X)" or "enum[A,B,C] - description"
    """
    parts = []
    
    # Handle type
    if "const" in field_info:
        parts.append(f"const[{field_info['const']}]")
    elif "enum" in field_info:
        enum_vals = field_info["enum"][:5]  # Limit to first 5 values
        enum_str = ",".join(str(v) for v in enum_vals)
        if len(field_info["enum"]) > 5:
            enum_str += ",..."
        parts.append(f"enum[{enum_str}]")
    elif "anyOf" in field_info:
        # Union types - extract simple type names
        types = []
        for t in field_info["anyOf"]:
            if "type" in t:
                types.append(t["type"])
        parts.append("|".join(types) if types else "union")
    elif field_info.get("type") == "array":
        item_type = field_info.get("items", {})
        if "type" in item_type:
            parts.append(f"list[{item_type['type']}]")
        elif "$ref" in item_type:
            ref_name = item_type["$ref"].split("/")[-1]
            parts.append(f"list[{ref_name}]")
        else:
            parts.append("list")
    elif "$ref" in field_info:
        ref_name = field_info["$ref"].split("/")[-1]
        parts.append(ref_name)
    else:
        parts.append(field_info.get("type", "any"))
    
    # Add description if exists
    desc = field_info.get("description", "").strip()
    if desc:
        parts.append(desc)
    
    # Add default value
    if "default" in field_info and field_info["default"] is not None:
        parts.append(f"(default: {field_info['default']})")
    
    return " - ".join(parts) if len(parts) > 1 else parts[0]


def get_node_parameters(node_name: str) -> Dict[str, Any]:
    """
    Get the parameters for a specific node type (detailed version).
    
    Args:
        node_name: The node_id of the node (e.g., 'kafka', 'http', 'csv_write')
    
    Returns:
        Dictionary containing node information including parameters, required fields, etc.
    """
    node_name_lower = node_name.lower()
    
    if node_name_lower not in NODE_CLASSES:
        available_nodes = ", ".join(sorted(NODE_CLASSES.keys()))
        return {
            "error": f"Node '{node_name}' not found",
            "available_nodes": available_nodes
        }
    
    node_class = NODE_CLASSES[node_name_lower]
    
    # Get the Pydantic model schema
    schema = node_class.model_json_schema()
    
    # Determine node type
    node_type = _get_node_type(node_name_lower)
    
    # Extract required and optional fields
    required_fields = schema.get("required", [])
    all_properties = schema.get("properties", {})
    optional_fields = [field for field in all_properties.keys() if field not in required_fields]
    
    # Build parameter details
    parameters = {}
    for field_name, field_info in all_properties.items():
        param_detail = {
            "type": field_info.get("type"),
            "description": field_info.get("description", ""),
            "required": field_name in required_fields
        }
        
        # Add default value if exists
        if "default" in field_info:
            param_detail["default"] = field_info["default"]
        
        # Add const value if exists (for Literal fields)
        if "const" in field_info:
            param_detail["const"] = field_info["const"]
        
        # Add enum values if exists
        if "enum" in field_info:
            param_detail["allowed_values"] = field_info["enum"]
        
        # Handle anyOf (union types)
        if "anyOf" in field_info:
            param_detail["union_types"] = field_info["anyOf"]
        
        # Handle complex types
        if field_info.get("type") == "object" and "properties" in field_info:
            param_detail["nested_properties"] = field_info["properties"]
        
        if field_info.get("type") == "array" and "items" in field_info:
            param_detail["item_type"] = field_info["items"]
        
        # Handle $defs references
        if "$ref" in field_info:
            param_detail["reference"] = field_info["$ref"]
        
        parameters[field_name] = param_detail
    
    # Include definitions for complex types
    definitions = schema.get("$defs", {})
    
    return {
        "node_name": node_class.__name__,
        "node_id": node_name_lower,
        "category": schema.get("properties", {}).get("category", {}).get("const", "io"),
        "node_type": node_type,
        "parameters": parameters,
        "required_fields": required_fields,
        "optional_fields": optional_fields,
        "definitions": definitions,
        "full_schema": schema
    }


def get_node_pydantic_schema(node_name: str) -> Dict[str, Any]:
    """
    Get the EXACT Pydantic JSON schema for a node, including all $defs.
    This returns the raw schema that the LLM should match exactly.
    
    Args:
        node_name: The node_id of the node (e.g., 'kafka', 'http', 'filter', 'window_by')
    
    Returns:
        Complete Pydantic JSON schema with properties, $defs, and required fields
    """
    node_name_lower = node_name.lower()
    
    if node_name_lower not in NODE_CLASSES:
        available_nodes = ", ".join(sorted(NODE_CLASSES.keys()))
        return {
            "error": f"Node '{node_name}' not found",
            "available_nodes": available_nodes
        }
    
    node_class = NODE_CLASSES[node_name_lower]
    schema = node_class.model_json_schema()
    
    # Return the complete schema including definitions
    return {
        "node_id": node_name_lower,
        "schema": schema,
        "instructions": (
            "The 'properties' dict in your node output MUST exactly match the fields in schema['properties']. "
            "Pay special attention to nested types defined in schema['$defs'] - use the exact field names and structure. "
            "For example, window_by expects 'window' to have 'duration' and 'window_type', NOT 'length' and 'type'."
        )
    }


def get_node_parameters_concise(node_name: str) -> Dict[str, Any]:
    """
    Get node parameters in a format optimized for LLM structured output generation.
    Returns the exact structure needed to create a valid node in flowchart format.
    
    Args:
        node_name: The node_id of the node (e.g., 'kafka', 'http', 'filter', 'window_by')
    
    Returns:
        Dictionary showing the exact node structure with field descriptions
    """
    node_name_lower = node_name.lower()
    
    if node_name_lower not in NODE_CLASSES:
        available_nodes = ", ".join(sorted(NODE_CLASSES.keys()))
        return {
            "error": f"Node '{node_name}' not found",
            "available_nodes": available_nodes
        }
    
    node_class = NODE_CLASSES[node_name_lower]
    schema = node_class.model_json_schema()
    
    # Get category
    category = schema.get("properties", {}).get("category", {}).get("const", "io")
    
    # Extract fields
    required_fields = schema.get("required", [])
    all_properties = schema.get("properties", {})
    definitions = schema.get("$defs", {})
    
    # Build the node structure template
    node_structure = {
        "node_id": {
            "value": node_name_lower,
            "description": "Fixed identifier for this node type"
        },
        "category": {
            "value": category,
            "description": "Node category (io, table, temporal, agent)"
        },
        "properties": {}
    }
    
    # CRITICAL: Map Pydantic field names to flowchart JSON field names
    # input_schema (Pydantic) -> input_schema (Flowchart JSON) - NO MAPPING NEEDED
    field_name_mapping = {}
    
    # Add each field with type info and examples
    for field_name, field_info in all_properties.items():
        # Skip the structural fields we've already added
        if field_name in {"node_id", "category", "n_inputs"}:
            continue
        
        # Skip fields that are marked as SkipJsonSchema (like table_schema in Pydantic model)
        # These are internal fields that don't appear in JSON
        if field_name == "table_schema":
            continue
        
        # Map to flowchart field name if needed
        output_field_name = field_name_mapping.get(field_name, field_name)
        
        is_required = field_name in required_fields
        
        # Build field specification
        field_spec = {
            "required": is_required,
            "type": _get_simple_type(field_info, definitions),
        }
        
        # Add description if available
        if field_info.get("description"):
            field_spec["description"] = field_info["description"]
        
        # Add constraints
        if "enum" in field_info:
            field_spec["allowed_values"] = field_info["enum"]
            field_spec["example"] = field_info["enum"][0]
        elif "const" in field_info:
            field_spec["value"] = field_info["const"]
        elif "default" in field_info:
            field_spec["default"] = field_info["default"]
        
        # Add example value based on type
        if "example" not in field_spec and "value" not in field_spec:
            # Special handling for input_schema
            if output_field_name == "input_schema":
                field_spec["example"] = [
                    {"key": "column1", "value": "str"},
                    {"key": "column2", "value": "int"},
                    {"key": "timestamp", "value": "int"}
                ]
            else:
                field_spec["example"] = _generate_example_value(field_info, definitions)
        
        # Use the mapped field name in output
        node_structure["properties"][output_field_name] = field_spec
    
    return node_structure


def _get_simple_type(field_info: Dict[str, Any], definitions: Dict[str, Any]) -> str:
    """Extract a simple, readable type description."""
    if "const" in field_info:
        return f"literal[{field_info['const']}]"
    elif "enum" in field_info:
        vals = field_info["enum"][:3]
        return f"enum[{', '.join(map(str, vals))}{'...' if len(field_info['enum']) > 3 else ''}]"
    elif "$ref" in field_info:
        ref_name = field_info["$ref"].split("/")[-1]
        # Try to expand simple refs
        if ref_name in definitions:
            ref_def = definitions[ref_name]
            if "properties" in ref_def:
                props = list(ref_def["properties"].keys())[:3]
                return f"dict[{', '.join(props)}{'...' if len(ref_def['properties']) > 3 else ''}]"
        return ref_name
    elif "anyOf" in field_info:
        types = []
        for option in field_info["anyOf"]:
            if "type" in option:
                types.append(option["type"])
            elif "$ref" in option:
                types.append(option["$ref"].split("/")[-1])
        return " | ".join(types) if types else "union"
    elif field_info.get("type") == "array":
        items = field_info.get("items", {})
        item_type = _get_simple_type(items, definitions)
        return f"list[{item_type}]"
    elif field_info.get("type") == "object":
        if "properties" in field_info:
            props = list(field_info["properties"].keys())[:2]
            return f"dict[{', '.join(props)}...]"
        return "dict"
    else:
        return field_info.get("type", "any")


def _generate_example_value(field_info: Dict[str, Any], definitions: Dict[str, Any]) -> Any:
    """Generate an example value for a field."""
    if "enum" in field_info:
        return field_info["enum"][0]
    elif "const" in field_info:
        return field_info["const"]
    elif "default" in field_info:
        return field_info["default"]
    
    field_type = field_info.get("type")
    
    if field_type == "string":
        return "<value>"
    elif field_type == "integer":
        return 0
    elif field_type == "number":
        return 0.0
    elif field_type == "boolean":
        return False
    elif field_type == "array":
        items = field_info.get("items", {})
        if "$ref" in items:
            ref_name = items["$ref"].split("/")[-1]
            if ref_name in definitions:
                return [_create_example_from_ref(ref_name, definitions)]
        return []
    elif field_type == "object":
        if "$ref" in field_info:
            ref_name = field_info["$ref"].split("/")[-1]
            return _create_example_from_ref(ref_name, definitions)
        return {}
    elif "anyOf" in field_info:
        # Use first option
        for option in field_info["anyOf"]:
            if option.get("type") == "null":
                continue
            return _generate_example_value(option, definitions)
    
    return None


def _create_example_from_ref(ref_name: str, definitions: Dict[str, Any]) -> Dict[str, Any]:
    """Create an example object from a $ref definition."""
    if ref_name not in definitions:
        return {}
    
    ref_def = definitions[ref_name]
    example = {}
    
    if "properties" in ref_def:
        for prop_name, prop_info in ref_def["properties"].items():
            if "enum" in prop_info:
                example[prop_name] = prop_info["enum"][0]
            elif "const" in prop_info:
                example[prop_name] = prop_info["const"]
            elif prop_info.get("type") == "string":
                example[prop_name] = f"<{prop_name}>"
            elif prop_info.get("type") in ["integer", "number"]:
                example[prop_name] = 0
    
    return example


@tool("get_node_parameters", description=(
    "Retrieve the exact structure needed to create a Pathway node. "
    "Returns a template showing node_id, category, and all properties with their types, "
    "requirements, constraints, and example values. Use this to understand how to construct "
    "a valid node in the flowchart format.\n\n"
    "INPUT: Node name/ID (e.g., 'kafka', 'http', 'filter', 'join', 'window_by')\n"
    "OUTPUT: Node structure template with:\n"
    "  - node_id and category (fixed values)\n"
    "  - properties: each field with type, required status, allowed values, and examples\n\n"
    "The output matches the exact structure needed for flowchart node creation.\n\n"
    "Available node types: I/O connectors (input/output), table operations (transform, join, temporal, window), and agent nodes. "
    "Use list_available_nodes to see all available nodes."
))
def get_node_parameters_tool(node_name: str) -> str:
    """
    Tool to retrieve node structure template for creating nodes.
    
    Args:
        node_name: The name or ID of the node (e.g., 'kafka', 'http', 'filter')
    
    Returns:
        JSON string showing exact node structure with all fields
    """
    import json
    result = get_node_parameters_concise(node_name)
    return json.dumps(result, indent=2, default=str)


@tool("get_node_parameters_detailed", description=(
    "Retrieve DETAILED parameter information for a specific Pathway node type. "
    "Returns the complete schema including nested properties, type definitions, and full metadata. "
    "Use this when you need comprehensive type information or complex nested structures. "
    "For most cases, use 'get_node_parameters' instead for a more concise view.\n\n"
    "INPUT: Node name/ID (e.g., 'kafka', 'http', 'filter', 'join', 'window_by')\n"
    "OUTPUT: Complete dictionary with full schema, definitions, and detailed type information"
))
def get_node_parameters_detailed_tool(node_name: str) -> str:
    """
    Tool to retrieve detailed node parameters by node name.
    
    Args:
        node_name: The name or ID of the node
    
    Returns:
        JSON string containing detailed node parameter information
    """
    import json
    result = get_node_parameters(node_name)
    return json.dumps(result, indent=2, default=str)


@tool("list_available_nodes", description=(
    "Get a list of all available Pathway node types including I/O connectors and table operations. "
    "Use this to discover what node types are available before querying specific parameters."
))
def list_available_nodes_tool() -> str:
    """
    Tool to list all available node types.
    
    Returns:
        JSON string containing categorized list of available nodes
    """
    import json
    
    # Define node categories by node_id
    input_node_ids = {
        "kafka", "redpanda", "csv", "jsonlines", "airbyte", "debezium", "s3", "minio", 
        "deltalake", "iceberg", "plaintext", "http", "mongodb", "postgres", "sqlite", 
        "gdrive", "kinesis", "nats", "mqtt", "python", "open_tel_spans_input", 
        "open_tel_metrics_input", "open_tel_logs_input"
    }
    
    output_node_ids = {
        "kafka_write", "redpanda_write", "csv_write", "jsonlines_write", "postgres_write", 
        "mysql_write", "mongodb_write", "bigquery_write", "elasticsearch_write", 
        "dynamodb_write", "pubsub_write", "kinesis_write", "nats_write", "mqtt_write", 
        "logstash_write", "questdb_write"
    }
    
    transform_node_ids = {"filter", "group_by", "json_select", "flatten"}
    join_node_ids = {"join", "asof_now_join"}
    temporal_join_node_ids = {"asof_join", "interval_join", "window_join"}
    window_node_ids = {"window_by"}
    agent_node_ids = {"alert", "rag_node", "trigger_rca"}
    
    input_nodes = []
    output_nodes = []
    transform_nodes = []
    join_nodes = []
    temporal_join_nodes = []
    window_nodes = []
    agent_nodes = []
    
    for node_id, node_class in sorted(NODE_CLASSES.items()):
        node_info = {
            "node_id": node_id,
            "class_name": node_class.__name__
        }
        
        if node_id in input_node_ids:
            input_nodes.append(node_info)
        elif node_id in output_node_ids:
            output_nodes.append(node_info)
        elif node_id in transform_node_ids:
            transform_nodes.append(node_info)
        elif node_id in join_node_ids:
            join_nodes.append(node_info)
        elif node_id in temporal_join_node_ids:
            temporal_join_nodes.append(node_info)
        elif node_id in window_node_ids:
            window_nodes.append(node_info)
        elif node_id in agent_node_ids:
            agent_nodes.append(node_info)
    
    result = {
        "io_nodes": {
            "input_nodes": input_nodes,
            "output_nodes": output_nodes
        },
        "table_nodes": {
            "transform_nodes": transform_nodes,
            "join_nodes": join_nodes,
            "temporal_join_nodes": temporal_join_nodes,
            "window_nodes": window_nodes
        },
        "agent_nodes": agent_nodes,
        "total_count": len(NODE_CLASSES)
    }
    
    return json.dumps(result, indent=2)


@tool("get_reducer_types", description=(
    "Get information about available reducer functions for aggregations. "
    "Reducers are used in group_by and window_by operations to aggregate data. "
    "Returns a list of all available reducer types with descriptions of what they do."
))
def get_reducer_types_tool() -> str:
    """
    Tool to list all available reducer types and their descriptions.
    
    Returns:
        JSON string containing reducer information
    """
    import json
    
    reducers = {
        "any": "Returns any value from the group (non-deterministic)",
        "argmax": "Returns the argument (row) with the maximum value",
        "argmin": "Returns the argument (row) with the minimum value",
        "avg": "Calculates the average (mean) of values",
        "count": "Counts the number of rows in the group",
        "count_distinct": "Counts the number of distinct values",
        "count_distinct_approximate": "Approximate count of distinct values (faster for large datasets)",
        "earliest": "Returns the earliest value based on processing time",
        "latest": "Returns the latest value based on processing time",
        "max": "Returns the maximum value",
        "min": "Returns the minimum value",
        "ndarray": "Collects values into a NumPy array",
        "sorted_tuple": "Collects values into a sorted tuple",
        "stateful_many": "Custom stateful aggregation returning multiple values",
        "stateful_single": "Custom stateful aggregation returning a single value",
        "sum": "Calculates the sum of values",
        "tuple": "Collects values into a tuple",
        "unique": "Returns unique values (fails if multiple distinct values exist)"
    }
    
    result = {
        "reducers": reducers,
        "usage": "Use in ReducerDict with format: {col: 'column_name', reducer: 'reducer_type', new_col: 'output_column'}"
    }
    
    return json.dumps(result, indent=2)


@tool("get_filter_operators", description=(
    "Get information about available filter operators for the filter node. "
    "Returns a list of all comparison and string operators that can be used in filter conditions."
))
def get_filter_operators_tool() -> str:
    """
    Tool to list all available filter operators.
    
    Returns:
        JSON string containing filter operator information
    """
    import json
    
    operators = {
        "==": "Equal to",
        "!=": "Not equal to",
        "<": "Less than",
        "<=": "Less than or equal to",
        ">": "Greater than",
        ">=": "Greater than or equal to",
        "startswith": "String starts with (for string columns)",
        "endswith": "String ends with (for string columns)",
        "find": "String contains (for string columns)"
    }
    
    result = {
        "operators": operators,
        "usage": "Use in Filter dict with format: {col: 'column_name', op: 'operator', value: comparison_value}",
        "example": {
            "numeric_filter": {"col": "age", "op": ">=", "value": 18},
            "string_filter": {"col": "name", "op": "startswith", "value": "John"},
            "equality_filter": {"col": "status", "op": "==", "value": "active"}
        }
    }
    
    return json.dumps(result, indent=2)


@tool("get_window_types", description=(
    "Get information about available window types for temporal operations. "
    "Windows are used in window_by and window_join operations. "
    "Returns details about tumbling, sliding, and session windows."
))
def get_window_types_tool() -> str:
    """
    Tool to list all available window types and their configurations.
    
    Returns:
        JSON string containing window type information
    """
    import json
    
    window_types = {
        "tumbling": {
            "description": "Non-overlapping fixed-size windows",
            "parameters": {
                "duration": "Window size (timedelta or int/float for seconds)",
                "origin": "Reference point for window alignment (datetime or Unix timestamp)",
                "window_type": "Must be 'tumbling'"
            },
            "example": {
                "duration": 300,
                "origin": None,
                "window_type": "tumbling"
            },
            "use_case": "Counting events per 5-minute interval"
        },
        "sliding": {
            "description": "Overlapping fixed-size windows that slide at regular intervals",
            "parameters": {
                "duration": "Window size (timedelta or int/float for seconds)",
                "hop": "Slide interval (how often new window starts)",
                "origin": "Reference point for window alignment",
                "window_type": "Must be 'sliding'"
            },
            "example": {
                "duration": 600,
                "hop": 60,
                "origin": None,
                "window_type": "sliding"
            },
            "use_case": "Moving average over 10 minutes, updated every minute"
        },
        "session": {
            "description": "Dynamic windows based on activity gaps",
            "parameters": {
                "max_gap": "Maximum inactivity time before closing session (timedelta or int/float for seconds)",
                "window_type": "Must be 'session'"
            },
            "example": {
                "max_gap": 1800,
                "window_type": "session"
            },
            "use_case": "User sessions with max 30-minute inactivity"
        }
    }
    
    result = {
        "window_types": window_types,
        "common_behaviour": {
            "delay": "Processing delay for late-arriving data",
            "cutoff": "Discard data older than this threshold",
            "keep_results": "Whether to keep results after window closes"
        }
    }
    
    return json.dumps(result, indent=2)


# Export the tools for use in agents
__all__ = [
    "get_node_parameters_tool",
    "get_node_parameters_detailed_tool",
    "list_available_nodes_tool",
    "get_reducer_types_tool",
    "get_filter_operators_tool",
    "get_window_types_tool",
    "get_node_parameters",
    "get_node_parameters_concise",
    "NODE_CLASSES"
]

if __name__ == "__main__":
    print("=== CONCISE FORMAT (Default for LLMs) ===")
    print(get_node_parameters_tool.invoke({"node_name": "http"}))
    print("\n")
    print("=== FILTER NODE ===")
    print(get_node_parameters_tool.invoke({"node_name": "filter"}))
    print("\n")
    print("=== WINDOW_BY NODE ===")
    print(get_node_parameters_tool.invoke({"node_name": "window_by"}))
    print("=== postgres write NODE ===")
    print(get_node_parameters_tool.invoke({"node_name": "postgres_write"}))
    print("=== alert NODE ===")
    print(get_node_parameters_tool.invoke({"node_name": "alert"}))