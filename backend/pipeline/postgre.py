import os
from sqlalchemy import create_engine

# TODO: Each pipeline's docker container should have its own postgre db to store pipeline outputs, and it should be cleared everytime the pipeline changes
# Do the above in the docker file
construct_table_name = lambda node_id, node_index: f"{node_id}__{node_index}"

connection_string= {
    "host": os.getenv("POSTGRE_HOST", "localhost"),
    "port": os.getenv("POSTGRE_PORT", "5432"),
    "dbname": os.getenv("POSTGRE_DB", "db"),
    
}

connection_string_read = {
    **connection_string,
    "user": os.getenv("POSTGRE_READ_USER", "tool_input_user"),
    "password": os.getenv("POSTGRE_READ_PASSWORD", "tool_input_user"),
}


connection_string_write = {
    **connection_string,
    "user": os.getenv("POSTGRE_WRITE_USER", "pipeline_output_user"),
    "password": os.getenv("POSTGRE_WRITE_PASSWORD", "pipeline_output_user"),
}

construct_postgre_url = lambda connection_string : (
    f"postgresql+psycopg2://{connection_string['user']}:{connection_string['password']}"
    f"@{connection_string['host']}:{connection_string['port']}/{connection_string['dbname']}"
)

postgre_read_url = construct_postgre_url(connection_string_read)
postgre_write_url = construct_postgre_url(connection_string_write)

# TODO: Later we can work on connecting to the database only twice (one for read and one for write) instead of every tool and every node output connector connecting to the db everytime
postgre_read_engine = create_engine(postgre_read_url)
postgre_write_engine = create_engine(postgre_write_url)

# TODO: Afterwards we can consider using a lighter sql db rather than postgre such as sqlite