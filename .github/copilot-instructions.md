# Laminar (Pathway Tasks) - AI Coding Guide

## Project Overview
Laminar is an SLA-driven, real-time data pipeline orchestration platform built on **Pathway** (streaming engine). Users visually design pipelines in React Flow, which compile to Pathway computational graphs running in isolated Docker containers. Key architecture: FastAPI backend orchestrates MongoDB metadata + Docker containers, each running pipeline+agentic+PostgreSQL services.

## Core Architecture

### Three-Service Container Pattern
Each pipeline runs in an isolated Docker network with:
- **Pipeline Service** (port 8000): Pathway runtime executing the workflow graph
- **Agentic Service** (port 5333): LLM-powered agents with SQL/RAG access
- **PostgreSQL**: Agent query store (tables auto-created from node outputs)

See `backend/api/dockerScript.py` for the container orchestration logic with dynamic credential generation.

### Data Flow: Frontend → Backend → Container
1. User saves pipeline JSON → MongoDB (`/save` endpoint)
2. `/spinup` creates Docker network + 3 containers (see `run_pipeline_container()`)
3. `/run` triggers HTTP POST to container's pipeline service `/trigger` endpoint
4. Pipeline service reads `flowchart.json`, validates nodes, topologically sorts, builds Pathway graph, calls `pw.run()`
5. Nodes execute in dependency order, outputs persisted to Postgres for agent access
6. `/stop` gracefully stops `pw.run()`, `/spindown` tears down containers

## Node System (40+ Connectors)

### Node Discovery & Validation
- **Definition**: All nodes inherit `backend/lib/node.py::Node` (Pydantic)
- **Registry**: `backend/lib/utils.py::get_node_class_map()` scans `io_nodes.py`, `tables.py`, `agents/` for classes with `node_id: Literal["xyz"]`
- **Validation**: `backend/pipeline/validate.py::validate_nodes()` parses frontend JSON `data.properties[]` into Pydantic models
- **Execution**: `backend/pipeline/mappings/` maps `node_id` → Pathway function (e.g., `pw.io.kafka.read()`)

### Adding a New Node
1. Define in `backend/lib/io_nodes.py` or `backend/lib/tables.py`:
   ```python
   class MyNode(Node):
       node_id: Literal["my_node"]
       category: Literal["io"]  # or "table"
       n_inputs: Literal[1] = 1
       my_param: str  # node-specific fields
   ```
2. Add mapping in `backend/pipeline/mappings/input_connectors.py` (or similar):
   ```python
   "my_node": {
       "node_fn": lambda inputs, node: pw.io.custom.read(node.my_param)
   }
   ```
3. Frontend: Add schema to sidebar in `frontend/src/utils/dashboard.utils.jsx`

### Critical Validation Rules (see `validate.py`)
- **Only input nodes** (those with `table_schema`) can be sources (no incoming edges)
- Each node must have **exactly `n_inputs` incoming edges** (enforced before execution)
- Alert nodes require input nodes with `trigger_description` field

## Developer Workflows

### Local Development Setup
```bash
# 1. Start Kafka (required for alert system)
docker compose -f backend/kafka-docker-compose.yaml up -d

# 2. Build Docker images
cd backend && docker compose build && cd ..

# 3. Start services
./scripts/local_setup.sh  # Creates venvs, installs deps, starts API (8081) + frontend (8083)
./scripts/local_stop.sh   # Stops all processes (reads PIDs from deploy/pids/)
./scripts/clean_up.sh <PIPELINE_ID>  # Removes Docker containers for specific pipeline
```

**Kafka Setup**: The `kafka-docker-compose.yaml` runs a Kafka service that acts as a centralized message broker for alerts from ALL pipelines. Each pipeline publishes alerts to its topic (`alert_{pipeline_id}`), and the backend's WebSocket endpoint (`/ws/alerts/{pipeline_id}`) consumes from the corresponding topic to stream alerts to the frontend in real-time.

**Critical**: Always run `docker compose build` in `backend/` after changing Dockerfiles or dependencies. Images: `backend-pipeline`, `backend-postgres`, `backend-agentic`.

