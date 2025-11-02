from pydantic import  Field
from typing import Optional, Dict, Any, List
import pathway as pw
from typing import Literal
from node import Node

class InputNode(Node):
    schema: type[pw.Schema]
    category: Literal['io']
    mode: Optional[str] = Field(default="streaming")  
    autocommit_duration_ms: Optional[int] = Field(default=1500)
    name: Optional[str] = None
    max_backlog_size: Optional[int] = None


class OutputNode(Node):
    category: Literal['io']
    schema: type[pw.Schema]


# 1. Kafka
class KafkaNode(InputNode):
    topic: str
    node_id: str = Field(default="kafka")
    rdkafka_settings: Dict[str, Any]
    format: str = Field(default="json")  # raw, csv, json, plaintext
    json_field_paths: Optional[Dict[str, str]] = None
    # autogenerate_key: bool = Field(default=False)
    # start_from_timestamp_ms: Optional[int] = None


class RedpandaNode(InputNode):
    topic: str
    node_id: str = Field(default="redpanda")
    rdkafka_settings: Dict[str, Any]
    format: str = Field(default="json")
    with_metadata: bool = Field(default=False)
    table_schema: type[pw.Schema]

# 2. CSV
class CsvNode(InputNode):
    path: str
    node_id: str = Field(default="csv")
    table_schema: type[pw.Schema]
    # delimiter: str = Field(default=",")
    # quote: str = Field(default='"')
    # escape: Optional[str] = None
    # enable_double_quote_escapes: bool = Field(default=True)
    # enable_quoting: bool = Field(default=True)
    # comment_character: Optional[str] = None
    # with_metadata: bool = Field(default=False)
    # object_pattern: str = Field(default="*")


# 3. JSON Lines
class JsonLinesNode(InputNode):
    path: str
    table_schema: type[pw.Schema]
    node_id: str = Field(default="jsonlines")
    table_schema: type[pw.Schema]
    # with_metadata: bool = Field(default=False)
    # object_pattern: str = Field(default="*")


# 4. Airbyte
class AirbyteNode(InputNode):
    config_file_path: str
    streams: List[str]
    node_id: str = Field(default="airbyte")
    # execution_type: str = Field(default="local")  # local or remote
    env_vars: Optional[Dict[str, str]] = None
    enforce_method: Optional[str] = None
    refresh_interval_ms: int = Field(default=60000)


# 5. Debezium
class DebeziumNode(InputNode):
    rdkafka_settings: Dict[str, Any]
    topic_name: str
    node_id: str = Field(default="debezium")
    db_type: Optional[str] = None  # postgres, mongodb, mysql
    table_schema: type[pw.Schema]


# 6. S3
class S3Node(InputNode):
    path: str
    aws_s3_settings: Dict[str, Any]
    format: str
    table_schema: type[pw.Schema]
    node_id: str = Field(default="s3")
    csv_settings: Optional[Dict[str, Any]] = None
    # json_field_paths: Optional[Dict[str, str]] = None
    with_metadata: bool = Field(default=False)


# 7. MinIO
class MinIONode(InputNode):
    path: str
    minio_settings: Dict[str, Any]
    format: str
    node_id: str = Field(default="minio")
    with_metadata: bool = Field(default=False)


# 8. Delta Lake
class DeltaLakeNode(InputNode):
    uri: str
    node_id: str = Field(default="deltalake")
    version: Optional[int] = None
    datetime_column: Optional[str] = None
    table_schema: type[pw.Schema]

# 9. Iceberg
class IcebergNode(InputNode):
    catalog: str
    table_name: str
    node_id: str = Field(default="iceberg")
    table_schema: type[pw.Schema]



# 11. Plain Text
class PlainTextNode(InputNode):
    path: str
    node_id: str = Field(default="plaintext")
    object_pattern: str = Field(default="*")
    with_metadata: bool = Field(default=False)


# 12. HTTP
class HTTPNode(InputNode):
    url: str
    node_id: str = Field(default="http")
    method: str = Field(default="GET")
    headers: Optional[Dict[str, str]] = None
    request_timeout_ms: Optional[int] = None
    allow_redirects: bool = Field(default=True)
    table_schema: type[pw.Schema]


# 13. MongoDB
class MongoDBNode(InputNode):
    uri: str
    database: str
    collection: str
    node_id: str = Field(default="mongodb")
    table_schema: type[pw.Schema]


