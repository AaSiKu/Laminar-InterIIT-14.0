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
- **Node.js**: v22.11.0 or higher
- **npm**: v10.8.0 or higher
- **Docker**: Latest version with Docker Compose
- **MongoDB**: Running instance (local or cloud)
- **Kafka**: Optional, for streaming capabilities

##  Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pathway-tasks
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

**Required Environment Variables:**

- `PATHWAY_LICENSE_KEY`: Your Pathway license key
- `MONGO_URI`: MongoDB connection string
- `KAFKA_BOOTSTRAP_SERVER`: Kafka broker address (if using Kafka)
- `GROQ_API_KEY`: API key for LLM services
- `SECRET_KEY`: JWT secret for authentication
- `OPENAI_API_KEY`: Optional, for OpenAI integrations

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
