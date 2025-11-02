from pydantic import Field, field_validator
from typing import Optional, Dict, Any, List, Literal
import pathway as pw
from node import Node
import json

class IONode(Node):
    table_schema: Any
    category: Literal['io']
    name: Optional[str] = Field(default="None")

    @field_validator("table_schema", mode="before")
    @classmethod
    def validate_schema(cls, value):
        # If it's already a Pathway schema class, accept as-is
        if isinstance(value, type) and issubclass(value, pw.Schema):
            return value

        # If it's a JSON string, parse and convert
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if not isinstance(parsed, dict):
                    raise TypeError("Schema JSON must represent a dictionary.")
                return pw.schema_from_dict(parsed)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON for schema: {e}")
            except Exception as e:
                raise ValueError(f"Failed to construct Pathway schema: {e}")

        # If it's already a dict, support that too
        if isinstance(value, dict):
            try:
                return pw.schema_from_dict(value)
            except Exception as e:
                raise ValueError(f"Invalid Pathway schema dict: {e}")

        raise TypeError(
            f"table_schema must be either a Pathway Schema class, "
            f"a JSON string, or a dict — got {type(value).__name__}"
        )

# ============ INPUT CONNECTORS ============

class KafkaNode(IONode):
    topic: str
    node_id: Literal["kafka"]
    rdkafka_settings: Dict[str, Any]
    format: Literal["raw", "csv", "json", "plaintext"] = "json"
    json_field_paths: Optional[Dict[str, str]] = None


class RedpandaNode(IONode):
    topic: str
    node_id: Literal["redpanda"]
    rdkafka_settings: Dict[str, Any]
    format: Literal["json"] = "json"
    with_metadata: bool = False
    


class CsvNode(IONode):
    path: str
    node_id: Literal["csv"]
    


class JsonLinesNode(IONode):
    path: str
    
    node_id: Literal["jsonlines"]


class AirbyteNode(IONode):
    config_file_path: str
    streams: List[str]
    node_id: Literal["airbyte"]
    env_vars: Optional[Dict[str, str]] = None
    enforce_method: Optional[str] = None
    refresh_interval_ms: int = Field(default=60000)


class DebeziumNode(IONode):
    rdkafka_settings: Dict[str, Any]
    topic_name: str
    node_id: Literal["debezium"]
    db_type: Optional[str] = None
    


class S3Node(IONode):
    path: str
    aws_s3_settings: Dict[str, Any]
    format: str
    
    node_id: Literal["s3"]
    csv_settings: Optional[Dict[str, Any]] = None
    with_metadata: bool = False


class MinIONode(IONode):
    path: str
    minio_settings: Dict[str, Any]
    format: str
    node_id: Literal["minio"]
    with_metadata: bool = False


class DeltaLakeNode(IONode):
    uri: str
    node_id: Literal["deltalake"]
    version: Optional[int] = None
    datetime_column: Optional[str] = None
    


class IcebergNode(IONode):
    catalog: str
    table_name: str
    node_id: Literal["iceberg"]
    


class PlainTextNode(IONode):
    path: str
    node_id: Literal["plaintext"]
    object_pattern: str = Field(default="*")
    with_metadata: bool = True


class HTTPNode(IONode):
    url: str
    node_id: Literal["http"]
    method: Literal["GET", "POST", "PUT", "DELETE"] = "GET"
    headers: Optional[Dict[str, str]] = None
    allow_redirects: bool = True
    


class MongoDBNode(IONode):
    uri: str
    database: str
    collection: str
    node_id: Literal["mongodb"]
    


class PostgreSQLNode(IONode):
    rdkafka_settings: Dict[str, Any]
    topic_name: str
    node_id: Literal["postgres"]


class SQLiteNode(IONode):
    path: str
    table_name: str
    node_id: Literal["sqlite"]


class GoogleDriveNode(IONode):
    object_id: str
    service_user_credentials_file: str
    node_id: Literal["gdrive"]
    with_metadata: bool = False


class KinesisNode(IONode):
    stream_name: str
    format: Literal["plaintext", "raw", "json"]
    aws_credentials: Dict[str, Any]
    node_id: Literal["kinesis"]
    


class NATSNode(IONode):
    servers: List[str]
    format: Literal["plaintext", "raw", "json"]
    subject: str
    node_id: Literal["nats"]
    


class MQTTNode(IONode):
    broker: str
    topic: str
    node_id: Literal["mqtt"]
    port: int = Field(default=1883)
    


class PythonConnectorNode(IONode):
    subject: Any
    node_id: Literal["python"]


# ============ OUTPUT CONNECTORS ============

class KafkaWriteNode(IONode):
    
    rdkafka_settings: Dict[str, Any]
    topic_name: str
    format: Literal["json"] = "json"
    node_id: Literal["kafka_write"]


class RedpandaWriteNode(IONode):
    
    rdkafka_settings: Dict[str, Any]
    topic_name: str
    format: Literal["json"] = "json"
    node_id: Literal["redpanda_write"]


class CsvWriteNode(IONode):
    
    filename: str
    node_id: Literal["csv_write"]


class JsonLinesWriteNode(IONode):
    
    filename: str
    node_id: Literal["jsonlines_write"]


class PostgreSQLWriteNode(IONode):
    
    postgres_settings: Dict[str, Any]
    table_name: str
    primary_keys: List[str]
    node_id: Literal["postgres_write"]


class MySQLWriteNode(IONode):
    
    mysql_settings: Dict[str, Any]
    table_name: str
    primary_keys: List[str]
    node_id: Literal["mysql_write"]


class MongoDBWriteNode(IONode):
    
    uri: str
    database: str
    collection: str
    node_id: Literal["mongodb_write"]


class BigQueryWriteNode(IONode):
    credentials_file: str
    project_id: str
    dataset: str
    table: str
    node_id: Literal["bigquery_write"]
    


class ElasticsearchWriteNode(IONode):
    hosts: List[str]
    
    index: str
    node_id: Literal["elasticsearch_write"]
    username: Optional[str] = None
    password: Optional[str] = None


class DynamoDBWriteNode(IONode):
    
    table_name: str
    aws_credentials: Dict[str, Any]
    node_id: Literal["dynamodb_write"]


class PubSubWriteNode(IONode):
    
    topic: str
    credentials_file: str
    node_id: Literal["pubsub_write"]


class KinesisWriteNode(IONode):
    
    stream_name: str
    aws_credentials: Dict[str, Any]
    node_id: Literal["kinesis_write"]


class NATSWriteNode(IONode):
    
    uri: str
    topic: str
    format: Literal["json", "dsv", "plaintext", "raw"]
    node_id: Literal["nats_write"]


class MQTTWriteNode(IONode):
    
    broker: str
    topic: str
    node_id: Literal["mqtt_write"]


class LogstashWriteNode(IONode):
    
    endpoint: str
    node_id: Literal["logstash_write"]


class QuestDBWriteNode(IONode):
    host: str
    port: int
    node_id: Literal["questdb_write"]
