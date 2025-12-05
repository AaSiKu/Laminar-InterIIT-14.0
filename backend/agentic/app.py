from dotenv import load_dotenv
load_dotenv()
from typing import List, Any
from datetime import datetime, timezone
import logging
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
from langgraph.graph.state import CompiledStateGraph
from .prompts import create_planner_executor, AgentPayload
from .rca.summarize import init_summarize_agent, summarize, SummarizeRequest
from .alerts import generate_alert, AlertRequest
from .rca.analyse import InitRCA, rca
from .report_generation.api.schemas import (
    IncidentReportRequest, 
    IncidentReportResponse, 
    WeeklyReportRequest, 
    WeeklyReportResponse,
    ErrorResponse
)
from .report_generation.core.report_generator import generate_incident_report
from .report_generation.core.weekly_generator import generate_weekly_report

# Configure logging
logger = logging.getLogger(__name__)

planner_executor: CompiledStateGraph = None

# Use OpenAI's o1 reasoning model for complex analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_summarize_agent()
    yield


app = FastAPI(title="Agentic API", lifespan=lifespan)

# ============ API Endpoints ============

@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "message": "Agentic API is running"}

class InferModel(BaseModel):
    agents: List[AgentPayload]
    pipeline_name: str
@app.post("/build")
async def build(request: InferModel):
    global planner_executor
    planner_executor = create_planner_executor(request.agents)

    return {"status": "built"}

@app.post("/generate-alert")
async def generate_alert_route(request: AlertRequest):
    return await generate_alert(request)

@app.post("/summarize")
async def summarize_route(request: SummarizeRequest):
    return await summarize(request)

@app.post("/rca")
async def rca_route(request: InitRCA):
    response= await rca(request)
    return response

class Prompt(BaseModel):
    role: str
    content: str

@app.post("/infer")
async def infer(prompt: Prompt):
    if not planner_executor:
        raise HTTPException(status_code=502, detail="PIPELINE_ID not set in environment")
    answer = await planner_executor.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": prompt.content
                }
            ]
        }
    )
    answer = answer["messages"][-1].content
    return {"status": "ok", "answer": answer}

# ============ Report Generation Endpoints ============

@app.post(
    "/api/v1/reports/incident",
    response_model=IncidentReportResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request data"},
        500: {"model": ErrorResponse, "description": "Report generation failed"}
    },
    summary="Generate Incident Report",
    description=(
        "Generates a detailed incident report using the LangGraph multi-agent workflow. "
        "Takes RCA output from telemetry analysis and produces a comprehensive "
        "markdown report with analysis and recommendations."
    ),
    tags=["incident-reports"]
)
async def create_incident_report(request: IncidentReportRequest):
    """
    Generate an incident report from telemetry-based RCA output.
    
    The report generation process:
    1. Validates input data structure
    2. Executes multi-agent workflow (Planner -> Drafter)
    3. Saves report to file storage
    4. Returns the complete report with metadata
    
    Expected processing time: 15-25 seconds depending on incident complexity.
    """
    start_time = datetime.now()
    
    try:
        # Get primary affected service for logging
        primary_service = (request.rca_output.affected_services[0] 
                          if request.rca_output.affected_services 
                          else "unknown")
        
        logger.info(
            f"Received incident report request for service: {primary_service} "
            f"(severity: {request.rca_output.severity})"
        )
        
        # Convert Pydantic model to dictionary for the core logic
        rca_output = request.rca_output.model_dump(mode='json')
        
        # Generate the report using core business logic
        report_content, metadata = generate_incident_report(
            rca_output=rca_output
        )
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(
            f"Successfully generated report {metadata['report_id']} "
            f"in {processing_time:.2f}s"
        )
        
        # Return structured response
        return IncidentReportResponse(
            success=True,
            report_id=metadata["report_id"],
            report_content=report_content,
            severity=metadata["severity"],
            generated_at=metadata["generated_at"],
            processing_time_seconds=processing_time
        )
        
    except ValueError as e:
        # Configuration or validation errors
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error_type": "ValidationError",
                "message": str(e),
                "details": None
            }
        )
        
    except Exception as e:
        # Unexpected errors during report generation
        logger.error(f"Report generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error_type": "ReportGenerationError",
                "message": "Failed to generate incident report. Please check your input data and try again.",
                "details": {"error": str(e)}
            }
        )


@app.post(
    "/api/v1/reports/weekly",
    response_model=WeeklyReportResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request data"},
        500: {"model": ErrorResponse, "description": "Report generation failed"}
    },
    summary="Generate Weekly Summary Report",
    description=(
        "Generates a weekly summary report that aggregates all incident reports "
        "from the specified date range. Reads from file storage, calculates "
        "statistics, and produces an executive summary with trends and insights."
    ),
    tags=["weekly-reports"]
)
async def create_weekly_report(request: WeeklyReportRequest):
    """
    Generate a weekly summary report for the specified date range.
    
    The report generation process:
    1. Reads incident reports from file storage in the date range
    2. Calculates severity breakdown and trends
    3. Generates executive summary using LLM
    4. Saves report to weekly_reports/ directory
    
    If no incidents occurred during the period, generates an "all-clear" report.
    
    Expected processing time: 10-20 seconds depending on incident count.
    """
    start_time = datetime.now()
    
    try:
        # Normalize dates to UTC timezone if provided
        start_date = request.start_date
        end_date = request.end_date
        
        if start_date and start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        if end_date and end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        
        if start_date and end_date:
            logger.info(
                f"Received weekly report request: {start_date.date()} "
                f"to {end_date.date()}"
            )
            
            # Validate date range
            if end_date < start_date:
                raise ValueError("end_date must be after start_date")
        else:
            logger.info("Received weekly report request for all available reports")
        
        # Generate the weekly report using core business logic
        report_content, metadata = generate_weekly_report(
            start_date=start_date,
            end_date=end_date,
            cleanup_after_report=request.cleanup_after_report
        )
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        cleanup_msg = " (cleanup performed)" if metadata.get('cleanup_performed', False) else ""
        logger.info(
            f"Successfully generated weekly report with {metadata['incident_count']} "
            f"incidents in {processing_time:.2f}s{cleanup_msg}"
        )
        
        # Return structured response
        return WeeklyReportResponse(
            success=True,
            report_content=report_content,
            start_date=metadata["start_date"],
            end_date=metadata["end_date"],
            incident_count=metadata["incident_count"],
            generated_at=metadata["generated_at"],
            processing_time_seconds=processing_time
        )
        
    except ValueError as e:
        # Configuration or validation errors
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error_type": "ValidationError",
                "message": str(e),
                "details": None
            }
        )
        
    except Exception as e:
        # Unexpected errors during report generation
        logger.error(f"Weekly report generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error_type": "WeeklyReportGenerationError",
                "message": "Failed to generate weekly report. Please check your input data and try again.",
                "details": {"error": str(e)}
            }
        )