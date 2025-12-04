# Report Generation Agent

AI-powered incident report generation system using LangGraph multi-agent workflow and Pathway document store with vector search capabilities.

## Overview

This system generates comprehensive incident reports from RCA (Root Cause Analysis) data and creates weekly summaries with trend analysis. It uses:

- **LangGraph**: Multi-agent workflow (Planner → ChartGen → Drafter)
- **Google Gemini**: LLM for report generation
- **Pathway DocumentStore**: Vector search with Cohere embeddings
- **FastAPI**: REST API endpoints for integration

## Architecture

```
report generation agent/
├── api/                      # FastAPI application
│   ├── main.py              # API entry point
│   ├── routes/              # API endpoints
│   └── schemas/             # Request/response models
├── core/                     # Business logic
│   ├── report_generator.py  # Incident report generation
│   └── weekly_generator.py  # Weekly summary generation
├── agents/                   # LLM agents
│   ├── planner_agent.py     # Report structure planning
│   ├── chart_gen_agent.py   # Mermaid diagram generation
│   ├── drafter_agent.py     # Final report drafting
│   └── weekly_summarizer_agent.py  # Weekly summaries
├── langgraph_workflow/       # Multi-agent workflow orchestration
├── examples/                 # Sample API requests
├── reports/                  # Generated incident reports (auto-created)
└── weekly_reports/           # Generated weekly summaries (auto-created)
```

## Prerequisites

- Python 3.13+
- Google Gemini API key
- Cohere API key (for embeddings)

## Installation

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Configure environment variables**:
Create a `.env` file in the project root:
```env
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_MODEL=gemini-pro
COHERE_API_KEY=your_cohere_api_key_here
```

## Usage

### Starting the API Server

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8085
```

API will be available at: `http://localhost:8085`  
Interactive docs at: `http://localhost:8085/docs`

### API Endpoints

#### 1. Generate Incident Report

**POST** `/api/v1/reports/incident`

Generates a detailed incident report from pipeline topology and RCA data.

**Request Body**:
```json
{
  "pipeline_topology": {
    "pipeline_name": "Your Pipeline",
    "steps": [
      {
        "step_id": "node-001",
        "step_name": "Node Name",
        "step_type": "transformation",
        "dependencies": []
      }
    ]
  },
  "rca_output": {
    "incident_id": "INC-2025-12-03-0847",
    "incident_time": "2025-12-03T08:47:00Z",
    "severity": "critical",
    "root_cause": "Memory leak in transformation node",
    "affected_components": [
      {
        "component_name": "transform-001",
        "impact_level": "critical",
        "error_details": "P99 latency spike to 342ms"
      }
    ],
    "resolution_steps": [
      "Rollback to v1.2",
      "Increase memory allocation"
    ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "report_content": "# Incident Report\n...",
  "report_id": "incident_20251203_084700_critical",
  "incident_id": "INC-2025-12-03-0847",
  "severity": "critical",
  "generated_at": "2025-12-03T08:47:00Z",
  "processing_time_seconds": 25.3
}
```

#### 2. Generate Weekly Report

**POST** `/api/v1/reports/weekly`

Generates a weekly summary report from all stored incidents.

**Request Body**:
```json
{
  "start_date": "2025-11-27T00:00:00Z",  // Optional - null for all reports
  "end_date": "2025-12-03T23:59:59Z",    // Optional - null for all reports
  "cleanup_after_report": false           // Set to true to delete reports after generation
}
```

**Response**:
```json
{
  "success": true,
  "report_content": "# Weekly Operational Report\n...",
  "start_date": "2025-11-27T00:00:00Z",
  "end_date": "2025-12-03T23:59:59Z",
  "incident_count": 7,
  "generated_at": "2025-12-04T00:00:00Z",
  "processing_time_seconds": 12.5
}
```

**Cleanup Mode**: Set `cleanup_after_report: true` to automatically delete all incident reports after generating the weekly summary. This is useful for periodic cleanup after archiving.

## Examples

