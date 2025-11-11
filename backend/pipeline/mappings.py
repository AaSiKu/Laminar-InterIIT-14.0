from typing import TypedDict, Callable, Any, List, Type, Literal, Union, Optional, Tuple
from lib.tables import JoinNode, AsofJoinNode, IntervalJoinNode, WindowJoinNode, AsofNowJoinNode
from lib.alert import AlertNode
import pathway as pw
# from pathway.xpacks.llm import parsers, splitters, embedders
# from pathway.xpacks.llm.document_store import DocumentStore
# from pathway.stdlib.indexing import BruteForceKnnFactory, TantivyBM25Factory, HybridIndexFactory
import httpx
import os

# ---------------------------------------
# Operator mapping for filter node
# ---------------------------------------
_op_map = {
    ">": "__gt__",
    "<": "__lt__",
    "==": "__eq__",
    "!=": "__ne__",
    ">=": "__ge__",
    "<=": "__le__",
}

# TODO: Refactor into multiple files

agentic_url = os.getenv("AGENTIC_URL")



# ---------------------------------------
# MappingValues definition
# ---------------------------------------
class MappingValues(TypedDict):
    node_fn: Callable[[list[pw.Table], Any], pw.Table]

# ---------------------------------------
# Helper function
# ---------------------------------------
get_col = lambda table, col_name: getattr(table, col_name)
get_this_col = lambda col_name: getattr(pw.this, col_name)

def apply_datetime_conversions(table: pw.Table, datetime_columns: Optional[List[Tuple[str, str]]]) -> pw.Table:
    """
    Apply datetime conversions to specified columns in a table.
    
    Args:
        table: The input table
        datetime_columns: List of tuples (column_name, format_string) for datetime conversion
    
    Returns:
        Table with datetime columns converted
    """
    if not datetime_columns:
        return table
    
    conversions = {}
    for col_name, fmt in datetime_columns:
        if not hasattr(table, col_name):
            raise ValueError(f"Column '{col_name}' not found in table")
        
        col = get_col(table,col_name)
        
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

# ---------------------------------------
# OUTPUT CONNECTORS
# ---------------------------------------
output_connector_mappings: dict[str, MappingValues] = {
    "kafka_write": {
        "node_fn": lambda inputs, node: pw.io.kafka.write(
            inputs[0],
            topic_name=node.topic_name,
            rdkafka_settings=node.rdkafka_settings,
            format=getattr(node, "format", "json"),
        ),
    },

    "redpanda_write": {
        "node_fn": lambda inputs, node: pw.io.redpanda.write(
            inputs[0],
            topic_name=node.topic_name,
            rdkafka_settings=node.rdkafka_settings,
            format=getattr(node, "format", "json"),
        ),
    },

    "csv_write": {
        "node_fn": lambda inputs, node: pw.io.csv.write(inputs[0], node.filename),
    },

    "jsonlines_write": {
        "node_fn": lambda inputs, node: pw.io.jsonlines.write(inputs[0], node.filename),
    },

    "postgres_write": {
        "node_fn": lambda inputs, node: pw.io.postgres.write(
            inputs[0],
            table_name=node.table_name,
            postgres_settings=node.postgres_settings,
            primary_keys=node.primary_keys,
        ),
    },

    "mysql_write": {
        "node_fn": lambda inputs, node: pw.io.mysql.write(
            inputs[0],
            table_name=node.table_name,
            mysql_settings=node.mysql_settings,
            primary_keys=node.primary_keys,
        ),
    },

    "mongodb_write": {
        "node_fn": lambda inputs, node: pw.io.mongodb.write(
            inputs[0],
            uri=node.uri,
            database=node.database,
            collection=node.collection,
        ),
    },

    "bigquery_write": {
        "node_fn": lambda inputs, node: pw.io.bigquery.write(
            inputs[0],
            credentials_file=node.credentials_file,
            project_id=node.project_id,
            dataset=node.dataset,
            table=node.table,
        ),
    },

    "elasticsearch_write": {
        "node_fn": lambda inputs, node: pw.io.elasticsearch.write(
            inputs[0],
            hosts=node.hosts,
            index=node.index,
            username=getattr(node, "username", None),
            password=getattr(node, "password", None),
        ),
    },

    "dynamodb_write": {
        "node_fn": lambda inputs, node: pw.io.dynamodb.write(
            inputs[0],
            table_name=node.table_name,
            aws_credentials=node.aws_credentials,
        ),
    },

    "pubsub_write": {
        "node_fn": lambda inputs, node: pw.io.pubsub.write(
            inputs[0],
            topic=node.topic,
            credentials_file=node.credentials_file,
        ),
    },

    "kinesis_write": {
        "node_fn": lambda inputs, node: pw.io.kinesis.write(
            inputs[0],
            stream_name=node.stream_name,
            aws_credentials=node.aws_credentials,
        ),
    },

    "nats_write": {
        "node_fn": lambda inputs, node: pw.io.nats.write(
            inputs[0],
            uri=node.uri,
            topic=node.topic,
            format=node.format,
        ),
    },

    "mqtt_write": {
        "node_fn": lambda inputs, node: pw.io.mqtt.write(
            inputs[0],
            broker=node.broker,
            topic=node.topic,
        ),
    },

    "logstash_write": {
        "node_fn": lambda inputs, node: pw.io.logstash.write(inputs[0], node.endpoint),
    },

    "questdb_write": {
        "node_fn": lambda inputs, node: pw.io.questdb.write(
            inputs[0],
            host=node.host,
            port=node.port,
        ),
    },
}

