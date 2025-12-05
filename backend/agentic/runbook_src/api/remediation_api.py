"""
Remediation API Server - REST API for error remediation orchestration
Exposes endpoints to trigger automated remediation based on error messages
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import asyncio
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from ..core.remediation_orchestrator import RemediationOrchestrator, ConfidenceLevel
from ..core.llm_suggestion_service import LLMSuggestionService
from ..execution.execution_engine import ActionExecutor
from ..core.runbook_registry import RunbookRegistry, RemediationAction
from ..execution.safety_validator import SafetyValidator
from ..services.secrets_manager import SecretsManager
from ..services.ssh_client import SSHClientFactory
try:
    from otel_client import OTelClient
except ImportError:
    OTelClient = None
from ..agents.llm_discovery_agent import LLMDiscoveryAgent, RegistryIntegration

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global orchestrator instance
orchestrator: Optional[RemediationOrchestrator] = None
discovery_agent: Optional[LLMDiscoveryAgent] = None
registry: Optional[RunbookRegistry] = None


# ===== REQUEST/RESPONSE MODELS =====

class RemediationRequest(BaseModel):
    """Request to execute remediation"""
    error_message: str = Field(..., description="Error message to remediate")
    auto_execute: bool = Field(True, description="Auto-execute high confidence matches")
    require_approval_medium: bool = Field(True, description="Require approval for medium confidence")


class ApprovalRequest(BaseModel):
    """Request to execute with approval"""
    request_id: str = Field(..., description="Approval request ID from remediation response")
    approved_by: str = Field(default="api_user", description="Who approved the request")


class ActionSuggestionItem(BaseModel):
    """Suggested action for error registry"""
    action_id: str
    reason: str


class ErrorSuggestion(BaseModel):
    """LLM-generated suggestion for new error registry entry"""
    error_name: str
    description: str
    suggested_actions: List[ActionSuggestionItem]
    confidence_reasoning: str
    feasible: bool
    additional_actions_needed: Optional[str] = None


class RemediationResponse(BaseModel):
    """Response from remediation execution"""
    status: str
    error: str
    matched_error: Optional[str] = None
    distance: Optional[float] = None
    confidence: Optional[str] = None
    actions_executed: Optional[int] = None
    execution_results: Optional[List[Dict[str, Any]]] = None
    overall_success: Optional[bool] = None
    message: Optional[str] = None
    request_id: Optional[str] = None  # For approval workflow
    actions: Optional[List[str]] = None  # Action IDs that require approval
    description: Optional[str] = None  # Error description
    suggestion: Optional[ErrorSuggestion] = None  # LLM suggestion for low confidence


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    pathway_api: str
    timestamp: str


class DiscoverSwaggerRequest(BaseModel):
    """Request to discover actions from Swagger/OpenAPI spec"""
    swagger_url: Optional[str] = Field(None, description="URL to fetch Swagger JSON")
    swagger_doc: Optional[Dict[str, Any]] = Field(None, description="Inline Swagger JSON document")
    service_name: str = Field(..., description="Service name for discovered actions")


class DiscoverScriptsRequest(BaseModel):
    """Request to discover actions from script files"""
    scripts: List[Dict[str, str]] = Field(..., description="List of {path, content} dicts")
    service_name: str = Field(..., description="Service name")


class DiscoverSSHRequest(BaseModel):
    """Request to discover actions via SSH"""
    host: str = Field(..., description="SSH host")
    scripts_path: str = Field(..., description="Path to scripts directory")
    credentials: Dict[str, Any] = Field(..., description="SSH credentials")
    service_name: str = Field(..., description="Service name")


class DiscoverDocsRequest(BaseModel):
    """Request to discover actions from documentation"""
    documentation: str = Field(..., description="Documentation/runbook text")
    service_name: str = Field(..., description="Service name")


class SecretDefinition(BaseModel):
    """Definition of a secret that needs to be provisioned"""
    key: str = Field(..., description="Unique secret key")
    description: str = Field(..., description="Description of what this secret is for")
    source: str = Field(..., description="Source of secret (ssh, openapi, script)")
    required: bool = Field(True, description="Whether this secret is required")
    value: Optional[str] = Field(None, description="Secret value (set by user)")


class DiscoveryResponse(BaseModel):
    """Response from discovery operations"""
    status: str
    actions_discovered: int
    actions: List[Dict[str, Any]]
    registered: bool = False
    summary: Optional[Dict[str, Any]] = None
    secrets_required: Optional[List[SecretDefinition]] = Field(None, description="Secrets that need values")


class SecretsProvisionRequest(BaseModel):
    """Request to provision secret values"""
    secrets: List[SecretDefinition] = Field(..., description="List of secrets with values")
    service_name: str = Field(..., description="Service name for context")


class SecretsProvisionResponse(BaseModel):
    """Response from secrets provisioning"""
    status: str
    secrets_saved: int
    secrets_skipped: int
    errors: Optional[List[str]] = None


class ManualActionRequest(BaseModel):
    """Request to add action manually"""
    action_id: str = Field(..., description="Unique action identifier")
    service: str = Field(..., description="Service name")
    method: str = Field(..., description="Execution method (rpc, script, api, k8s, command)")
    definition: str = Field(..., description="Action description")
    risk_level: str = Field(..., description="Risk level (high, medium, low)")
    requires_approval: bool = Field(False, description="Whether action requires approval")
    execution: Dict[str, Any] = Field(default_factory=dict, description="Execution configuration")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action parameters")
    secrets: List[str] = Field(default_factory=list, description="Secret parameter names")
    action_metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


# ===== STARTUP/SHUTDOWN =====

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize orchestrator on startup"""
    global orchestrator, discovery_agent, registry
    
    try:
        logger.info("Initializing remediation orchestrator...")
        
        # Initialize SSH client factory for discovery
        ssh_factory = SSHClientFactory(max_connections_per_host=3)
        
        # Create SSH client factory function for discovery agent
        def ssh_client_factory(host: str, credentials: Dict[str, Any]):
            """Factory function for SSH clients"""
            # Extract port from credentials, default to 22
            port = int(credentials.get('port', 22)) if credentials.get('port') else 22
            return ssh_factory.create_client(
                host=host,
                credentials=credentials,
                port=port,
                timeout=30
            )
        
        # Initialize discovery agent with SSH support
        discovery_agent = LLMDiscoveryAgent(ssh_client_factory=ssh_client_factory)
        logger.info("Discovery agent initialized successfully with SSH support")
        
        # Try to initialize DB components (optional for discovery testing)
        try:
            # Get DB URL from environment
            import os
            db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:mysecretpassword@localhost:5432/postgres")
            
            # Initialize components
            registry = RunbookRegistry(database_url=db_url)
            await registry.initialize()
            
            # Setup safety and execution components (OTel disabled)
            validator = SafetyValidator(otel_client=None, metrics_client=None)
            secrets_mgr = SecretsManager()
            executor = ActionExecutor(validator, secrets_mgr, None)
            
            # Initialize LLM suggestion service for low confidence errors
            try:
                suggestion_service = LLMSuggestionService()
                logger.info("LLM suggestion service initialized successfully")
            except Exception as llm_error:
                logger.warning(f"Could not initialize LLM suggestion service: {llm_error}")
                suggestion_service = None
            
            # Create orchestrator
            orchestrator = RemediationOrchestrator(
                pathway_api_url="http://localhost:8000",
                runbook_registry=registry,
                action_executor=executor,
                confidence_thresholds={'high': 0.3, 'medium': 0.5},
                suggestion_service=suggestion_service
            )
            logger.info("Orchestrator initialized successfully")
            
        except Exception as db_error:
            logger.warning(f"Could not initialize orchestrator (DB may not be ready): {db_error}")
            logger.info("Discovery endpoints will still work without orchestrator")
        
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
        raise

    yield

    logger.info("Shutting down...")


