# Laminar 

Laminar is a low-code operational intelligence platform designed for fintech startups. It can automatically ingest live data, parse documents, predict SLA risks, perform streaming-based reconciliation and utilize agentic reasoning to provide proactive Root Cause Analysis. It is built on top of Pathway, a high-performance streaming computation engine enabling Laminar to process billions of events with deterministic outputs, ensuring that workflows behave consistently under scale. Laminar aims to bridge market gaps by transforming traditionally manual, slow and reactive peripheral fintech workflows into real-time, automated and intelligent systems

## Key Features

**Visual Pipeline Designer**  
Drag-and-drop interface for building complex data pipelines by connecting pre-configured nodes that uses real-time validation to ensure node schema compatibility while Pathway compiles visual workflows into pipelines. Support for multiple connectors across message queues, databases, cloud storage, and APIs.
 
**Context-Aware Pipeline Generation**  
Upload business documents to the UI and Laminar automatically extracts requirements, thresholds, and obligations to generate fully-configured metric monitoring and processing pipelines. This eliminates manual translation layers, ensuring direct alignment between business commitments and technical implementations.

**Predictive Analytics with Streaming ML**  
Continuous forecasting using online learning models (TiDE, ARF, Mamba) that adapt in real-time to data patterns. The platform predicts threshold breaches in advance, allowing for proactive intervention before issues impact operations and customers. Models update automatically with each data point without manual retraining.

**Autonomous Root Cause Analysis**  
Leveraging the extensive power of agentic AI and Pathway’s compatibility with streaming data sources, our platform gets rid of the need to manually correlate outputs from various tools when an incident occurs, through our Root Cause Analysis agent, which analyses relevant data sources and historical issues to diagnose the root cause. It then suggests
confidence-scored fixes, and executes the ones it is confident about (without the need of human intervention).

**Autonomous Execution of High-Confidence Fixes**
Graduated automation framework that executes high-confidence fixes automatically while escalating ambiguous situations with recommended actions and supporting evidence. Organizations progressively expand automation as confidence builds, balancing efficiency with risk tolerance.

**Production-Ready Guardrails**  
Comprehensive 4-layer security gateway covering network (SSRF, TLS), access (rate limiting, RBAC, BOLA prevention), data (prompt injection detection, PII scanning, secrets detection), and process controls (human-in-the-loop approval, XSS prevention). Sub-200ms overhead maintains real-time responsiveness.

**Distributed Architecture**  
Five-layer architecture with React frontend, FastAPI control layer, Pathway streaming engine in isolated Docker containers, LangGraph-orchestrated agentic services, and multi-database persistence (PostgreSQL, MongoDB, vector search). Sub-second end-to-end latency with exactly-once processing semantics.

---

##  Prerequisites

- **Python**: 3.9 or higher
- **Node.js**: v22.11.0 or higher
- **npm**: v10.8.0 or higher
- **Docker**: Latest version with Docker Compose
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

### 5. Run Setup Script

Make the scripts executable:

```bash
chmod +x scripts/local_setup.sh
chmod +x scripts/local_stop.sh
chmod +x scripts/clean_up.sh
```

Start all services:

```bash
./scripts/local_setup.sh
```

This script will:
- Create Python virtual environments
- Install all dependencies
- Start the API server on port **8081**
- Start the frontend dev server on port **8083**
- Save process IDs for easy management

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:8083
```
## Management Commands

### Stop All Services

```bash
./scripts/local_stop.sh
```

### Clean Up a Pipeline

Remove Docker containers and networks for a specific pipeline:

```bash
./scripts/clean_up.sh <PIPELINE_ID>
```

### View Logs

Logs are stored in `logs/` directory:
- `api.log` - API server logs
- `frontend.log` - Frontend server logs



##  Monitoring & Analytics

- **Real-time Alerts**: WebSocket-based alert notifications
- **Pipeline Status**: Live monitoring of pipeline execution
- **Analytics Dashboard**: View pipeline metrics and performance


##  Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  - Visual Flow Editor (React Flow)                          │
│  - User Dashboard & Analytics                               │
│  - Real-time Pipeline Monitoring                            │
└───────────────────┬─────────────────────────────────────────┘
                    │ REST API / WebSocket
┌───────────────────┴─────────────────────────────────────────┐
│                   API Server (FastAPI)                      │
│  - Pipeline Management                                      │
│  - User Authentication                                      │
│  - Docker Container Orchestration                           │
│  - Schema Validation (Pydantic)                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴──────────┬───────────────────┐
        │                      │                   │
┌───────▼──────┐   ┌──────────▼────────┐  ┌──────▼───────────┐
│   MongoDB    │   │  Docker Engine    │  │ Kafka Cluster    │
│  (Metadata)  │   │  (Pipeline Exec)  │  │  (Streaming)     │
└──────────────┘   └──────────┬────────┘  └──────────────────┘
                              │
                   ┌──────────▼────────────┐
                   │  Pipeline Container   │
                   │  - Pathway Runtime    │
                   │  - Node Execution     │
                   │  - Agentic Service    │
                   └───────────────────────┘
```


##  Project Structure

```
pathway-tasks/
├── frontend/                 # React-based UI
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context providers
│   │   └── utils/          # Helper functions and API clients
│   └── package.json
│
├── backend/
│   ├── api/                 # FastAPI server
│   │   ├── main.py         # API routes and endpoints
│   │   └── dockerScript.py # Docker management
│   │
│   ├── pipeline/            # Pipeline execution engine
│   │   ├── __main__.py     # Pipeline orchestration
│   │   ├── mappings.py     # Node type to function mapping
│   │   └── server.py       # Pipeline HTTP server
│   │
│   ├── agentic/             # AI agent service
│   │   └── app.py          # Agent management and execution
│   │
│   ├── lib/                 # Core libraries
│   │   ├── io_nodes.py     # Input/output node definitions
│   │   ├── tables.py       # Table operation nodes
│   │   ├── alert.py        # Alert system nodes
│   │   ├── validate.py     # Schema validation
│   │   └── node.py         # Base node class
│   │
│   └── auth/                # Authentication system
│       ├── routes.py       # Auth endpoints
│       └── utils.py        # JWT utilities
│
└── scripts/                 # Deployment scripts
    ├── local_setup.sh
    ├── local_stop.sh
    └── clean_up.sh
```

##  Security

- JWT-based authentication
- Token refresh mechanism
- Password hashing with bcrypt
- Environment-based secrets management
- Isolated Docker execution environments

##  Troubleshooting

### Port Already in Use

If ports 8081 or 8083 are already in use, modify the port numbers in `scripts/local_setup.sh`

### Docker Connection Issues

Ensure Docker daemon is running:
```bash
docker ps
```

### MongoDB Connection Errors

Verify MongoDB is accessible and the connection string in `.env` is correct

### Pathway License Error

Ensure `PATHWAY_LICENSE_KEY` is set in `backend/pipeline/.env`
