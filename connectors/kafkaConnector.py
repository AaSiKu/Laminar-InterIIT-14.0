import time, threading, os
from kafka import KafkaProducer
import logging
import pathway as pw

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InputSchema(pw.Schema):
    value: int

class OutputSchema(pw.Schema):
    sum: int

class KafkaInputConnector:
    def __init__(self, settings: dict, topic: str, schema: pw.Schema):
        self.settings = settings
        self.topic = topic
        self.schema = schema

    def read(self) -> pw.Table:
        return pw.io.kafka.read(
            self.settings,
            self.topic,
            format="csv", # TODO: Add support for other formats
            schema=self.schema,
            csv_settings={"header": False},
            autocommit_duration_ms=1000
        )

class KafkaOutputConnector:
    def __init__(self, settings: dict, topic: str):
        self.settings = settings
        self.topic = topic

    def write(self, table: pw.Table):
        pw.io.kafka.write(
            table,
            self.settings,
            topic_name=self.topic,
            format="json"
        )


def run_kafka_producer(producer_settings: dict, topic: str):
    # time.sleep(5)
    try:
        producer = KafkaProducer(**producer_settings)
        print(f"Producer connected. Sending messages to topic '{topic}'...")

        for i in range(10):
            message = str(i)
            print(f"Sending: {message}")
            producer.send(topic, message.encode("utf-8"))
            # time.sleep(1)
        producer.flush()
        producer.close()
    except Exception as e:
        logger.error(f"Producer error: {e}")

class config:
    KAFKA_SERVER : os.environ.get("KAFKA_SERVER", "server-address:9092")
    SASL_USERNAME : os.environ.get("KAFKA_USERNAME")
    SASL_PASSWORD : os.environ.get("KAFKA_PASSWORD")
    GROUP_ID : os.environ.get("KAFKA_GROUP_ID")
    INPUT_TOPIC : "connector_example"
    OUTPUT_TOPIC : "sum"

## test run
def main():
    rdkafka_settings = {
        "bootstrap.servers": config.KAFKA_SERVER,
        "security.protocol": "sasl_ssl",
        "sasl.mechanism": "SCRAM-SHA-256",
        "group.id": config.GROUP_ID,
        "session.timeout.ms": "6000",
        "sasl.username": config.SASL_USERNAME,
        "sasl.password": config.SASL_PASSWORD,
    }

    producer_settings = {
        "bootstrap_servers": [config.KAFKA_SERVER],
        "sasl_mechanism": "SCRAM-SHA-256256",
        "security_protocol": "SASL_SSL",
        "sasl_plain_username": config.SASL_USERNAME,
        "sasl_plain_password": config.SASL_PASSWORD,
    }

    input_connector = KafkaInputConnector(
        settings=rdkafka_settings,
        topic=config.INPUT_TOPIC,
        schema=InputSchema
    )
    t = input_connector.read()

    t_sum = t.reduce(sum=pw.reducers.sum(t.value))

    output_connector = KafkaOutputConnector(
        settings=rdkafka_settings,
        topic=config.OUTPUT_TOPIC
    )

    output_connector.write(t_sum)
    producer_thread = threading.Thread(
        target=run_kafka_producer,
        args=(producer_settings, config.INPUT_TOPIC),
        daemon=True
    )
    producer_thread.start()

    pw.run()

if __name__ == "__main__":
    main()


#### TODO: Supposed to be uncommented
#### INFO: This is a testing module for the kafka connectors in pathway
#### INFO: DataStream -> kafka topics -> connectors -> pathway tables (write)