# Create FastAPI app with lifespan
app = FastAPI(
    title="Remediation Orchestration API",
    description="Automated error detection and remediation execution",
    version="1.0.0",
    lifespan=lifespan
)


# ===== API ENDPOINTS =====

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if orchestrator else "initializing",
        pathway_api="connected" if orchestrator else "unknown",
        timestamp=datetime.now().isoformat()
    )


@app.post("/v1/remediate", response_model=RemediationResponse)
async def remediate_error(request: RemediationRequest):
    """
    Execute automated remediation for an error
    
    - Queries Pathway API for matching errors
    - Classifies confidence (high/medium/low)
    - Executes actions for high confidence matches (if auto_execute=True)
    - Returns approval required for medium confidence matches
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        logger.info(f"Received remediation request for: {request.error_message}")
        
        # Execute orchestration
        result = await orchestrator.execute_remediation(
            error_message=request.error_message,
            auto_execute_high_confidence=request.auto_execute,
            require_approval_medium=request.require_approval_medium
        )
        
        return RemediationResponse(**result)
        
    except Exception as e:
        logger.error(f"Remediation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

#!INTEGRATION: This is the endpoint to approve medium confidence actions
@app.post("/v1/remediate/approve", response_model=RemediationResponse)
async def execute_with_approval(request: ApprovalRequest):
    """
    Execute approved actions (for medium confidence matches)
    
    Use this endpoint after receiving 'approval_required' status
    from /v1/remediate endpoint
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        logger.info(f"Executing approved request: {request.request_id}")
        
        # Execute with approval
        result = await orchestrator.execute_with_approval(
            request_id=request.request_id,
            approved_by=request.approved_by
        )
        
        return RemediationResponse(**result)
        
    except Exception as e:
        logger.error(f"Approved execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/remediate/approve-action", response_model=RemediationResponse)