# 14. PostgreSQL (via Debezium)
class PostgreSQLNode(InputNode):
    rdkafka_settings: Dict[str, Any]
    topic_name: str
    node_id: str = Field(default="postgres")


# 15. SQLite
class SQLiteNode(InputNode):
    path: str
    table_name: str
    node_id: str = Field(default="sqlite")


# 16. Google Drive
class GoogleDriveNode(InputNode):
    object_id: str
    service_user_credentials_file: str
    node_id: str = Field(default="gdrive")
    with_metadata: bool = Field(default=False)





# 18. Kinesis
class KinesisNode(InputNode):
    stream_name: str
    format : Literal['plaintext', 'raw', 'json']
    aws_credentials: Dict[str, Any]
    node_id: str = Field(default="kinesis")
    table_schema: type[pw.Schema]


# 19. NATS
class NATSNode(InputNode):
    servers: List[str]
    format : Literal['plaintext', 'raw', 'json']
    subject: str
    node_id: str = Field(default="nats")
    table_schema: type[pw.Schema]


# 20. MQTT
class MQTTNode(InputNode):
    broker: str
    topic: str
    node_id: str = Field(default="mqtt")
    port: int = Field(default=1883)
    table_schema: type[pw.Schema]



# 21. Python Connector
class PythonConnectorNode(InputNode):
    subject: Any  # ConnectorSubject instance
    node_id: str = Field(default="python")

    


# ============ OUTPUT CONNECTORS ============

# 1. Kafka Write
class KafkaWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    rdkafka_settings: Dict[str, Any]
    topic_name: str
    format: str = Field(default="json")
    node_id: str = Field(default="kafka_write")


# 2. Redpanda Write
class RedpandaWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    rdkafka_settings: Dict[str, Any]
    topic_name: str
    format: str = Field(default="json")
    node_id: str = Field(default="redpanda_write")


# 3. CSV Write
class CsvWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    filename: str
    node_id: str = Field(default="csv_write")


# 4. JSON Lines Write
class JsonLinesWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    filename: str
    node_id: str = Field(default="jsonlines_write")


# 5. PostgreSQL Write
class PostgreSQLWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    postgres_settings: Dict[str, Any]
    table_name: str
    primary_keys: List[str]
    node_id: str = Field(default="postgres_write")
    # output_table_type: str = Field(default="stream")  # stream or snapshot


# 6. MySQL Write
class MySQLWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    mysql_settings: Dict[str, Any]
    table_name: str
    primary_keys: List[str]
    node_id: str = Field(default="mysql_write")
    # output_table_type: str = Field(default="stream")


# 7. MongoDB Write
class MongoDBWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    uri: str
    database: str
    collection: str
    node_id: str = Field(default="mongodb_write")


# 8. BigQuery Write
class BigQueryWriteNode(OutputNode):
    credentials_file: str
    project_id: str
    dataset: str
    table: str
    node_id: str = Field(default="bigquery_write")
    table_schema: type[pw.Schema]


# 9. Elasticsearch Write
class ElasticsearchWriteNode(OutputNode):
    hosts: List[str]
    table_schema: type[pw.Schema]
    index: str
    node_id: str = Field(default="elasticsearch_write")
    username: Optional[str] = None
    password: Optional[str] = None


# 10. DynamoDB Write
class DynamoDBWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    table_name: str
    aws_credentials: Dict[str, Any]
    node_id: str = Field(default="dynamodb_write")




# 14. Google PubSub Write
class PubSubWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    topic: str
    credentials_file: str
    node_id: str = Field(default="pubsub_write")


# 15. Kinesis Write
class KinesisWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    stream_name: str
    aws_credentials: Dict[str, Any]
    node_id: str = Field(default="kinesis_write")


# 16. NATS Write
class NATSWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    uri: str
    topic: str
    format : Literal['json', 'dsv', 'plaintext', 'raw']
    node_id: str = Field(default="nats_write")


# 17. MQTT Write
class MQTTWriteNode(OutputNode):
    table_schema: type[pw.Schema]

    broker: str
    topic: str
    node_id: str = Field(default="mqtt_write")
    # port: int = Field(default=1883)


# 18. Logstash Write
class LogstashWriteNode(OutputNode):
    table_schema: type[pw.Schema]
    endpoint : str
    node_id: str = Field(default="logstash_write")


# 19. QuestDB Write
class QuestDBWriteNode(OutputNode):
    host: str
    port: int
    node_id: str = Field(default="questdb_write")

