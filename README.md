# Laminar

In complex data ecosystems, teams need more than functional pipelines. They need guaranteed performance. This is where Service Level Agreements (SLAs) come into play. SLAs provide clear guarantees for data timeliness, accuracy, and availability. Within this platform, SLAs are essential, not an afterthought. Each part: ingestion, transformation, AI inference, or delivery includes SLA definitions. This ensures that each stage meets the targets for latency, throughput, and reliability. The system monitors these metrics, identifies issues in real time, and initiates recovery using smart agents.

This close link between SLA governance and data operations changes Pathway Tasks. They become more than just a workflow builder; they turn into a reliable orchestration layer. It helps users design, deploy, and check real-time data flows confidently. They can trust that SLA compliance is automatically maintained.

From this SLA-driven base, the platform’s technical architecture flows into Pathway’s real-time engine. This engine supports low-latency computation, fault-tolerant streaming, and stateful transformations. The visual builder converts user-defined workflows into efficient, responsive execution graphs. It has built-in monitoring and AI feedback loops. This keeps performance strong under various loads, ensuring each pipeline is robust and adaptable.

## Key Features

### Visual Pipeline Designer
- **Drag-and-Drop Interface**: Build complex data pipelines visually using React Flow
- **Real-time Validation**: Instant feedback on node configurations and connections
- **Dynamic Node System**: Extensible architecture supporting 40+ node types

### Comprehensive Data Connectors
- **Input Sources**: Kafka, Redpanda, CSV, JSON Lines, S3, MinIO, PostgreSQL, MongoDB, Delta Lake, Iceberg, HTTP, Google Drive, and more
- **Output Destinations**: Write to Kafka, databases (PostgreSQL, MySQL, MongoDB), cloud storage, search engines (Elasticsearch), and streaming platforms
- **Streaming & Batch**: Support for both real-time streaming and batch processing

### Advanced Processing
- **Table Operations**: Filter, sort, join, concatenate, and update data streams
- **Temporal Processing**: Sliding windows, tumbling windows, and session-based windowing
- **Custom Transformations**: Extensible node system for custom logic

### AI-Powered Features
- **Agentic Workflows**: LLM-powered agents for intelligent data processing and decision-making
- **Alert Generation**: AI-generated alerts with contextual awareness
- **SQL Agent Integration**: Natural language to SQL query generation

### Enterprise-Ready
- **User Authentication**: JWT-based authentication with role management
- **Multi-User Support**: Individual workspaces and collaborative features
- **Docker Containerization**: Isolated pipeline execution in Docker containers
- **Real-time Monitoring**: WebSocket-based live updates and alerts


##  Prerequisites

- **Python**: 3.9 or higher
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker**: Latest version with Docker Compose
- **PostgreSQL**: 15 or higher (for user authentication)
- **MongoDB**: Running instance (local or cloud)
- **Kafka**: Optional, for streaming capabilities

##  Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <local-repo-location>
```

### 2. Environment Configuration

The project requires environment variables for different services. Create `.env` files in the following directories using the provided templates:

```bash
# Backend API
cp backend/api/.env.template backend/api/.env

# Pipeline Service
cp backend/pipeline/.env.template backend/pipeline/.env

# Agentic Service
cp backend/agentic/.env.template backend/agentic/.env

# Frontend
cp frontend/.env.template frontend/.env
```

Set the required Environment Variables

### 3. Start Kafka (Optional)

If you're using Kafka-based nodes:

```bash
docker compose -f backend/kafka-docker-compose.yaml up -d
```

### 4. Build Docker Images

```bash
cd backend
docker compose build
cd ..
```

### 5. Setup PostgreSQL for User Authentication

The system requires PostgreSQL for user authentication and runbook management.

**Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql@15
brew services start postgresql@15
```

**Create Database and User:**
```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and grant privileges
CREATE DATABASE db;
CREATE USER admin WITH PASSWORD 'admin123';
GRANT ALL PRIVILEGES ON DATABASE db TO admin;
\c db
GRANT ALL ON SCHEMA public TO admin;
\q
```

**Note:** User authentication tables are automatically created when the API server starts.

### 6. Run Setup Script

Make the scripts executable:

```bash
chmod +x scripts/local_setup.sh
chmod +x scripts/stop.sh
chmod +x scripts/clean_up.sh
chmod +x scripts/production_setup.sh
```

Start all services (Development mode):

```bash
./scripts/local_setup.sh
```

This script will:
- Create Python virtual environments
- Install all backend dependencies
- Build required Docker images (pipeline, agentic, postgres)
- Start the API server on port **8081**
- Install frontend dependencies via npm
- Start the frontend dev server on port **8083**
- Start the Contract Parser Agent server
- Save process IDs for easy management