### Environment Variables (3 .env files required)
- `backend/api/.env`: MongoDB, Kafka, JWT secrets, Docker image names
- `backend/pipeline/.env`: Pathway license, Kafka credentials (note: Postgres vars managed by dockerScript)
- `backend/agentic/.env`: LLM API keys (Groq/OpenAI), Postgres read-only user
- `frontend/.env`: `VITE_API_URL=http://localhost:8081`

Use `.env.template` files as reference. **Never commit real credentials**.

### Testing Nodes
```bash
cd tests/mappings
python -m tests.mappings test_mapping <node_id>  # Tests single node execution with mock data
```

## Authentication System
- **JWT-based** with access (60min) + refresh (30 days) tokens stored in HTTP-only cookies
- `backend/auth/routes.py` handles signup/login/refresh
- Protected endpoints use `Depends(get_current_user)` to extract user from token
- Pipeline ownership tied to `user` field in MongoDB documents

## Agentic System (AI Agents)
- Agents defined in pipeline JSON, sent to agentic service via `/build` endpoint
- **Supervisor pattern**: One supervisor delegates to specialized agents with DB table access
- Tools: SQL queries on Postgres tables (node outputs), RAG (coming soon), custom functions
- Alert nodes use agents to evaluate triggers and generate contextual alerts → Kafka → WebSocket to frontend

Example: Alert node receives trigger data, agent evaluates against `trigger_description`, generates JSON alert, publishes to `alert_{pipeline_id}` Kafka topic.

## Common Patterns

### Pathway Execution Model
- **Lazy evaluation**: Nodes define computation, `pw.run()` executes
- **Streaming-first**: Most nodes process unbounded streams (CSV/JSON use `mode="streaming"`)
- **Persistence**: All table outputs auto-saved to Postgres via `persist_table_to_postgres()` in `graph_builder.py`

### Topological Sorting
Pipeline execution order determined by `toposort_flatten(dependencies)` in `validate.py`. Dependencies built from frontend edges: `{target_idx: [source_idx, ...]}`

### Frontend-Backend Contract
Frontend sends nodes as:
```json
{
  "node_id": "csv",
  "category": "io",
  "data": {
    "properties": [
      {"label": "path", "value": "/data/file.csv"},
      {"label": "table_schema", "value": "{\"id\": \"int\", \"name\": \"str\"}"}
    ]
  }
}
```
Backend parses `properties[]` into flat dict for Pydantic validation.

## Debugging Tips
- **Pipeline logs**: `docker logs <pipeline_id>` (container name = pipeline ID)
- **API logs**: `deploy/logs/api.log` (use `tail -f`)
- **Validation errors**: Check `validate_nodes()` output - Pydantic errors show exact field issues
- **Container issues**: Ensure `ENVIRONMENT=dev` in `backend/api/.env` to mount code volumes (enables hot reload)
- **Pathway errors**: Often related to schema mismatches - check `table_schema` JSON matches actual data

## Project-Specific Conventions
- **Node IDs are Literal types** (e.g., `node_id: Literal["kafka_input"]`) - enables type-safe registry
- **Container names = pipeline IDs** (MongoDB ObjectId) - simplifies management
- **Dynamic ports in production** (`ports={"8000/tcp": None}`), static in dev mode
- **Read/Write Postgres users**: Pipeline gets write access, agentic gets read-only (credentials generated per container)
- **Kafka topics**: Alerts use `alert_{pipeline_id}` pattern for isolation

## Key Files Reference
- `backend/api/main.py`: All HTTP endpoints, Docker orchestration triggers
- `backend/pipeline/__main__.py`: Pipeline execution entrypoint (`pw.run()`)
- `backend/lib/utils.py`: Node registry discovery (`get_node_class_map()`)
- `backend/pipeline/validate.py`: Graph validation rules (topology, input counts)
- `backend/pipeline/graph_builder.py`: Converts validated nodes → Pathway tables
- `backend/api/dockerScript.py`: Container lifecycle (network, 3 services, credentials)
- `frontend/src/pages/Dashboard.jsx`: React Flow canvas, node/edge management

## When Modifying...
- **Add connector**: Update `io_nodes.py` + `mappings/` + frontend sidebar
- **Change validation**: Edit `validate.py` rules, test with `tests/mappings`
- **Update Docker setup**: Rebuild images (`docker compose build`), restart containers
- **Auth changes**: Invalidate tokens via `app.state.revoked_tokens` set in `main.py`