# ---------------------------------------
# INPUT CONNECTORS
# ---------------------------------------
input_connector_mappings = {
    "kafka": {
        "node_fn": lambda _tables, node: pw.io.kafka.read(
            topic=node.topic,
            rdkafka_settings=node.rdkafka_settings,
            format=node.format,
            json_field_paths=node.json_field_paths,
            schema=node.table_schema,
        )
    },
    "redpanda": {
        "node_fn": lambda _tables, node: pw.io.redpanda.read(
            topic=node.topic,
            rdkafka_settings=node.rdkafka_settings,
            format=node.format,
            schema=node.table_schema,
            with_metadata=node.with_metadata,
        )
    },
    "csv": {
        "node_fn": lambda _tables, node: pw.io.csv.read(
            path=node.path,
            schema=node.table_schema,
        )
    },
    "jsonlines": {
        "node_fn": lambda _tables, node: pw.io.jsonlines.read(
            path=node.path,
            schema=node.table_schema,
        )
    },
    "airbyte": {
        "node_fn": lambda _tables, node: pw.io.airbyte.read(
            config_file_path=node.config_file_path,
            streams=node.streams,
            env_vars=node.env_vars,
            enforce_method=node.enforce_method,
            refresh_interval_ms=node.refresh_interval_ms,
            schema=node.table_schema,
        )
    },
    "debezium": {
        "node_fn": lambda _tables, node: pw.io.debezium.read(
            topic_name=node.topic_name,
            rdkafka_settings=node.rdkafka_settings,
            db_type=node.db_type,
            schema=node.table_schema,
        )
    },
    "s3": {
        "node_fn": lambda _tables, node: pw.io.s3.read(
            path=node.path,
            format=node.format,
            aws_s3_settings=node.aws_s3_settings,
            csv_settings=node.csv_settings,
            schema=node.table_schema,
            with_metadata=node.with_metadata,
        )
    },
    "minio": {
        "node_fn": lambda _tables, node: pw.io.minio.read(
            path=node.path,
            format=node.format,
            minio_settings=node.minio_settings,
            schema=node.table_schema,
            with_metadata=node.with_metadata,
        )
    },
    "deltalake": {
        "node_fn": lambda _tables, node: pw.io.deltalake.read(
            uri=node.uri,
            version=node.version,
            datetime_column=node.datetime_column,
            schema=node.table_schema,
        )
    },
    "iceberg": {
        "node_fn": lambda _tables, node: pw.io.iceberg.read(
            catalog=node.catalog,
            table_name=node.table_name,
            schema=node.table_schema,
        )
    },
    "plaintext": {
        "node_fn": lambda _tables, node: pw.io.text.read(
            path=node.path,
            object_pattern=node.object_pattern,
            schema=node.table_schema,
            with_metadata=node.with_metadata,
        )
    },
    "http": {
        "node_fn": lambda _tables, node: pw.io.http.read(
            url=node.url,
            method=node.method,
            headers=node.headers,
            allow_redirects=node.allow_redirects,
            schema=node.table_schema,
        )
    },
    "mongodb": {
        "node_fn": lambda _tables, node: pw.io.mongodb.read(
            uri=node.uri,
            database=node.database,
            collection=node.collection,
            schema=node.table_schema,
        )
    },
    "postgres": {
        "node_fn": lambda _tables, node: pw.io.postgres.read(
            topic_name=node.topic_name,
            rdkafka_settings=node.rdkafka_settings,
            schema=node.table_schema,
        )
    },
    "sqlite": {
        "node_fn": lambda _tables, node: pw.io.sqlite.read(
            path=node.path,
            table_name=node.table_name,
            schema=node.table_schema,
        )
    },
    "gdrive": {
        "node_fn": lambda _tables, node: pw.io.gdrive.read(
            object_id=node.object_id,
            service_user_credentials_file=node.service_user_credentials_file,
            schema=node.table_schema,
            with_metadata=node.with_metadata,
        )
    },
    "kinesis": {
        "node_fn": lambda _tables, node: pw.io.kinesis.read(
            stream_name=node.stream_name,
            format=node.format,
            aws_credentials=node.aws_credentials,
            schema=node.table_schema,
        )
    },
    "nats": {
        "node_fn": lambda _tables, node: pw.io.nats.read(
            servers=node.servers,
            subject=node.subject,
            format=node.format,
            schema=node.table_schema,
        )
    },
    "mqtt": {
        "node_fn": lambda _tables, node: pw.io.mqtt.read(
            broker=node.broker,
            topic=node.topic,
            port=node.port,
            schema=node.table_schema,
        )
    },
    "python": {
        "node_fn": lambda _tables, node: pw.io.python.read(
            node.subject, schema=node.table_schema
        )
    },
}


