The backend service for the Pathway Tasks platform, built with FastAPI and Pathway. This service handles pipeline orchestration, user authentication, Docker container management, and AI-powered agentic workflows.

##  Architecture Overview

The backend consists of four main components:

### 1. API Service (`api/`)
The main FastAPI application that serves as the central API gateway.

**Responsibilities:**
- User authentication and authorization (JWT-based)
- Pipeline CRUD operations
- Docker container lifecycle management
- Schema validation and node type registry
- WebSocket connections for real-time alerts
- MongoDB integration for metadata storage

**Key Files:**
- `main.py` - FastAPI application with all endpoints
- `dockerScript.py` - Docker container management utilities
- `requirements.txt` - Python dependencies

### 2. Pipeline Service (`pipeline/`)
The core pipeline execution engine that runs inside Docker containers.

**Responsibilities:**
- Reading and parsing pipeline JSON configurations
- Topological sorting of pipeline graphs
- Dynamic node execution using Pathway
- Real-time data processing
- HTTP server for pipeline control (start/stop)

**Key Files:**
- `__main__.py` - Pipeline orchestration and execution
- `mappings.py` - Node type to Pathway function mappings
- `server.py` - FastAPI server for pipeline control
- `requirements.txt` - Pipeline-specific dependencies

### 3. Agentic Service (`agentic/`)
AI-powered agent management system for intelligent pipeline operations.

**Responsibilities:**
- LLM-based agent creation and management
- Agentic tool integration (SQL, RAG, custom)
- Alert generation with contextual awareness and targeting low latency
- Multi-agent coordination with supervisor pattern, and inter workflow communication

**Key Files:**
- `app.py` - FastAPI application for agent services
- `requirements.txt` - AI/ML dependencies

### 4. Core Libraries (`lib/`)
Shared libraries and node definitions used across services.

**Key Modules:**
- `io_nodes.py` - Input/output connector node definitions (40+ connectors)
- `tables.py` - Table operation node definitions
- `alert.py` - Alert system node definitions
- `validate.py` - Schema validation and node registry
- `node.py` - Base node class and interfaces
- `agent.py` - Agent configuration models
- `rag.py` - RAG (Retrieval Augmented Generation) nodes
- `tools.py` - Custom tool definitions

##  Node Types

### Input Connectors (25+)
Data source integrations for reading data into pipelines:

- **Message Queues**: Kafka, Redpanda, NATS, MQTT
- **Databases**: PostgreSQL, MySQL, MongoDB, SQLite
- **Cloud Storage**: S3, MinIO, Google Drive
- **Data Lakes**: Delta Lake, Iceberg
- **Files**: CSV, JSON Lines, Plain Text
- **Streaming**: Kinesis, Debezium, Airbyte
- **Web**: HTTP/REST endpoints
- **Custom**: Python connector for custom sources

### Output Connectors (20+)
Data destination integrations for writing pipeline results:

- **Message Queues**: Kafka, Redpanda, NATS, MQTT
- **Databases**: PostgreSQL, MySQL, MongoDB, DynamoDB
- **Search**: Elasticsearch
- **Cloud Services**: BigQuery, Pub/Sub, Kinesis
- **Files**: CSV, JSON Lines
- **Monitoring**: Logstash, QuestDB

### Table Operations (10+)
Data transformation and manipulation nodes:

- **Filter**: Apply conditions to filter rows
- **Sort**: Sort data by columns
- **Join**: Join two tables (inner, left, right, outer)
- **Concat**: Concatenate two tables
- **Update Rows**: Update existing rows with new data

### Temporal Operations
Time-based windowing for streaming data:

- **Sliding Window**: Overlapping time windows
- **Tumbling Window**: Non-overlapping fixed windows
- **Session Window**: Gap-based session windows

### AI Operations
- **Alert Node**: AI-generated contextual alerts
- **RAG Node**: (Coming soon) Retrieval Augmented Generation

## Pipeline Execution Flow