For production deployment:
```bash
./scripts/production_setup.sh
```

### 7. Access the Application

Open your browser and navigate to:
```
http://localhost:8083
```

The application provides:
- Visual workflow designer with drag-and-drop interface
- User authentication (sign up/login) with cookie-based sessions
- Real-time workflow monitoring
- WebSocket-based alerts and notifications
- Overview dashboard with analytics
- Admin panel for user management
## Management Commands

### Stop All Services

**Development mode:**
```bash
./scripts/stop.sh
```

**Production mode:**
```bash
./scripts/production_stop.sh
```

### Clean Up a Pipeline

Remove Docker containers and networks for a specific pipeline:

```bash
./scripts/clean_up.sh <PIPELINE_ID>
```

### View Logs

Development logs are stored in `deploy/logs/` directory:
- `api.log` - API server logs
- `frontend.log` - Frontend server logs
- `contractparseragent.log` - Contract parser agent logs

Production logs:
- `deploy/logs/api_access.log` - API access logs
- `deploy/logs/api_error.log` - API error logs
- `deploy/logs/frontend.log` - Frontend logs

### Docker Images

The system uses three main Docker images for pipeline execution:

1. **backend-pipeline:latest** - Pathway runtime for pipeline execution
2. **backend-agentic:latest** - AI agents for intelligent operations
3. **backend-postgres:latest** - PostgreSQL for agent data storage

Build all images:
```bash
cd backend
docker compose build
cd ..
```

##  Complete Workflow

### 1. User Authentication & Workspace Setup
1. User signs up or logs in via the frontend
2. HttpOnly cookie is set for authenticated API access
3. Session stored in PostgreSQL
4. User workspaces are created in MongoDB

### 2. Workflow Creation & Design
1. User creates a new workflow in the visual designer (Playground component)
2. Drag and drop nodes from the node drawer
3. Connect nodes to define data flow
4. Configure each node's properties using dynamic JSON Schema forms
5. Undo/redo support for all changes
6. Save the workflow configuration to MongoDB

### 3. Workflow Activation (Docker Container Creation)
1. Click "Activate" button in the UI
2. API server receives the workflow ID
3. Docker Compose creates containers with three services:
   - **Pipeline service** (Pathway runtime on port 8000)
   - **Agentic service** (AI agents on port 5333)
   - **PostgreSQL** (for agent queries on port 5432)
4. Container metadata stored in MongoDB:
   - Container ID
   - Service ports and networking
   - Host IP address
   - Workflow status

### 4. Agent Configuration (Optional)
1. If using AI-powered nodes, configure agents via API
2. POST to `/build` with agent definitions:
   - Agent name and description
   - SQL tools (PostgreSQL table access)
   - Master prompts for LLM guidance
3. Agents are initialized in the agentic service container

### 5. Workflow Execution
1. Click "Run" button in the UI
2. API calls the container's `/trigger` endpoint
3. Pipeline service reads `flowchart.json`:
   - Validates all nodes using Pydantic models
   - Performs topological sort for execution order
   - Builds Pathway computational graph
4. Data flows through the workflow:
   - Input nodes read from sources (Kafka, files, databases, APIs)
   - Transformation nodes process data (filter, join, window, aggregate)
   - AI nodes use agents for intelligent processing
   - Alert nodes generate contextual notifications
   - Output nodes write to destinations (Kafka, databases, files)

### 6. Real-time Monitoring
1. WebSocket connection established on `/ws` endpoint
2. Connection health monitored via ping/pong messages
3. Workflow metrics displayed in the UI
4. Alerts, logs, and notifications pushed via WebSocket
5. Automatic reconnection with exponential backoff
6. MongoDB notifications collection tracks all events

### 7. Runbook & Remediation System
1. Errors detected trigger `/runbook/remediate` API endpoint
2. RemediationOrchestrator searches error registry using semantic matching
3. **Confidence-based approval workflow:**
   - **HIGH confidence** : Auto-execute (If none of the actions require individual approval)
   - **MEDIUM confidence** : Requires approval
   - **LOW confidence** : Manual intervention
4. **Per-action approval** for high-risk operations:
   - Actions marked with `requires_approval=True` pause execution
   - User approves via `/runbook/approve/{approval_id}` endpoint
   - Execution resumes from checkpoint after approval
5. Approval requests stored with full state preservation
6. Notifications sent via WebSocket and stored in MongoDB
7. ActionExecutor runs approved actions (SSH, API calls, scripts)
8. SafetyValidator ensures safe execution
9. Results logged and status updates broadcasted

### 8. Contract Parser Agent (SLA-to-Pipeline Conversion)
1. User provides SLA metrics via chat interface
2. Input options:
   - Upload JSON file with metrics
   - Extract metrics from PDF contract
   - Interactive CLI mode