# BUG: Cannot handle the case where the two tables each have one or more columns with the same name
    # POSSIBLE FIX: When this error arises, ask the user to rename one of the conflicting columns
def _join(inputs: List[pw.Table],node: JoinNode) -> pw.Table:
    left,right = inputs
    expression = []
    for col1, col2 in node.on:
        col1 = get_col(left,col1)
        col2 = get_col(right,col2)
        expression.append(col1==col2)
    how_map = { key: getattr(pw.JoinMode,key.upper()) for key in ["left","right","inner","outer"] }
    
    without1 = [get_col(left,col1) for col1,_ in node.on]
    without2 = [get_col(right,col2) for _,col2 in node.on]

    other_columns = []

    for col1,col2 in node.on:
        if col1 == col2:
            other_columns.append(get_col(left,col1))
        else:
            other_columns.append(get_col(left,col1))
            other_columns.append(get_col(right,col2))
    return {
        how_map,
        expression,
        without1,
        without2,
        other_columns
    }
    

def asof_join(inputs: List[pw.Table],node: AsofJoinNode):
    params = _join(inputs,node)
    left,right = inputs
    return left.asof_join(
        right,
        get_col(left,node.time_col1),
        get_col(right,node.time_col2),
        *params["expression"],
        how=params["how_map"][node.how],
        behaviour=node.behaviour
    ).select(
        *left.without(params["without1"]),
        *right.without(params["without2"]),
        *params["other_columns"],
    )

def interval_join(inputs: List[pw.Table],node: IntervalJoinNode):
    params = _join(inputs,node)
    left,right = inputs
    return left.interval_join(
        right,
        get_col(left,node.time_col1),
        get_col(right,node.time_col2),
        pw.temporal.interval(node.lower_bound, node.upper_bound),
        *params["expression"],
        how=params["how_map"][node.how],
    ).select(
        *left.without(params["without1"]),
        *right.without(params["without2"]),
        *params["other_columns"],
    )

def window_join(inputs: List[pw.Table],node: WindowJoinNode):
    params = _join(inputs,node)
    left,right = inputs
    kwargs = node.model_dump()
    window_type = kwargs.pop("window_type")
    window = getattr(pw.temporal,window_type)(**kwargs)
    return left.window_join(
        right,
        get_col(left,node.time_col1),
        get_col(right,node.time_col2),
        window,
        *params["expression"],
        how=params["how_map"][node.how],
    ).select(
        *left.without(params["without1"]),
        *right.without(params["without2"]),
        *params["other_columns"],
    )