Sample request files are provided in `examples/`:
- `incident_request_example.json` - Memory leak scenario
- `incident_request_database_issue.json` - Database connection pool exhaustion
- `incident_request_network_throttling.json` - S3 throttling
- `incident_request_ml_model_failure.json` - Corrupted ML model
- `incident_request_cache_issue.json` - Stale cache configuration

**Test with curl**:
```bash
curl -X POST http://localhost:8085/api/v1/reports/incident \
  -H "Content-Type: application/json" \
  -d @examples/incident_request_example.json
```

## Document Store

The system uses Pathway DocumentStore for:
- **Vector Search**: Cohere embeddings (1024 dimensions)
- **Streaming Monitoring**: Auto-indexes new reports in real-time
- **Duplicate Filtering**: Keeps only unique incidents by incident_id

Reports are stored in `reports/` directory with metadata tracking in `reports/metadata.jsonl`.

## Report Features

### Incident Reports Include:
- Executive summary
- Root cause analysis
- Mermaid diagrams (pipeline topology with affected nodes)
- Impact assessment
- Resolution steps
- Timeline reconstruction
- Recommendations

### Weekly Reports Include:
- Executive summary
- Incident statistics and trends
- Critical incident details with root causes
- Most affected components
- Pattern analysis
- Recommendations for next week
- Pipeline health overview

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes | - | Google Gemini API key |
| `GOOGLE_MODEL` | No | `gemini-pro` | Gemini model to use |
| `COHERE_API_KEY` | Yes | - | Cohere API key for embeddings |

### API Server Settings

Edit `api/main.py` to configure:
- CORS origins (default: all allowed)
- Port (default: 8085)
- Logging level (default: INFO)

## Integration Guide

### Adding to Your Project

1. Copy the `report generation agent` folder to your project
2. Install dependencies: `pip install -r requirements.txt`
3. Set up environment variables in your deployment
4. Start the API server or import the core modules

### Programmatic Usage

```python
from core.report_generator import generate_incident_report
from core.weekly_generator import generate_weekly_report

# Generate incident report
report_content, metadata = generate_incident_report(
    pipeline_topology=topology_dict,
    rca_output=rca_dict
)

# Generate weekly report
weekly_content, metadata = generate_weekly_report(
    start_date=datetime(2025, 11, 27),
    end_date=datetime(2025, 12, 3),
    cleanup_after_report=False
)
```

### Docker Deployment

```dockerfile
FROM python:3.13-slim

WORKDIR /app
COPY . /app

RUN pip install -r requirements.txt

EXPOSE 8085

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8085"]
```

## Development

### Project Structure

- **`api/`**: FastAPI routes and schemas (REST API layer)
- **`core/`**: Business logic (report generation workflows)
- **`agents/`**: LLM agents (Planner, ChartGen, Drafter, Summarizer)
- **`langgraph_workflow/`**: Multi-agent orchestration
- **`document_store_manager.py`**: Pathway DocumentStore integration

### Adding New Features

1. **New Agent**: Create in `agents/`, implement prompt and LLM call
2. **New Endpoint**: Add route in `api/routes/`, define schema in `api/schemas/`
3. **New Report Type**: Extend workflow in `langgraph_workflow/`

## Troubleshooting

### Common Issues

**"GOOGLE_API_KEY not found"**
- Ensure `.env` file exists with valid API key
- Check environment variables are loaded

**"JSON cannot be partitioned" (Pathway error)**
- This was fixed - Pathway now only monitors `.md` files, not `metadata.jsonl`

**"can't compare offset-naive and offset-aware datetimes"**
- This was fixed - dates are now normalized to UTC timezone

**Weekly report shows "Unknown" for everything**
- This was fixed - reports now parse full markdown content for rich data

**Duplicate incidents in weekly report**
- This was fixed - duplicate filtering by incident_id is now implemented

## Performance

- **Incident Report Generation**: 25-30 seconds (includes LLM calls and Mermaid chart generation)
- **Weekly Report Generation**: 10-15 seconds (depends on number of incidents)
- **Vector Search**: < 1 second (Pathway with Cohere embeddings)

## License

Internal use only - check with your team for licensing details.

## Support

For issues or questions, contact the DevOps team or check the project documentation.
