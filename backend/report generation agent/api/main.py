"""
FastAPI application entry point.
Configures and runs the report generation API service.
"""

import logging
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import incident_reports, weekly_reports
from api.schemas import HealthCheckResponse

# Load environment variables from unified agentic .env file
unified_env_path = Path(__file__).parent.parent.parent / "agentic" / ".env"
load_dotenv(dotenv_path=unified_env_path)

# Also load local .env if it exists (for overrides)
local_env_path = Path(__file__).parent.parent / ".env"
if local_env_path.exists():
    load_dotenv(dotenv_path=local_env_path, override=False)

# Configure basic console logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Report Generation API",
    description=(
        "REST API for generating incident reports and weekly summaries "
        "using LangGraph multi-agent workflow and LLM analysis."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS to allow requests from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Register route handlers
app.include_router(incident_reports.router)
app.include_router(weekly_reports.router)


@app.get(
    "/health",
    response_model=HealthCheckResponse,
    tags=["health"],
    summary="Health Check",
    description="Check if the API service is running and healthy."
)
async def health_check():
    """
    Health check endpoint to verify service availability.
    Returns basic service status and version information.
    """
    return HealthCheckResponse(
        status="healthy",
        timestamp=datetime.now(),
        version="1.0.0"
    )


@app.get(
    "/",
    tags=["info"],
    summary="API Information",
    description="Get basic information about the API service."
)
async def root():
    """
    Root endpoint providing API information and navigation.
    """
    return {
        "service": "Report Generation API",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/docs",
        "endpoints": {
            "health": "/health",
            "incident_reports": "/api/v1/reports/incident",
            "weekly_reports": "/api/v1/reports/weekly"
        }
    }


# Startup and shutdown event handlers
@app.on_event("startup")
async def startup_event():
    """
    Execute tasks on application startup.
    """
    logger.info("Starting Report Generation API on port 8085")
    logger.info("Documentation available at http://localhost:8085/docs")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Execute cleanup tasks on application shutdown.
    """
    logger.info("Shutting down Report Generation API")


if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8085,
        reload=True,
        log_level="info"
    )
