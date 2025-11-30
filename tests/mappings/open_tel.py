import pathway as pw
import sys
sys.path.insert(0, "./backend")
from backend.pipeline.mappings.open_tel import open_tel_mappings
from backend.pipeline.mappings.output_connectors import output_connector_mappings
from backend.lib.open_tel.input_nodes import OpenTelSpansNode, OpenTelLogsNode, OpenTelMetricsNode
from backend.lib.io_nodes import PostgreSQLWriteNode

# OpenTel Spans input node
spans_node = OpenTelSpansNode(
    node_id="open_tel_spans_input",
    topic="otlp_spans",
    rdkafka_settings={
        "bootstrap_servers": "localhost:9092",
        "group_id": "test_group_spans",
    },
    category="io",
)

# OpenTel Logs input node
logs_node = OpenTelLogsNode(
    node_id="open_tel_logs_input",
    topic="otlp_logs",
    rdkafka_settings={
        "bootstrap_servers": "localhost:9092",
        "group_id": "test_group_logs",
    },
    category="io",
)

# OpenTel Metrics input node
metrics_node = OpenTelMetricsNode(
    node_id="open_tel_metrics_input",
    topic="otlp_metrics",
    rdkafka_settings={
        "bootstrap_servers": "localhost:9092",
        "group_id": "test_group_metrics",
    },
    category="io",
)

# Postgres output nodes
postgres_table = PostgreSQLWriteNode(
    node_id="postgres_write",
    category="io",
    postgres_settings={
        "host": "localhost",
        "port": 5432,
        "user": "admin",
        "password": "admin123",
        "dbname": "db"
    },
    table_name="generic_table_name",
    output_table_type="stream_of_changes",
    primary_keys=[]
)

postgres_spans = postgres_table.model_copy()
postgres_spans.table_name = "otel_spans_output"

postgres_logs = postgres_table.model_copy()
postgres_logs.table_name = "otel_logs_output"

postgres_metrics = postgres_table.model_copy()
postgres_metrics.table_name = "otel_metrics_output"

# Build input tables
spans_table = open_tel_mappings["open_tel_spans_input"]["node_fn"]([], spans_node)
logs_table = open_tel_mappings["open_tel_logs_input"]["node_fn"]([], logs_node)
metrics_table = open_tel_mappings["open_tel_metrics_input"]["node_fn"]([], metrics_node)

# Build outputs (Postgres writes)
output_connector_mappings["postgres_write"]["node_fn"]([spans_table], postgres_spans)
output_connector_mappings["postgres_write"]["node_fn"]([logs_table], postgres_logs)
output_connector_mappings["postgres_write"]["node_fn"]([metrics_table], postgres_metrics)

# Run the pipeline
pw.run()