def asof_now_join(inputs: List[pw.Table], node: AsofNowJoinNode):
    params = _join(inputs,node)
    left,right = inputs
    join_id = (left.id if node.join_id == "self" else right.id) if hasattr(node,"join_id") else None
    return left.asof_now_join(
        right,
        *params["expression"],
        how=params["how_map"][node.how],
        id=join_id
    ).select(
        *left.without(params["without1"]),
        *right.without(params["without2"]),
        *params["other_columns"],
    )


def join(inputs: List[pw.Table], node: JoinNode):
    params = _join(inputs,node)
    left,right = inputs
    return left.join(
        right,
        *params["expression"],
        how=params["how_map"][node.how],
    ).select(
        *left.without(params["without1"]),
        *right.without(params["without2"]),
        *params["other_columns"],
    )


table_mappings: dict[str, MappingValues] = {
    "filter": {
        "node_fn": lambda inputs, node: inputs[0].filter(
            getattr(get_this_col(node.col), _op_map.get(node.op))(node.value)
        ),
    },

    "sort": {
        "node_fn": lambda inputs, node: inputs[0].sort(key=get_this_col(node.col)),
    },

    "sliding": {
        "node_fn": lambda inputs, node: inputs[0].windowby(
            get_this_col(node.time_col),
            window=pw.temporal.sliding(
                hop=node.hop,
                duration=node.duration,
                origin=getattr(node, "origin", None),
            ),
            instance=(
                get_this_col(node.instance_col)
                if node.instance_col is not None
                else None
            ),
        ),
    },

    "tumbling": {
        "node_fn": lambda inputs, node: inputs[0].windowby(
            get_this_col(node.time_col),
            window=pw.temporal.tumbling(
                duration=node.duration,
                origin=getattr(node, "origin", None),
            ),
            instance=(
                get_this_col(node.instance_col)
                if node.instance_col is not None
                else None
            ),
        ),
    },

    "session": {
        "node_fn": lambda inputs, node: inputs[0].windowby(
            get_this_col(node.time_col),
            window=pw.temporal.session(
                max_gap=getattr(node, "max_gap", None),
            ),
            instance=(
                get_this_col(node.instance_col)
                if node.instance_col is not None
                else None
            ),
        ),
    },

    "concat": {
        "node_fn": lambda inputs, node: inputs[0].concat(inputs[1]),
    },

    "join": {
        "node_fn": join,
    },
    "asof_join": {
        "node_fn": asof_join,
    },
    "interval_join": {
        "node_fn": interval_join,
    },
    "window_join": {
        "node_fn": window_join,
    },
    "reduce": {
        "node_fn": lambda inputs, node: inputs[0].reduce(**{
            new_col: getattr(pw.reducers,reducer)(get_col(inputs[0],prev_col)) for prev_col,reducer,new_col in node.reducers
        }, **{
            col: get_this_col(inputs[0], col) for col in node.retain_columns
        })
    }
}


# def build_document_store(inputs, node):
#     """
#     Builds a DocumentStore by orchestrating the parsing, splitting,
#     embedding, and indexing pipeline based on the node's configuration.
#     """
#     documents = inputs[0]

#     # 1. Configure Parser
#     if node.parser_type == "Unstructured":
#         parser = parsers.UnstructuredParser()
#     else:
#         # In a real scenario, you might have more parser types
#         raise ValueError(f"Unsupported parser type: {node.parser_type}")

#     # 2. Configure Splitter
#     if node.splitter_type == "TokenCount":
#         splitter = splitters.TokenCountSplitter(
#             max_tokens=node.splitter_max_tokens,
#             min_tokens=node.splitter_min_tokens,
#         )
#     else:
#         raise ValueError(f"Unsupported splitter type: {node.splitter_type}")