```
1. User saves pipeline JSON → MongoDB
                              ↓
2. User triggers "Spin Up" → API creates Docker container
                              ↓
3. Container starts with:
   - Pipeline service (Pathway runtime)
   - Agentic service (AI agents)
   - PostgreSQL (for agent data access)
                              ↓
4. User triggers "Run" → API calls container's /trigger endpoint
                              ↓
5. Pipeline service:
   a. Reads flowchart.json
   b. Validates nodes using Pydantic models
   c. Performs topological sort
   d. Builds Pathway computational graph
   e. Executes: pw.run()
                              ↓
6. Pipeline processes data in real-time
   - Nodes execute in dependency order
   - Data flows through transformations
   - AI agents process as needed
                              ↓
7. User triggers "Stop" → Pipeline gracefully shuts down
                              ↓
8. User triggers "Spin Down" → Container removed
```

## Getting Started

### Prerequisites

```bash
# Python 3.9+
python --version

# Docker
docker --version

# MongoDB (running)
mongosh --version

#postgresql 
psql --version   
```

<!-- TODO : Add link to local setup -->
### Installation 
>Needed only when testing standalone - else refer local_setup
1. **Install API dependencies:**

```bash
cd backend/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment variables:**

```bash
# backend/api/.env
MONGO_URI=mongodb://localhost:27017
MONGO_DB=pathway_tasks
SECRET_KEY=your-secret-key-here
GROQ_API_KEY=your-groq-api-key
PATHWAY_LICENSE_KEY=your-pathway-license
KAFKA_BOOTSTRAP_SERVER=localhost:9092

# PostgreSQL for user authentication
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=db
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
```

3. **Setup PostgreSQL for user authentication:**

```bash
# Install PostgreSQL (if not installed)
sudo apt install postgresql postgresql-contrib  # Ubuntu/Debian
# or: brew install postgresql@15  # macOS

# Create database and user
sudo -u postgres psql
CREATE DATABASE db;
CREATE USER admin WITH PASSWORD 'admin123';
GRANT ALL PRIVILEGES ON DATABASE db TO admin;
\c db
GRANT ALL ON SCHEMA public TO admin;
\q
```

**Note:** User tables are automatically created when you start the API server. For manual setup, see `backend/auth/README.md`.

4. **Build Docker images:**

```bash
cd backend
docker compose build
```

### Running the API Service

```bash
cd backend/api
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8081 --reload
```

API will be available at: `http://localhost:8081`

Interactive API docs: `http://localhost:8081/docs`

##  API Endpoints

### Authentication (`/auth/`)

```
POST   /auth/signup          - Register new user
POST   /auth/login           - Login and get JWT token
POST   /auth/refresh         - Refresh access token
POST   /auth/logout          - Logout (invalidate token)
GET    /auth/me              - Get current user info
```

### Schema (`/schema/`)

```
GET    /schema/all           - List all available node types
GET    /schema/{node_name}   - Get JSON schema for specific node
```

### Pipeline Management

```
POST   /save                 - Save or update pipeline
POST   /retrieve             - Get pipeline by ID
POST   /spinup               - Create Docker container for pipeline
POST   /spindown             - Stop and remove pipeline container
POST   /run                  - Start pipeline execution
POST   /stop                 - Stop pipeline execution
```

### Real-time Alerts

```
WS     /ws/alerts/{pipeline_id}  - WebSocket for live alerts
```

##  Adding Custom Nodes

### Step 1: Define Node Schema

Create a new Pydantic model in `lib/io_nodes.py` (for I/O) or `lib/tables.py` (for transformations):

```python
# backend/lib/tables.py

from typing import Literal
from .node import Node

class MyCustomNode(Node):
    node_id: Literal["my_custom"]
    category: Literal["table"]
    n_inputs: Literal[1] = 1
    
    # Node-specific parameters
    threshold: float
    column_name: str
```

### Step 2: Add Pathway Function Mapping

Add the node's execution logic in `pipeline/mappings.py`:

```python
# backend/pipeline/mappings.py

table_mappings: dict[str, MappingValues] = {
    # ... existing mappings
    
    "my_custom": {
        "node_fn": lambda inputs, node: inputs[0].select(
            *pw.this,
            custom_result=pw.this[node.column_name] * node.threshold
        ),
    },
}
```

### Step 3: Update Frontend

Add the new node to the frontend sidebar and configure its UI (see `frontend/README.md`).

### Step 4: Test

Create a pipeline using your new node and verify it executes correctly.

##  Validation System

The validation system uses Pydantic models to ensure pipeline configurations are correct before execution.

### How Validation Works

1. **Node Registry**: `validate.py` scans `io_nodes.py` and `tables.py` to build a map of `node_id → Pydantic Class`

