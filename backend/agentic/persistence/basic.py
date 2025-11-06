import pathway as pw
import os
from dotenv import load_dotenv

load_dotenv()
# class InputSchema(pw.Schema):
#     word: str

# words = pw.io.csv.read("inputs/", schema=InputSchema)
# word_counts = words.groupby(words.word).reduce(words.word, count=pw.reducers.count())
# pw.io.jsonlines.write(word_counts, "result.jsonlines")
# # pw.run()

# persistence_backend = pw.persistence.Backend.filesystem("./state/")
# persistence_config = pw.persistence.Config(persistence_backend)

input_postgres_settings = {
    "host": "localhost",
    "port": "5432",
    "dbname": "test",
    "user": os.getenv("PG_USER"),
    "password": os.getenv("PG_PASSWORD"),
}

output_postgres_settings = {
    "host": "localhost",
    "port": "5432",
    "dbname": "test",
    "user": os.getenv("PG_USER"),
    "password": os.getenv("PG_PASSWORD"),
}

class InputSchema(pw.Schema):
    name: str
    age: int
    code: str

# We use the CSV input connector to connect to the directory.
t = pw.io.csv.read(
  './input.csv',
  schema=InputSchema,
  mode="streaming"
)

# t = pw.io.debezium.read(
#     input_postgres_settings,
#     topic_name = "postgres.public.values",
#     schema = InputSchema,
#     autocommit_duration_ms = 100
# )

# We compute the sum (this part is independent of the connectors).
t = t.reduce(sum=pw.reducers.sum(t.age))

persistence_backend = pw.persistence.Backend.filesystem('./state/')
persistence_config = pw.persistence.Config(persistence_backend)

pw.persistence.save(t, persistence_config)

metadata = pw.Table.from_rows(
    [
        {
            "snapshot_id":"",
            "timestamp": ""
        }
    ]
)

pw.io.postgres.write(metadata, output_postgres_settings, "metadata_table")

pw.io.postgres.write(t, output_postgres_settings, "sum_table")

pw.run()

restored_table = pw.persistence.load(persistence_config)

metadata = pw.io.postgres.read(output_postgres_settings, "metadata_table")

context = f"Snapshot ID: {metadata['snapshot_id']}, Timestamp: {metadata['timestamp']}"
data = restored_table.to_pandas().to_dict(orient="records")
llm_input = {"context": context, "data": data}

# command = "docker run -i --rm -e POSTGRES_URL=postgresql://host.docker.internal:5432/test mcp/postgres \
#     postgresql://host.docker.internal:5432/test"