3. Two-phase workflow:
   - **Phase 1:** Negotiate OpenTelemetry span filters
   - **Phase 2:** Build calculation nodes step-by-step with approval
4. Generates `flowchart.json` compatible with main pipeline system
5. User imports generated pipeline into visual designer

### 9. Workflow Stop & Cleanup
1. Click "Stop" button to gracefully shut down workflow
2. Pathway runtime stops processing
3. Containers remain running for quick restart
4. Click "Spin Down" to remove containers completely
5. Use `./scripts/clean_up.sh <PIPELINE_ID>` script to remove containers and networks

### 10. Data Persistence & State
- **MongoDB:** Stores workflows, container metadata, notifications, logs, RCA events, versions
- **PostgreSQL:** User authentication, sessions, runbook actions, agent data
- **Kafka:** Message streaming and alert distribution (optional)
- **Docker volumes:** Persistent storage for workflow data



##  Monitoring & Analytics

- **Real-time Alerts**: WebSocket-based alert notifications with automatic reconnection
- **Workflow Status**: Live monitoring of workflow execution
- **Overview Dashboard**: View workflow metrics, statistics, and performance
- **Admin Analytics**: User management and system-wide metrics


##  Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  - Visual Flow Editor (React Flow)                          │
│  - User Dashboard & Analytics                               │
│  - Real-time Pipeline Monitoring                            │
│  - Approval Request UI                                      │
└───────────────────┬─────────────────────────────────────────┘
                    │ REST API / WebSocket
┌───────────────────┴─────────────────────────────────────────┐
│                   API Server (FastAPI)                      │
│  - Pipeline Management & CRUD                               │
│  - User Authentication (JWT)                                │
│  - Docker Container Orchestration                           │
│  - Schema Validation (Pydantic)                             │
│  - Runbook API & Remediation Orchestrator                   │
└───────────┬─────────────────┬───────────────────────────────┘
            │                 │
    ┌───────┴────────┐   ┌────┴──────────────────┐
    │   MongoDB      │   │  PostgreSQL           │
    │   (Metadata)   │   │  (User Auth & Actions)│
    └────────────────┘   └───────────────────────┘
            │
        ┌───┴──────────────────────────────────────┐
        │                                           │
┌───────▼──────────┐                    ┌──────────▼────────┐
│  Docker Engine   │                    │  Contract Parser  │
│  (Pipeline Exec) │                    │  Agent (WebSocket)│
└───────┬──────────┘                    └───────────────────┘
        │                                   - SLA → Pipeline
    ┌───┴───────────────────────┐           - Chat Interface
    │   Pipeline Container      │           - 2-Phase Workflow
    │   ┌──────────────────┐   │
    │   │ Pipeline Service │   │
    │   │ - Pathway Runtime│   │  <──────┐
    │   └──────────────────┘   │          │
    │   ┌──────────────────┐   │          │
    │   │ Agentic Service  │   │          │
    │   │ - AI Agents      │   │          │
    │   │ - Alert Gen      │───┼──────────┘
    │   │ - RCA System     │   │  Kafka Topics
    │   └──────────────────┘   │
    │   ┌──────────────────┐   │
    │   │ PostgreSQL       │   │
    │   │ - Agent Data     │   │
    │   └──────────────────┘   │
    └───────────────────────────┘
```

### Contract Parser Agent

The Contract Parser Agent is a specialized LLM-powered service that converts SLA metrics from contracts into executable Pathway pipelines:

**Architecture:**
```
┌──────────────────────────────────────────────────┐
│          WebSocket Client (User)                │
│  - Upload SLA metrics (JSON/PDF)                │
│  - Interactive negotiation                      │
└─────────────────┬────────────────────────────────┘
                  │ WebSocket
┌─────────────────▼────────────────────────────────┐
│       Contract Parser Agent Server              │
│  - server.py: WebSocket handler                 │
│  - agent_builder.py: 2-phase builder            │
│  - graph_builder.py: Node generation            │
│  - ingestion.py: PDF/JSON extraction            │
└─────────────────┬────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐    ┌──────▼─────────┐
│ Node Catalog   │    │ Anthropic API  │
│ - 40+ nodes    │    │ - Claude LLM   │
│ - Schemas      │    │ - Planning     │
└────────────────┘    └────────────────┘
        │
        │ Generates
        ▼
┌────────────────────────────────────┐
│       flowchart.json              │
│  - Compatible with main system    │
│  - Import into visual designer    │
└────────────────────────────────────┘
```

**Two-Phase Workflow:**

1. **Phase 1: Input Filter Negotiation**
   - User provides SLA metrics
   - Agent analyzes OpenTelemetry span requirements
   - Interactive chat to define filters
   - Agrees on input data structure

2. **Phase 2: Step-by-Step Pipeline Building**
   - Agent plans calculation nodes
   - Presents each step for approval
   - User can modify or reject steps
   - Generates final flowchart.json

**Usage:**
```bash
# Start server
cd backend/contractparseragent/server
python server.py

