from dotenv import load_dotenv
load_dotenv()
from typing import List, Any, Optional, Dict
from datetime import datetime, timezone
import logging
import os
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
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

logger = logging.getLogger(__name__)
# Runbook imports
try:
    from .runbook_src.core.remediation_orchestrator import RemediationOrchestrator
    from .runbook_src.core.llm_suggestion_service import LLMSuggestionService
    from .runbook_src.execution.execution_engine import ActionExecutor
    from .runbook_src.core.runbook_registry import RunbookRegistry, RemediationAction
    from .runbook_src.execution.safety_validator import SafetyValidator
    from .runbook_src.services.secrets_manager import SecretsManager, get_secrets_manager
    from .runbook_src.services.ssh_client import SSHClientFactory
    from .runbook_src.agents.llm_discovery_agent import LLMDiscoveryAgent, RegistryIntegration
    RUNBOOK_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Runbook modules not available: {e}")
    RUNBOOK_AVAILABLE = False

# Configure logging

planner_executor: CompiledStateGraph = None

# Runbook global instances
orchestrator: Optional[Any] = None
discovery_agent: Optional[LLMDiscoveryAgent] = None
registry: Optional[Any] = None

# Use OpenAI's o1 reasoning model for complex analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    global orchestrator, discovery_agent, registry
    
    # Initialize existing agentic components
    await init_summarize_agent()
    
    # Initialize runbook components if available
    if RUNBOOK_AVAILABLE:
        try:
            logger.info("Initializing runbook components...")
            
            # Initialize SSH client factory for discovery
            ssh_factory = SSHClientFactory(max_connections_per_host=3)
            
            def ssh_client_factory(host: str, credentials: Dict[str, Any]):
                port = int(credentials.get('port', 22)) if credentials.get('port') else 22
                return ssh_factory.create_client(
                    host=host,
                    credentials=credentials,
                    port=port,
                    timeout=30
                )
            
            # Initialize discovery agent with SSH support
            discovery_agent = LLMDiscoveryAgent(ssh_client_factory=ssh_client_factory)
            logger.info("Discovery agent initialized successfully")
            
            # Try to initialize DB components (optional)
            try:
                db_url = os.getenv("RUNBOOK_DATABASE_URL", os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:mysecretpassword@localhost:5432/postgres"))
                
                registry = RunbookRegistry(database_url=db_url)
                await registry.initialize()
                
                validator = SafetyValidator(otel_client=None, metrics_client=None)
                secrets_mgr = SecretsManager()
                executor = ActionExecutor(validator, secrets_mgr, None)
                
                try:
                    suggestion_service = LLMSuggestionService()
                    logger.info("LLM suggestion service initialized")
                except Exception as llm_error:
                    logger.warning(f"Could not initialize LLM suggestion service: {llm_error}")
                    suggestion_service = None
                
                pathway_url = os.getenv("PATHWAY_API_URL", "http://localhost:8000")
                orchestrator = RemediationOrchestrator(
                    pathway_api_url=pathway_url,
                    runbook_registry=registry,
                    action_executor=executor,
                    confidence_thresholds={'high': 0.3, 'medium': 0.5},
                    suggestion_service=suggestion_service
                )
                logger.info("Runbook orchestrator initialized successfully")
                
            except Exception as db_error:
                logger.warning(f"Could not initialize orchestrator (DB may not be ready): {db_error}")
                logger.info("Discovery endpoints will still work without orchestrator")
        
        except Exception as e:
            logger.error(f"Failed to initialize runbook components: {e}")
    
    yield
    
    logger.info("Shutting down...")


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


# ============ Runbook Remediation Endpoints ============

if RUNBOOK_AVAILABLE:
    # Runbook Request/Response Models
    class RemediationRequest(BaseModel):
        error_message: str = Field(..., description="Error message to remediate")
        auto_execute: bool = Field(True, description="Auto-execute high confidence matches")
        require_approval_medium: bool = Field(True, description="Require approval for medium confidence")

    class ApprovalRequest(BaseModel):
        request_id: str = Field(..., description="Approval request ID")
        approved_by: str = Field(default="api_user", description="Who approved the request")

    class ActionSuggestionItem(BaseModel):
        action_id: str
        reason: str

    class ErrorSuggestion(BaseModel):
        error_name: str
        description: str
        suggested_actions: List[ActionSuggestionItem]
        confidence_reasoning: str
        feasible: bool
        additional_actions_needed: Optional[str] = None

    class RemediationResponse(BaseModel):
        status: str
        error: str
        matched_error: Optional[str] = None
        distance: Optional[float] = None
        confidence: Optional[str] = None
        actions_executed: Optional[int] = None
        execution_results: Optional[List[Dict[str, Any]]] = None
        overall_success: Optional[bool] = None
        message: Optional[str] = None
        request_id: Optional[str] = None
        actions: Optional[List[str]] = None
        description: Optional[str] = None
        suggestion: Optional[ErrorSuggestion] = None

    class RunbookHealthResponse(BaseModel):
        status: str
        pathway_api: str
        timestamp: str

    class ManualActionRequest(BaseModel):
        action_id: str = Field(..., description="Unique action identifier")
        service: str = Field(..., description="Service name")
        method: str = Field(..., description="Execution method")
        definition: str = Field(..., description="Action description")
        risk_level: str = Field(..., description="Risk level")
        requires_approval: bool = Field(False, description="Requires approval")
        execution: Dict[str, Any] = Field(default_factory=dict)
        parameters: Dict[str, Any] = Field(default_factory=dict)
        secrets: List[str] = Field(default_factory=list)
        action_metadata: Dict[str, Any] = Field(default_factory=dict)

    class DiscoverSwaggerRequest(BaseModel):
        swagger_url: Optional[str] = None
        swagger_doc: Optional[Dict[str, Any]] = None
        service_name: str

    class DiscoverScriptsRequest(BaseModel):
        scripts: List[Dict[str, str]]
        service_name: str

    class DiscoverSSHRequest(BaseModel):
        host: str
        scripts_path: str
        credentials: Dict[str, str]
        service_name: str

    class DiscoverDocsRequest(BaseModel):
        documentation: str
        service_name: str

    class SecretDefinition(BaseModel):
        key: str
        description: str
        source: str
        required: bool
        value: Optional[str] = None

    class SecretsProvisionRequest(BaseModel):
        service_name: str
        secrets: List[SecretDefinition]

    class SecretsProvisionResponse(BaseModel):
        status: str
        secrets_saved: int
        secrets_skipped: int
        errors: Optional[List[str]] = None

    class DiscoveryResponse(BaseModel):
        status: str
        actions_discovered: int
        actions: List[Dict]
        registered: bool
        summary: Dict = {}
        secrets_required: Optional[List[SecretDefinition]] = None

    # Runbook Endpoints
    @app.get("/runbook/health", response_model=RunbookHealthResponse, tags=["runbook"])
    async def runbook_health():
        """Health check for runbook orchestrator"""
        return RunbookHealthResponse(
            status="healthy" if orchestrator else "initializing",
            pathway_api="connected" if orchestrator else "unknown",
            timestamp=datetime.now().isoformat()
        )

    @app.post("/runbook/remediate", response_model=RemediationResponse, tags=["runbook"])
    async def remediate_error(request: RemediationRequest):
        """Execute automated remediation for an error"""
        if not orchestrator:
            raise HTTPException(status_code=503, detail="Orchestrator not initialized")
        
        try:
            logger.info(f"Received remediation request for: {request.error_message}")
            result = await orchestrator.execute_remediation(
                error_message=request.error_message,
                auto_execute_high_confidence=request.auto_execute,
                require_approval_medium=request.require_approval_medium
            )
            return RemediationResponse(**result)
        except Exception as e:
            logger.error(f"Remediation failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/runbook/remediate/approve", response_model=RemediationResponse, tags=["runbook"])
    async def execute_with_approval(request: ApprovalRequest):
        """Execute approved actions for medium confidence matches"""
        if not orchestrator:
            raise HTTPException(status_code=503, detail="Orchestrator not initialized")
        
        try:
            logger.info(f"Executing approved request: {request.request_id}")
            result = await orchestrator.execute_with_approval(
                request_id=request.request_id,
                approved_by=request.approved_by
            )
            return RemediationResponse(**result)
        except Exception as e:
            logger.error(f"Approved execution failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/runbook/query-errors", tags=["runbook"])
    async def query_errors(error_message: str, k: int = 5):
        """Query Pathway API for matching errors without execution"""
        if not orchestrator:
            raise HTTPException(status_code=503, detail="Orchestrator not initialized")
        
        try:
            matches = await orchestrator.query_error_actions(error_message, k=k)
            return {
                'query': error_message,
                'matches': [
                    {
                        'error': m.error,
                        'actions': m.actions,
                        'description': m.description,
                        'distance': m.distance,
                        'confidence': m.confidence.value,
                        'is_actionable': m.is_actionable
                    }
                    for m in matches
                ]
            }
        except Exception as e:
            logger.error(f"Query failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/runbook/actions", tags=["runbook"])
    async def list_actions(service: Optional[str] = None, method: Optional[str] = None, validated_only: bool = False):
        """List all actions with optional filtering"""
        if not registry:
            raise HTTPException(status_code=503, detail="Registry not initialized")
        
        try:
            if service:
                actions = await registry.get_by_service(service)
            elif method:
                actions = await registry.get_by_method(method)
            else:
                actions = await registry.list_all()
            
            if validated_only:
                actions = [a for a in actions if a.validated]
            
            return {'total': len(actions), 'actions': [a.model_dump() for a in actions]}
        except Exception as e:
            logger.error(f"Failed to list actions: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/runbook/actions/{action_id}", tags=["runbook"])
    async def get_action(action_id: str):
        """Get specific action by ID"""
        if not registry:
            raise HTTPException(status_code=503, detail="Registry not initialized")
        
        try:
            action = await registry.get(action_id)
            if not action:
                raise HTTPException(status_code=404, detail="Action not found")
            return action.model_dump()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get action: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/runbook/actions/add", tags=["runbook"])
    async def add_manual_action(request: ManualActionRequest):
        """Manually add a remediation action to the registry"""
        if not registry:
            raise HTTPException(status_code=503, detail="Registry not initialized")
        
        try:
            action = RemediationAction(
                action_id=request.action_id,
                service=request.service,
                method=request.method,
                definition=request.definition,
                risk_level=request.risk_level,
                requires_approval=request.requires_approval,
                validated=False,
                execution=request.execution,
                parameters=request.parameters,
                secrets=request.secrets,
                action_metadata=request.action_metadata
            )
            await registry.save(action)
            return {'status': 'success', 'message': f'Successfully added action: {request.action_id}', 'action': action.model_dump()}
        except Exception as e:
            logger.error(f"Failed to add manual action: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.delete("/runbook/actions/{action_id}", tags=["runbook"])
    async def delete_action(action_id: str):
        """Delete a specific action by ID"""
        if not registry:
            raise HTTPException(status_code=503, detail="Registry not initialized")
        
        try:
            action = await registry.get(action_id)
            if not action:
                raise HTTPException(status_code=404, detail="Action not found")
            await registry.delete(action_id)
            return {'status': 'success', 'message': f'Successfully deleted action: {action_id}'}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete action: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.put("/runbook/actions/{action_id}", tags=["runbook"])
    async def update_action(action_id: str, request: ManualActionRequest):
        """Update an existing action"""
        if not registry:
            raise HTTPException(status_code=503, detail="Registry not initialized")
        
        try:
            existing = await registry.get(action_id)
            if not existing:
                raise HTTPException(status_code=404, detail="Action not found")
            
            action = RemediationAction(
                action_id=action_id,
                service=request.service,
                method=request.method,
                definition=request.definition,
                risk_level=request.risk_level,
                requires_approval=request.requires_approval,
                validated=existing.validated,
                execution=request.execution,
                parameters=request.parameters,
                secrets=request.secrets,
                action_metadata=request.action_metadata
            )
            await registry.save(action)
            return {'status': 'success', 'message': f'Successfully updated action: {action_id}', 'action': action.model_dump()}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to update action: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/runbook/discover/swagger", response_model=DiscoveryResponse, tags=["runbook"])
    async def discover_from_swagger(request: DiscoverSwaggerRequest):
        """Discover remediation actions from Swagger/OpenAPI specification"""
        if not discovery_agent:
            raise HTTPException(status_code=503, detail="Discovery agent not initialized")
        
        try:
            base_url = None
            if request.swagger_url:
                import aiohttp
                from urllib.parse import urlparse
                parsed = urlparse(request.swagger_url)
                base_url = f"{parsed.scheme}://{parsed.netloc}"
                async with aiohttp.ClientSession() as session:
                    async with session.get(request.swagger_url) as resp:
                        if resp.status != 200:
                            raise HTTPException(status_code=400, detail="Failed to fetch Swagger spec")
                        swagger_doc = await resp.json()
            elif request.swagger_doc:
                swagger_doc = request.swagger_doc
            else:
                raise HTTPException(status_code=400, detail="Provide either swagger_url or swagger_doc")
            
            actions = await discovery_agent.discover_from_swagger(swagger_doc, request.service_name, base_url=base_url)
            
            registered = False
            summary = {}
            if registry:
                try:
                    integration = RegistryIntegration(registry)
                    summary = await integration.register_actions(actions)
                    registered = True
                except Exception as reg_error:
                    logger.warning(f"Could not register actions in DB: {reg_error}")
            
            secrets_required = []
            seen_secrets = set()
            for action in actions:
                for secret_name in action.secrets:
                    if secret_name not in seen_secrets:
                        seen_secrets.add(secret_name)
                        description = f"Secret '{secret_name}' for {action.action_id}"
                        if 'api_key' in secret_name.lower():
                            description = f"API key for {action.service}"
                        elif 'token' in secret_name.lower():
                            description = f"Authentication token for {action.service}"
                        elif 'password' in secret_name.lower():
                            description = f"Password for {action.service}"
                        secrets_required.append(SecretDefinition(
                            key=secret_name,
                            description=description,
                            source="openapi",
                            required=True,
                            value=None
                        ))
            
            return DiscoveryResponse(
                status="pending_secrets" if secrets_required else "completed",
                actions_discovered=len(actions),
                actions=[a.model_dump() for a in actions],
                registered=registered,
                summary=summary,
                secrets_required=secrets_required if secrets_required else None
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Swagger discovery failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/runbook/discover/scripts", response_model=DiscoveryResponse, tags=["runbook"])
    async def discover_from_scripts(request: DiscoverScriptsRequest):
        """Discover remediation actions from script files"""
        if not discovery_agent:
            raise HTTPException(status_code=503, detail="Discovery agent not initialized")
        
        try:
            actions = await discovery_agent.discover_from_scripts(request.scripts, request.service_name)
            
            registered = False
            summary = {}
            if registry:
                try:
                    integration = RegistryIntegration(registry)
                    summary = await integration.register_actions(actions)
                    registered = True
                except Exception as reg_error:
                    logger.warning(f"Could not register actions in DB: {reg_error}")
            
            secrets_required = []
            seen_secrets = set()
            for action in actions:
                for secret_name in action.secrets:
                    if secret_name not in seen_secrets:
                        seen_secrets.add(secret_name)
                        secrets_required.append(SecretDefinition(
                            key=secret_name,
                            description=f"Secret '{secret_name}' for {action.action_id}",
                            source="script",
                            required=True,
                            value=None
                        ))
            
            return DiscoveryResponse(
                status="pending_secrets" if secrets_required else "completed",
                actions_discovered=len(actions),
                actions=[a.model_dump() for a in actions],
                registered=registered,
                summary=summary,
                secrets_required=secrets_required if secrets_required else None
            )
        except Exception as e:
            logger.error(f"Script discovery failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/runbook/discover/ssh", response_model=DiscoveryResponse, tags=["runbook"])
    async def discover_from_ssh(request: DiscoverSSHRequest):
        """Discover remediation actions via SSH"""
        if not discovery_agent:
            raise HTTPException(status_code=503, detail="Discovery agent not initialized")
        
        try:
            actions = await discovery_agent.discover_from_ssh(
                request.host,
                request.scripts_path,
                request.credentials,
                request.service_name,
                secrets_manager=None
            )
            
            registered = False
            summary = {}
            if registry:
                try:
                    integration = RegistryIntegration(registry)
                    summary = await integration.register_actions(actions)
                    registered = True
                except Exception as reg_error:
                    logger.warning(f"Could not register actions in DB: {reg_error}")
            
            secrets_required = []
            seen_secrets = set()
            for action in actions:
                for secret_name in action.secrets:
                    if secret_name not in seen_secrets:
                        seen_secrets.add(secret_name)
                        description = f"Secret for {action.service}"
                        if 'ssh_host' in secret_name:
                            description = f"SSH host for {action.service}"
                        elif 'ssh_username' in secret_name:
                            description = f"SSH username for {action.service}"
                        elif 'ssh_password' in secret_name:
                            description = f"SSH password for {action.service}"
                        elif 'ssh_port' in secret_name:
                            description = f"SSH port for {action.service}"
                        else:
                            description = f"Secret '{secret_name}' for {action.action_id}"
                        secrets_required.append(SecretDefinition(
                            key=secret_name,
                            description=description,
                            source="ssh",
                            required=True,
                            value=None
                        ))
            
            return DiscoveryResponse(
                status="pending_secrets" if secrets_required else "completed",
                actions_discovered=len(actions),
                actions=[a.model_dump() for a in actions],
                registered=registered,
                summary=summary,
                secrets_required=secrets_required if secrets_required else None
            )
        except Exception as e:
            logger.error(f"SSH discovery failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/runbook/discover/documentation", response_model=DiscoveryResponse, tags=["runbook"])
    async def discover_from_documentation(request: DiscoverDocsRequest):
        """Discover remediation actions from operational documentation"""
        if not discovery_agent:
            raise HTTPException(status_code=503, detail="Discovery agent not initialized")
        
        try:
            actions = await discovery_agent.discover_from_documentation(request.documentation, request.service_name)
            
            registered = False
            summary = {}
            if registry:
                try:
                    integration = RegistryIntegration(registry)
                    summary = await integration.register_actions(actions)
                    registered = True
                except Exception as reg_error:
                    logger.warning(f"Could not register actions in DB: {reg_error}")
            
            return DiscoveryResponse(
                status="completed",
                actions_discovered=len(actions),
                actions=[a.model_dump() for a in actions],
                registered=registered,
                summary=summary
            )
        except Exception as e:
            logger.error(f"Documentation discovery failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/runbook/secrets/provision", response_model=SecretsProvisionResponse, tags=["runbook"])
    async def provision_secrets(request: SecretsProvisionRequest):
        """Provision secret values for discovered actions"""
        secrets_mgr = get_secrets_manager()
        secrets_saved = 0
        secrets_skipped = 0
        errors = []
        
        try:
            for secret in request.secrets:
                if secret.value is None or secret.value.strip() == "":
                    if secret.required:
                        errors.append(f"Required secret '{secret.key}' has no value")
                        secrets_skipped += 1
                    else:
                        secrets_skipped += 1
                    continue
                
                try:
                    secrets_mgr.set_secret(secret.key, secret.value)
                    secrets_saved += 1
                    logger.info(f"Provisioned secret: {secret.key} (source: {secret.source})")
                except Exception as e:
                    error_msg = f"Failed to save secret '{secret.key}': {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
                    secrets_skipped += 1
            
            if secrets_saved == len(request.secrets):
                status = "completed"
            elif secrets_saved > 0:
                status = "partial"
            else:
                status = "failed"
            
            return SecretsProvisionResponse(
                status=status,
                secrets_saved=secrets_saved,
                secrets_skipped=secrets_skipped,
                errors=errors if errors else None
            )
        except Exception as e:
            logger.error(f"Secrets provisioning failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))