#     # 3. Configure Embedder
#     if node.embedder_type == "Gemini":
#         if not node.google_api_key:
#             raise ValueError("Google API key is required for Gemini embedder.")
#         embedder = embedders.GeminiEmbedder(
#             api_key=node.google_api_key,
#             model=node.embedder_model,
#         )
#     elif node.embedder_type == "OpenAI":
#         if not node.openai_api_key:
#             raise ValueError("OpenAI API key is required for OpenAI embedder.")
#         embedder = embedders.OpenAIEmbedder(
#             api_key=node.openai_api_key,
#             model=node.embedder_model,
#         )
#     elif node.embedder_type == "SentenceTransformer":
#         embedder = embedders.SentenceTransformerEmbedder(
#             model=node.embedder_model,
#         )
#     else:
#         raise ValueError(f"Unsupported embedder type: {node.embedder_type}")

#     # 4. Configure Retriever Factory (Index)
#     if node.retriever_type == "Vector":
#         retriever_factory = BruteForceKnnFactory(
#             embedder=embedder,
#             dimensions=node.vector_dimensions,
#         )
#     elif node.retriever_type == "Hybrid":
#         knn_index = BruteForceKnnFactory(
#             embedder=embedder,
#             dimensions=node.vector_dimensions,
#         )
#         bm25_index = TantivyBM25Factory(ram_budget=node.bm25_ram_budget)
#         retriever_factory = HybridIndexFactory(
#             retriever_factories=[knn_index, bm25_index]
#         )
#     else:
#         raise ValueError(f"Unsupported retriever type: {node.retriever_type}")

#     # 5. Create and return the DocumentStore
#     # This makes the DocumentStore object available to the pipeline runner.
#     return DocumentStore(
#         docs=documents,
#         parser=parser,
#         splitter=splitter,
#         retriever_factory=retriever_factory,
#     )


# rag_mappings: dict[str, MappingValues] = {
#     "rag_node": {
#         "node_fn": build_document_store,
#     },
# }

class AlertResponseSchema(pw.Schema):
    type: str
    message: str

class GenerateAlert(pw.AsyncTransformer,output_schema=AlertResponseSchema):
    alert_node: AlertNode
    def __init__(self, alert_node: AlertNode,  *args,**kwargs):
         self.alert_node = alert_node
         super().__init__(*args,**kwargs)
    async def invoke(self, **kwargs) -> str:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{agentic_url.rstrip("/")}/generate-alert",
                    json=dict(
                        alert_prompt=self.alert_node.alert_prompt,
                        # This input_trigger_description field is set in __main__.py
                        trigger_description=self.alert_node.input_trigger_description,
                        trigger_data=kwargs,
                    ),
                )
                resp.raise_for_status()
                data = resp.json()
                return data["alert"]
            
SASL_USERNAME = os.getenv("KAFKA_SASL_USERNAME", None)
SASL_PASSWORD = os.getenv("KAFKA_SASL_PASSWORD", None)
SASL_MECHANISM = os.getenv("KAFKA_SASL_MECHANISM", None)
SECURITY_PROTOCOL = os.getenv("KAFKA_SECURITY_PROTOCOL", None) 

def alert_node_fn(inputs: List[pw.Table],alert_node: AlertNode ):
    trigger_table = inputs[0]
    alerts = GenerateAlert(alert_node, input_table=trigger_table).successful

    pipeline_id = os.getenv("PIPELINE_ID")
    config = {
        "bootstrap.servers": os.getenv("KAFKA_BOOTSTRAP_SERVER","host.docker.internal:9092"),
        "client.id": os.getenv("KAFKA_CLIENT_ID",pipeline_id),
        "linger.ms": "5",
        "batch.num.messages": "10000",
        "compression.type": "lz4", 
    }
    if SASL_USERNAME:
        config = {
            **config,
            "security.protocol": SECURITY_PROTOCOL,
            "sasl.mechanisms": SASL_MECHANISM,
            "sasl.username": SASL_USERNAME,
            "sasl.password": SASL_PASSWORD,
        }
    pw.io.kafka.write(alerts.select(*pw.this,pipeline_id=pipeline_id),rdkafka_settings=config, topic_name=f"alert_{pipeline_id}", format="json")
    return alerts

# ---------------------------------------
# Final unified mapping
# ---------------------------------------
mappings: dict[str, MappingValues] = {
    **output_connector_mappings,
    **input_connector_mappings,
    **table_mappings,
    "alert": {
        "node_fn": alert_node_fn
    },
    # **rag_mappings
}