# import requests
# import json
# from typing import Dict, List, Optional, Any
# from datetime import datetime
# from abc import ABC, abstractmethod
# import pathway as pw
#
#
# class KafkaConnectSource:
#
#     def __init__(self, connect_url: str = "http://localhost:8083"):
#         self.connect_url = connect_url
#         self.connectors = {}
#
#     def create_postgres_cdc_source(self, name: str, database_config: Dict[str, Any], tables: List[str], topic_prefix: str = "raw") -> Dict[str, Any]:
#         config = {
#             "name": name,
#             "config": {
#                 "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
#                 "tasks.max": "1",
#                 "database.hostname": database_config.get("host", "localhost"),
#                 "database.port": database_config.get("port", "5432"),
#                 "database.user": database_config.get("user", "postgres"),
#                 "database.password": database_config.get("password", "password"),
#                 "database.dbname": database_config.get("dbname", "postgres"),
#                 "database.server.name": database_config.get("server_name", "db_server"),
#                 "table.include.list": ",".join(tables),
#                 "topic.prefix": topic_prefix,
#                 "publication.name": f"{name}_publication",
#                 "slot.name": f"{name}_slot",
#                 "key.converter": "org.apache.kafka.connect.json.JsonConverter",
#                 "value.converter": "org.apache.kafka.connect.json.JsonConverter",
#                 "key.converter.schemas.enable": "false",
#                 "value.converter.schemas.enable": "false",
#                 "poll.interval.ms": "1000",
#                 "max.batch.size": "2048",
#             }
#         }
#
#         self.connectors[name] = config
#         return config
#
#     def create_jdbc_source(self, name: str, connection_url: str, table_name: str, mode: str = "incrementing", incrementing_column: str = "id", topic_prefix: str = "jdbc") -> Dict[str, Any]:
#         config = {
#             "name": name,
#             "config": {
#                 "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
#                 "tasks.max": "1",
#                 "connection.url": connection_url,
#                 "table.whitelist": table_name,
#                 "mode": mode,
#                 "incrementing.column.name": incrementing_column,
#                 "topic.prefix": topic_prefix,
#                 "poll.interval.ms": "5000",
#                 "key.converter": "org.apache.kafka.connect.json.JsonConverter",
#                 "value.converter": "org.apache.kafka.connect.json.JsonConverter",
#             }
#         }
#
#         self.connectors[name] = config
#         return config
#
#     def create_file_source(self, name: str, file_path: str, topic: str, file_format: str = "json") -> Dict[str, Any]:
#
#         config = {
#             "name": name,
#             "config": {
#                 "connector.class": "org.apache.kafka.connect.file.FileStreamSourceConnector",
#                 "tasks.max": "1",
#                 "file": file_path,
#                 "topic": topic,
#                 "key.converter": "org.apache.kafka.connect.storage.StringConverter",
#                 "value.converter": "org.apache.kafka.connect.json.JsonConverter",
#                 "value.converter.schemas.enable": "false",
#             }
#         }
#
#         self.connectors[name] = config
#         return config
#
#     def deploy_connector(self, connector_config: Dict[str, Any]) -> bool:
#
#         try:
#             response = requests.post(
#                 f"{self.connect_url}/connectors",
#                 headers={"Content-Type": "application/json"},
#                 data=json.dumps(connector_config)
#             )
#             response.raise_for_status()
#             return True
#         except requests.exceptions.RequestException as e:
#             return False
#
#     def deploy_all(self) -> Dict[str, bool]:
#         results = {}
#         for name, config in self.connectors.items():
#             results[name] = self.deploy_connector(config)
#         return results
#
#     def get_connector_status(self, name: str) -> Optional[Dict]:
#         try:
#             response = requests.get(f"{self.connect_url}/connectors/{name}/status")
#             response.raise_for_status()
#             return response.json()
#         except requests.exceptions.RequestException as e:
#             return None
#
#     def delete_connector(self, name: str) -> bool:
#         try:
#             response = requests.delete(f"{self.connect_url}/connectors/{name}")
#             response.raise_for_status()
#             return True
#         except requests.exceptions.RequestException as e:
#             return False
#
# class PathwayProcessor:
#
#     def __init__(self, kafka_bootstrap_servers: str = "localhost:9092", consumer_group: str = "pathway-processor-group"):
#         self.kafka_servers = kafka_bootstrap_servers
#         self.consumer_group = consumer_group
#
#     def add_kafka_input(self, topic: str, schema: type, auto_offset_reset: str = "earliest") -> pw.Table:
#         table = pw.io.kafka.read(
#             rdkafka_settings={
#                 "bootstrap.servers": self.kafka_servers,
#                 "group.id": self.consumer_group,
#                 "auto.offset.reset": auto_offset_reset,
#             },
#             topic=topic,
#             format="json", # TODO: Add support for other formats
#             schema=schema,
#         )
#         return table
#
#     def run(self):
#         pw.run()
#
# class DataSink(ABC):
#
#     @abstractmethod
#     def write(self, table: pw.Table, **kwargs):
#         pass
#
#
# class KafkaSink(DataSink):
#
#     def __init__(self, bootstrap_servers: str = "localhost:9092", compression_type: str = "snappy"):
#         self.bootstrap_servers = bootstrap_servers
#         self.compression_type = compression_type
#
#     def write(self, table: pw.Table, topic: str, format: str = "json"):
#         pw.io.kafka.write(
#             table,
#             rdkafka_settings={
#                 "bootstrap.servers": self.bootstrap_servers,
#                 "compression.type": self.compression_type,
#             },
#             topic=topic,
#             format=format,
#         )
#
#
# class PostgresSink(DataSink):
#
#     def __init__(self, host: str = "localhost", port: int = 5432, dbname: str = "postgres", user: str = "postgres", password: str = "password"):
#         self.postgres_settings = {
#             "host": host,
#             "port": str(port),
#             "dbname": dbname,
#             "user": user,
#             "password": password,
#         }
#
#     def write(self, table: pw.Table, table_name: str):
#         pw.io.postgres.write(
#             table,
#             postgres_settings=self.postgres_settings,
#             table_name=table_name,
#         )
#
#
# class KafkaConnectSink:
#
#     def __init__(self, connect_url: str = "http://localhost:8083"):
#         self.connect_url = connect_url
#         self.connectors = {}
#
#     def create_elasticsearch_sink(self, name: str, topics: List[str], es_url: str = "http://localhost:9200", es_user: Optional[str] = None, es_password: Optional[str] = None) -> Dict[str, Any]:
#         config = {
#             "name": name,
#             "config": {
#                 "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
#                 "tasks.max": "2",
#                 "connection.url": es_url,
#                 "type.name": "_doc",
#                 "topics": ",".join(topics),
#                 "key.ignore": "false",
#                 "schema.ignore": "true",
#                 "key.converter": "org.apache.kafka.connect.json.JsonConverter",
#                 "value.converter": "org.apache.kafka.connect.json.JsonConverter",
#                 "key.converter.schemas.enable": "false",
#                 "value.converter.schemas.enable": "false",
#                 "batch.size": "1000",
#                 "max.in.flight.requests": "5",
#                 "linger.ms": "1000",
#                 "errors.tolerance": "all",
#                 "errors.deadletterqueue.topic.name": f"dlq-{name}",
#             }
#         }
#
#         if es_user and es_password:
#             config["config"]["connection.username"] = es_user
#             config["config"]["connection.password"] = es_password
#
#         self.connectors[name] = config
#         return config
#
#     def create_jdbc_sink(self, name: str, topics: List[str], connection_url: str, auto_create: bool = True, insert_mode: str = "upsert") -> Dict[str, Any]:
#
#         config = {
#             "name": name,
#             "config": {
#                 "connector.class": "io.confluent.connect.jdbc.JdbcSinkConnector",
#                 "tasks.max": "1",
#                 "connection.url": connection_url,
#                 "topics": ",".join(topics),
#                 "auto.create": str(auto_create).lower(),
#                 "insert.mode": insert_mode,
#                 "key.converter": "org.apache.kafka.connect.json.JsonConverter",
#                 "value.converter": "org.apache.kafka.connect.json.JsonConverter",
#             }
#         }
#
#         self.connectors[name] = config
#         return config
#
#     def deploy_connector(self, connector_config: Dict[str, Any]) -> bool:
#         try:
#             response = requests.post(
#                 f"{self.connect_url}/connectors",
#                 headers={"Content-Type": "application/json"},
#                 data=json.dumps(connector_config)
#             )
#             response.raise_for_status()
#             return True
#         except Exception as e:
#             return False
#
#     def deploy_all(self) -> Dict[str, bool]:
#         results = {}
#         for name, config in self.connectors.items():
#             results[name] = self.deploy_connector(config)
#         return results