# Test client
python test_the_client.py

# Or use CLI mode
cd backend/contractparseragent
python agent_builder.py --metrics_file metrics.json
python agent_builder.py --pdf_path contract.pdf
python agent_builder.py --interactive
```


##  Project Structure

```
pathway-tasks/
├── frontend/                 # React-based UI
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── workflow/   # Workflow canvas (Playground, WorkflowCanvas)
│   │   │   ├── createWorkflow/ # Workflow creation wizard
│   │   │   ├── overview/   # Dashboard overview components
│   │   │   ├── workflowslist/ # Workflow list views
│   │   │   ├── admin/      # Admin panel components
│   │   │   └── common/     # Shared components (sidebar, etc.)
│   │   ├── pages/          # Page components
│   │   │   ├── Login.jsx   # Login page
│   │   │   ├── Signup.jsx  # Signup page
│   │   │   ├── Overview.jsx # Dashboard overview
│   │   │   ├── Workflows.jsx # Workflow editor
│   │   │   ├── WorkflowsList.jsx # Workflow list page
│   │   │   └── Admin.jsx   # Admin panel
│   │   ├── context/        # React context providers
│   │   │   ├── AuthContext.jsx # Authentication state
│   │   │   ├── GlobalContext.jsx # Global app state
│   │   │   └── WebSocketContext.jsx # Real-time connection
│   │   ├── utils/          # Helper functions and API clients
│   │   ├── hooks/          # Custom React hooks (useUndoRedo)
│   │   ├── theme/          # MUI theme configuration
│   │   └── i18n.js         # Internationalization
│   └── package.json
│
├── backend/
│   ├── api/                 # FastAPI server
│   │   ├── main.py         # Main app and lifespan management
│   │   ├── dockerScript.py # Docker management
│   │   └── routers/        # API route modules
│   │       ├── auth/       # Authentication (login, signup, users)
│   │       ├── pipelines.py # Workflow CRUD operations
│   │       ├── run_book.py  # Runbook remediation API
│   │       ├── websocket.py # WebSocket connections
│   │       ├── overview.py  # Dashboard statistics
│   │       ├── rca.py       # Root cause analysis
│   │       └── action.py    # Action execution
│   │
│   ├── pipeline/            # Pipeline execution engine
│   │   ├── __main__.py     # Pipeline orchestration
│   │   ├── server.py       # Pipeline HTTP server
│   │   └── mappings/       # Node type mappings
│   │
│   ├── agentic/             # AI agent service
│   │   └── app.py          # Agent management and execution
│   │
│   ├── Runbook/             # Runbook remediation system
│   │   ├── src/            # Core remediation logic
│   │   │   ├── core/       # Orchestrator, registry, LLM service
│   │   │   ├── execution/  # Action executor, safety validator
│   │   │   ├── services/   # SSH, secrets management
│   │   │   └── agents/     # Discovery agent
│   │   └── Errors_table/   # Error definitions
│   │
│   ├── lib/                 # Core libraries
│   │   ├── io_nodes.py     # Input/output node definitions
│   │   ├── tables.py       # Table operation nodes
│   │   ├── node.py         # Base node class
│   │   └── agents/         # Agent-related nodes
│   │
│   └── contractparseragent/ # SLA-to-Pipeline converter
│       ├── agent_builder.py # Two-phase workflow
│       ├── graph_builder.py # Pipeline generation
│       └── server/          # WebSocket server
│
└── scripts/                 # Deployment scripts
    ├── local_setup.sh
    ├── local_stop.sh
    └── clean_up.sh
```

##  Security

- Cookie-based authentication with HttpOnly cookies
- Session management with PostgreSQL storage
- Password hashing with bcrypt
- Environment-based secrets management
- Isolated Docker execution environments
- Role-based access control (User/Admin)

##  Troubleshooting

### Port Already in Use

If ports 8081 (API) or 8083 (frontend in scripts) are already in use, modify the port numbers in:
- `scripts/local_setup.sh` for API_SERVER_PORT and FRONTEND_PORT
- Frontend Vite dev server uses port 5173 by default (configurable)

### Docker Connection Issues

Ensure Docker daemon is running:
```bash
docker ps
```

### MongoDB Connection Errors

Verify MongoDB is accessible and the connection string in `.env` is correct

### Pathway License Error

Ensure `PATHWAY_LICENSE_KEY` is set in `backend/pipeline/.env`