async def approve_specific_action(
    request_id: str,
    action_id: str,
    approved_by: str = "api_user"
):
    """
    Approve a specific action within a request and resume execution
    
    Use when a request pauses for per-action approval
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        logger.info(f"Approving action {action_id} in request {request_id}")
        
        result = await orchestrator.approve_action(
            request_id=request_id,
            action_id=action_id,
            approved_by=approved_by
        )
        
        return RemediationResponse(**result)
        
    except Exception as e:
        logger.error(f"Action approval failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/query-errors")
async def query_errors(error_message: str, k: int = 5):
    """
    Query Pathway API for matching errors (without execution)
    
    Useful for testing and manual review before execution
    """
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


# ===== ACTION REGISTRY ENDPOINTS =====

@app.get("/v1/actions")
async def list_actions(
    service: Optional[str] = None,
    method: Optional[str] = None,
    validated_only: bool = False
):
    """
    List all actions with optional filtering
    
    - service: Filter by service name
    - method: Filter by method (rpc, script, api, k8s, command)
    - validated_only: Only return validated actions
    """
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
        
        return {
            'total': len(actions),
            'actions': [a.model_dump() for a in actions]
        }
    except Exception as e:
        logger.error(f"Failed to list actions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/actions/{action_id}")
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


@app.delete("/v1/actions/{action_id}")
async def delete_action(action_id: str):
    """Delete a specific action by ID"""
    if not registry:
        raise HTTPException(status_code=503, detail="Registry not initialized")
    
    try:
        action = await registry.get(action_id)
        if not action:
            raise HTTPException(status_code=404, detail="Action not found")
        
        await registry.delete(action_id)
        return {
            'status': 'success',
            'message': f'Successfully deleted action: {action_id}'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/v1/actions/{action_id}")
async def update_action(action_id: str, request: ManualActionRequest):
    """Update an existing action"""
    if not registry:
        raise HTTPException(status_code=503, detail="Registry not initialized")
    
    try:
        # Check if action exists
        existing = await registry.get(action_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Action not found")
        
        # Create updated action
        action = RemediationAction(
            action_id=action_id,
            service=request.service,
            method=request.method,
            definition=request.definition,
            risk_level=request.risk_level,
            requires_approval=request.requires_approval,
            validated=existing.validated,  # Keep validation status
            execution=request.execution,
            parameters=request.parameters,
            secrets=request.secrets,
            action_metadata=request.action_metadata
        )
        
        # Save to registry
        await registry.save(action)
        
        return {
            'status': 'success',
            'message': f'Successfully updated action: {action_id}',
            'action': action.model_dump()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== ACTION MANAGEMENT ENDPOINT =====

@app.post("/v1/actions/add")
async def add_manual_action(request: ManualActionRequest):
    """
    Manually add a remediation action to the registry
    
    This is the primary endpoint for adding actions manually
    """
    if not registry:
        raise HTTPException(status_code=503, detail="Registry not initialized")
    
    try:
        # Create RemediationAction instance
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
        
        # Save to registry
        await registry.save(action)
        
        return {
            'status': 'success',
            'message': f'Successfully added action: {request.action_id}',
            'action': action.model_dump()
        }
    except Exception as e:
        logger.error(f"Failed to add manual action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== LLM DISCOVERY ENDPOINTS =====

@app.post("/v1/discover/swagger", response_model=DiscoveryResponse)
async def discover_from_swagger(request: DiscoverSwaggerRequest):
    """
    Discover remediation actions from Swagger/OpenAPI specification
    
    Provide either swagger_url OR swagger_doc (not both)
    """
    if not discovery_agent:
        raise HTTPException(status_code=503, detail="Discovery agent not initialized")
    
    try:
        # Fetch swagger doc if URL provided
        base_url = None
        if request.swagger_url:
            import aiohttp
            from urllib.parse import urlparse
            
            # Extract base URL from swagger_url
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
        
        # Discover actions
        actions = await discovery_agent.discover_from_swagger(swagger_doc, request.service_name, base_url=base_url)
        
        # Try to register in database (optional)
        registered = False
        summary = {}
        if registry:
            try:
                integration = RegistryIntegration(registry)
                summary = await integration.register_actions(actions)
                registered = True
            except Exception as reg_error:
                logger.warning(f"Could not register actions in DB: {reg_error}")
        
        # Extract unique secrets that need values
        secrets_required = []
        seen_secrets = set()
        for action in actions:
            for secret_name in action.secrets:
                if secret_name not in seen_secrets:
                    seen_secrets.add(secret_name)
                    # Determine description based on action context
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

#!DEV: Their are 2 endpoints , one for script files and one for ssh-based script file discovery, so when the check box is ticked in the frontend, it calls the ssh one.
@app.post("/v1/discover/scripts", response_model=DiscoveryResponse)
async def discover_from_scripts(request: DiscoverScriptsRequest):
    """
    Discover remediation actions from script files
    
    Provide list of scripts with path and content
    """
    if not discovery_agent:
        raise HTTPException(status_code=503, detail="Discovery agent not initialized")
    
    try:
        actions = await discovery_agent.discover_from_scripts(
            request.scripts,
            request.service_name
        )
        
        # Try to register in database (optional)
        registered = False
        summary = {}
        if registry:
            try:
                integration = RegistryIntegration(registry)
                summary = await integration.register_actions(actions)
                registered = True
            except Exception as reg_error:
                logger.warning(f"Could not register actions in DB: {reg_error}")
        
        # Extract unique secrets that need values
        secrets_required = []
        seen_secrets = set()
        for action in actions:
            for secret_name in action.secrets:
                if secret_name not in seen_secrets:
                    seen_secrets.add(secret_name)
                    description = f"Secret '{secret_name}' for {action.action_id}"
                    secrets_required.append(SecretDefinition(
                        key=secret_name,
                        description=description,
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


@app.post("/v1/discover/ssh", response_model=DiscoveryResponse)
async def discover_from_ssh(request: DiscoverSSHRequest):
    """
    Discover remediation actions via SSH
    
    Connect to remote server and analyze scripts
    Returns actions with secrets that need user-provided values
    
    Example credentials dict:
    {
        "username": "user",
        "password": "pass",  # OR
        "private_key_path": "/path/to/key",
        "private_key_passphrase": "optional"
    }
    """
    if not discovery_agent:
        raise HTTPException(status_code=503, detail="Discovery agent not initialized")
    
    try:
        # Don't pass secrets_manager yet - let user provide values first
        actions = await discovery_agent.discover_from_ssh(
            request.host,
            request.scripts_path,
            request.credentials,
            request.service_name,
            secrets_manager=None  # User will provide values via /secrets/provision
        )
        
        # Try to register in database (optional)
        registered = False
        summary = {}
        if registry:
            try:
                integration = RegistryIntegration(registry)
                summary = await integration.register_actions(actions)
                registered = True
            except Exception as reg_error:
                logger.warning(f"Could not register actions in DB: {reg_error}")
        
        # Extract unique secrets that need values
        secrets_required = []
        seen_secrets = set()
        for action in actions:
            for secret_name in action.secrets:
                if secret_name not in seen_secrets:
                    seen_secrets.add(secret_name)
                    # Determine description based on secret name
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
            actions=[a.dict() for a in actions],
            registered=registered,
            summary=summary,
            secrets_required=secrets_required if secrets_required else None
        )
    except Exception as e:
        logger.error(f"SSH discovery failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/discover/documentation", response_model=DiscoveryResponse)
async def discover_from_documentation(request: DiscoverDocsRequest):
    """
    Discover remediation actions from operational documentation
    
    Provide runbook or operational docs text
    """
    if not discovery_agent:
        raise HTTPException(status_code=503, detail="Discovery agent not initialized")
    
    try:
        actions = await discovery_agent.discover_from_documentation(
            request.documentation,
            request.service_name
        )
        
        # Try to register in database (optional)
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


@app.post("/v1/secrets/provision", response_model=SecretsProvisionResponse)
async def provision_secrets(request: SecretsProvisionRequest):
    """
    Provision secret values for discovered actions
    
    User provides values for secrets identified during discovery.
    Secrets are stored in the secrets manager with uniqueness enforced.
    
    Example request:
    {
        "service_name": "webapp",
        "secrets": [
            {
                "key": "webapp_prod-server-01_ssh_host",
                "description": "SSH host",
                "source": "ssh",
                "required": true,
                "value": "prod-server-01.example.com"
            },
            {
                "key": "webapp_prod-server-01_ssh_password",
                "description": "SSH password",
                "source": "ssh", 
                "required": true,
                "value": "secure_password_123"
            }
        ]
    }
    """
    from ..services.secrets_manager import get_secrets_manager
    
    secrets_mgr = get_secrets_manager()
    secrets_saved = 0
    secrets_skipped = 0
    errors = []
    
    try:
        for secret in request.secrets:
            # Skip if no value provided
            if secret.value is None or secret.value.strip() == "":
                if secret.required:
                    errors.append(f"Required secret '{secret.key}' has no value")
                    secrets_skipped += 1
                else:
                    secrets_skipped += 1
                continue
            
            try:
                # Store secret in database (automatically handles uniqueness)
                secrets_mgr.set_secret(secret.key, secret.value)
                secrets_saved += 1
                logger.info(f"Provisioned secret: {secret.key} (source: {secret.source})")
            except Exception as e:
                error_msg = f"Failed to save secret '{secret.key}': {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
                secrets_skipped += 1
        
        # Determine overall status
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


# ===== EXAMPLE USAGE =====
"""
# 1. Health check
curl http://localhost:8080/health

# 2. Query errors (no execution)
curl "http://localhost:8080/v1/query-errors?error_message=SSLCertificateExpired&k=3"

# 3. Execute remediation (SIMPLIFIED - no context needed!)
curl -X POST http://localhost:8080/v1/remediate \
  -H "Content-Type: application/json" \
  -d '{
    "error_message": "SSLCertificateExpired"
  }'

# 4. Execute with custom settings
curl -X POST http://localhost:8080/v1/remediate \
  -H "Content-Type: application/json" \
  -d '{
    "error_message": "SSLCertificateExpired",
    "auto_execute": true,
    "require_approval_medium": false
  }'

# 5. Execute with approval (if medium confidence)
curl -X POST http://localhost:8080/v1/remediate/approve \
  -H "Content-Type: application/json" \
  -d '{
    "error_message": "SSLCertificateExpired",
    "approved_actions": ["renew-ssl-certificate", "reload-nginx-config"]
  }'
"""


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8080,
        log_level="info"
    )