2. **Validation Function**: `validate_nodes()` takes a list of node dictionaries from the frontend

3. **Schema Checking**: For each node:
   - Looks up the appropriate Pydantic model
   - Extracts properties from the JSON structure
   - Instantiates the model (triggers validation)
   - Returns validated node objects or raises errors

### Example Usage

```python
from backend.lib.utils import validate_nodes

nodes_data = [
    {
        "node_id": "csv",
        "category": "io",
        "data": {
            "properties": [
                {"label": "path", "value": "/data/input.csv"},
                {"label": "table_schema", "value": '{"id": "int", "name": "str"}'}
            ]
        }
    }
]

validated = validate_nodes(nodes_data)
# Returns list of validated node objects
```

##  Agentic System

The agentic system enables AI-powered operations within pipelines.

### Agent Architecture

```
Supervisor Agent
    ├── Data Agent 1 (SQL access)
    ├── Data Agent 2 (RAG access)
    └── Custom Agent N
```

### Creating Agents

Agents are configured per pipeline with:
- **Name**: Unique identifier
- **Description**: What the agent does
- **Master Prompt**: System instructions
- **Tools**: Database tables, custom functions, or RAG stores

### Agent Tools

1. **SQL Tools**: Query PostgreSQL tables
2. **RAG Tools**: (Coming soon) Query document stores
3. **Custom Tools**: User-defined functions

### Alert Generation

Alerts use a specialized agent that:
1. Receives trigger data from pipeline
2. Evaluates against alert prompt
3. Generates structured alert (type + message)
4. Publishes to Kafka topic
5. WebSocket pushes to frontend

##  Docker Container Structure

Each pipeline runs in an isolated Docker container with:

```
Container:
├── Pipeline Service (port: dynamic)
│   └── Pathway runtime executing the workflow
├── Agentic Service (port: dynamic)
│   └── AI agents for intelligent operations
└── PostgreSQL (port: dynamic)
    └── Database for agent SQL queries
```

The API server manages containers using Docker SDK:
- Creates containers with unique names
- Maps random host ports to avoid conflicts
- Stores container metadata in MongoDB
- Provides lifecycle management (start/stop/remove)

##  Database Schema

### MongoDB Collections

**pipelines** (workflow metadata):
```json
{
  "_id": "ObjectId",
  "user": "user_id",
  "path": "Workflow Name",
  "pipeline": { /* JSON configuration */ },
  "container_id": "docker_container_id",
  "pipeline_host_port": 8001,
  "agentic_host_port": 8002,
  "db_host_port": 5433,
  "host_ip": "192.168.1.100",
  "status": "Stopped"
}
```

**users** (authentication) - stored in PostgreSQL:
- `id` (Integer, Primary Key)
- `email` (String, Unique)
- `hashed_password` (String, bcrypt)
- `full_name` (String, Optional)
- `is_active` (Boolean)
- `created_at` (DateTime)

Tables are automatically created on server startup.

### PostgreSQL

**User Authentication** (`users` table):
- Automatically created when API server starts
- Stores user credentials for authentication
### PostgreSQL (Agent Data)

Tables are dynamically created based on pipeline output schemas. Agents can query these tables using natural language.

##  Security

### Authentication Flow

1. User registers: `POST /auth/signup`
   - Password hashed with bcrypt
   - User stored in PostgreSQL

2. User logs in: `POST /auth/login`
   - Credentials verified
   - JWT access token (60 min) + refresh token (30 days) issued

3. Protected requests:
   - Include: `Authorization: Bearer <access_token>`
   - API validates JWT signature and expiration

4. Token refresh: `POST /auth/refresh`
   - Exchange refresh token for new access token

### Best Practices

- Store tokens in HTTP-only cookies (production)
- Use HTTPS in production
- Rotate secret keys regularly
- Implement rate limiting
- Validate all user inputs
- Sanitize database queries

##  Performance Considerations

### Pipeline Optimization

1. **Node Ordering**: Topological sort ensures optimal execution
2. **Lazy Evaluation**: Pathway uses lazy evaluation for efficiency
3. **Streaming**: Built for continuous data processing
4. **Parallelization**: Pathway handles parallel execution automatically

### Scaling

- **Horizontal**: Run multiple API servers behind load balancer
- **Vertical**: Increase Docker container resources
- **Database**: Use MongoDB replica sets for HA
- **Kafka**: Scale Kafka cluster for high throughput


