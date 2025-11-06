# Persistence workflow

- Live incoming data stream

- Connect using a pathway connector e.g. postgres

  - try to make this database an in-memory one

- Save this data to a persistent storage (e.g. postgres) 

  - save the data snapshots and metadata of the state

- load the state data + metadata from the persistent storage according to the
  need

- give the context to the LLM

- Use postgres MCP server from docker and run SQL queries to the database.
