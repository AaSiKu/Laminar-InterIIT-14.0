"""
Discovery Planner - Coordinated multi-agent architecture for API discovery
Uses a planner agent that coordinates multiple specialist subagents
"""

import asyncio
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from src.core.runbook_registry import RemediationAction
from src.core.config import get_config


class EndpointCandidate(BaseModel):
    """Candidate endpoint identified by planner"""
    path: str
    method: str
    operation_id: str
    is_remediation: bool
    reason: str


class EndpointCandidates(BaseModel):
    """Container for multiple endpoint candidates"""
    candidates: List[EndpointCandidate] = Field(
        description="List of endpoint candidates identified as remediation endpoints"
    )


class RiskAssessment(BaseModel):
    """Risk assessment for an endpoint"""
    risk_level: str = Field(description="Risk level: low, medium, or high")
    requires_approval: bool = Field(description="Whether human approval is required")
    definition: str = Field(description="Clear one-sentence description of what this endpoint does")


class DiscoveryPlanner:
    """
    Planner agent that:
    1. Analyzes Swagger spec to identify remediation endpoints
    2. Delegates each endpoint to a specialist subagent
    3. Aggregates results
    """
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        cfg = get_config()
        api_key = api_key or cfg.google_api_key
        model = model or cfg.llm_model
        
        if not api_key:
            raise ValueError("Google AI API key required")
        
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0.1,
            max_tokens=2048
        )
    
    async def analyze_swagger(
        self,
        swagger_doc: Dict[str, Any],
        service_name: str
    ) -> List[EndpointCandidate]:
        """
        Analyze Swagger doc and identify remediation endpoint candidates
        
        Uses keyword matching first, then LLM for ambiguous cases
        """
        # Remediation keywords
        remediation_keywords = {
            'restart', 'reset', 'clear', 'flush', 'refresh', 'rebuild', 
            'recreate', 'scale', 'heal', 'rollback', 'failover', 'purge',
            'admin', 'pool', 'cache', 'queue', 'deployment'
        }
        
        # Business/CRUD keywords to exclude
        exclude_keywords = {
            'user', 'users', 'order', 'orders', 'payment', 'payments',
            'customer', 'customers', 'product', 'products', 'list', 'get',
            'create', 'update', 'delete'
        }
        
        candidates = []
        
        for path, methods in swagger_doc.get('paths', {}).items():
            for http_method, spec in methods.items():
                operation_id = spec.get('operationId', '')
                summary = spec.get('summary', '').lower()
                description = spec.get('description', '').lower()
                tags = [t.lower() for t in spec.get('tags', [])]
                
                # Combine all text
                combined_text = f"{path} {operation_id} {summary} {description} {' '.join(tags)}".lower()
                
                # Check if it's a business endpoint (exclude)
                is_business = any(keyword in combined_text for keyword in exclude_keywords)
                if is_business and not any(keyword in combined_text for keyword in remediation_keywords):
                    continue
                
                # Check if it's a remediation endpoint
                is_remediation = any(keyword in combined_text for keyword in remediation_keywords)
                
                # Special case: health checks are low-risk remediation endpoints
                if 'health' in combined_text or 'status' in combined_text:
                    is_remediation = True
                
                if is_remediation:
                    candidates.append(EndpointCandidate(
                        path=path,
                        method=http_method.upper(),
                        operation_id=operation_id,
                        is_remediation=True,
                        reason=f"Keyword match in: {summary or path}"
                    ))
                    print(f"Identified: {http_method.upper()} {path}")
        
        return candidates


class EndpointSubagent:
    """
    Specialist subagent that processes a single endpoint
    Extracts all details and creates a complete RemediationAction
    """
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        cfg = get_config()
        api_key = api_key or cfg.google_api_key
        model = model or cfg.llm_model
        
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0.1,
            max_tokens=2048
        )
    
    async def process_endpoint(
        self,
        path: str,
        method: str,
        spec: Dict[str, Any],
        service_name: str
    ) -> Optional[RemediationAction]:
        """
        Process a single endpoint and create complete RemediationAction
        
        This agent ONLY focuses on one endpoint, making it simpler
        """
        
        operation_id = spec.get('operationId', f"{method.lower()}_{path.replace('/', '_')}")
        summary = spec.get('summary', '')
        description = spec.get('description', '')
        
        # Extract parameters
        parameters = self._extract_parameters(spec)
        
        # Identify secrets
        secrets = self._identify_secrets(parameters, spec)
        
        # Build execution dict
        execution = {
            'endpoint': path,
            'http_method': method.upper(),
            'content_type': 'application/json'
        }
        
        # Build action_metadata
        action_metadata = {
            'operationId': operation_id,
            'summary': summary,
            'description': description,
            'tags': spec.get('tags', []),
            'security': [list(s.keys())[0] for s in spec.get('security', [])] if spec.get('security') else []
        }
        
        # Use LLM only for risk assessment and definition
        risk_assessment = await self._assess_risk(path, method, summary, description, spec)
        
        # Create action
        action_id = f"{operation_id}-{service_name}".replace('_', '-').lower()
        
        action = RemediationAction(
            action_id=action_id,
            method='rpc',
            service=service_name,
            definition=risk_assessment['definition'],
            requires_approval=risk_assessment['requires_approval'],
            risk_level=risk_assessment['risk_level'],
            validated=False,
            execution=execution,
            parameters=parameters,
            secrets=secrets,
            action_metadata=action_metadata
        )
        
        return action
    
    def _extract_parameters(self, spec: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Extract parameters from OpenAPI spec - deterministic"""
        params = {}
        
        # Query/path/header parameters
        for param in spec.get('parameters', []):
            param_name = param.get('name')
            param_schema = param.get('schema', {})
            
            params[param_name] = {
                'type': param_schema.get('type', 'string'),
                'required': param.get('required', False),
                'default': param_schema.get('default'),
                'description': param.get('description', ''),
                'in': param.get('in', 'query')
            }
        
        # Request body parameters
        request_body = spec.get('requestBody', {})
        if request_body:
            content = request_body.get('content', {})
            json_content = content.get('application/json', {})
            schema = json_content.get('schema', {})
            properties = schema.get('properties', {})
            required_fields = schema.get('required', [])
            
            for prop_name, prop_schema in properties.items():
                params[prop_name] = {
                    'type': prop_schema.get('type', 'string'),
                    'required': prop_name in required_fields,
                    'default': prop_schema.get('default'),
                    'description': prop_schema.get('description', ''),
                    'in': 'body'
                }
        
        return params
    
    def _identify_secrets(
        self,
        parameters: Dict[str, Dict[str, Any]],
        spec: Dict[str, Any]
    ) -> List[str]:
        """
        Identify secret parameters - deterministic pattern matching
        
        Secrets are sensitive credentials that should be stored securely
        (e.g., in Vault, AWS Secrets Manager) and retrieved at execution time.
        
        Detection strategy:
        1. Check parameter names for secret-related keywords
        2. Check descriptions for sensitivity indicators
        3. Check OpenAPI security schemes (API keys, bearer tokens, etc.)
        4. Apply context-aware rules (e.g., 'key' in 'admin_api_key' vs 'sort_key')
        """
        # Core secret keywords (high confidence)
        secret_keywords = [
            'password', 'passwd', 'pwd',
            'token', 'bearer',
            'secret', 'credential',
            'api_key', 'apikey', 'api-key',
            'private_key', 'privatekey',
            'auth_token', 'access_token', 'refresh_token',
            'client_secret',
            'certificate', 'cert'
        ]
        
        # Context-aware keywords (only secret in certain contexts)
        context_keywords = [
            'key',      # Secret if: api_key, admin_key, auth_key
            'auth',     # Secret if: auth_header, authorization
            'code',     # Secret if: approval_code, auth_code
            'pin',      # Secret if: pin_code, admin_pin
            'signature' # Secret if: request_signature, auth_signature
        ]
        
        # Non-secret contexts (exclude these)
        non_secret_contexts = [
            'public_key', 'sort_key', 'primary_key', 'foreign_key',
            'cache_key', 'redis_key', 'partition_key',
            'status_code', 'error_code', 'response_code', 'country_code'
        ]
        
        secrets = []
        
        for param_name, param_spec in parameters.items():
            param_lower = param_name.lower()
            desc_lower = param_spec.get('description', '').lower()
            
            # Skip if it's a known non-secret context
            if any(non_secret in param_lower for non_secret in non_secret_contexts):
                continue
            
            # Check core secret keywords (high confidence)
            if any(keyword in param_lower for keyword in secret_keywords):
                secrets.append(param_name)
                continue
            
            # Check context-aware keywords
            for ctx_keyword in context_keywords:
                if ctx_keyword in param_lower:
                    # Additional context check: must have a prefix/suffix
                    # e.g., 'admin_key', 'auth_code' (not just 'key' or 'code')
                    if param_lower != ctx_keyword:  # Not the keyword alone
                        secrets.append(param_name)
                        break
            
            # Check description for sensitivity indicators
            sensitivity_phrases = [
                'sensitive', 'confidential', 'secret', 'credential',
                'do not log', 'must be encrypted', 'store securely'
            ]
            if any(phrase in desc_lower for phrase in sensitivity_phrases):
                if param_name not in secrets:
                    secrets.append(param_name)
        
        # Check OpenAPI security schemes
        security_schemes = spec.get('security', [])
        for scheme in security_schemes:
            # Security schemes like {'ApiKeyAuth': []}, {'BearerAuth': []}
            for scheme_name in scheme.keys():
                scheme_lower = scheme_name.lower()
                if 'apikey' in scheme_lower or 'bearer' in scheme_lower:
                    # Look for parameters that match this security scheme
                    for param_name in parameters.keys():
                        if scheme_lower in param_name.lower():
                            if param_name not in secrets:
                                secrets.append(param_name)
        
        return secrets
    
    async def _assess_risk(
        self,
        path: str,
        method: str,
        summary: str,
        description: str,
        spec: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use LLM with structured output for risk assessment"""
        
        # Create structured LLM
        structured_llm = self.llm.with_structured_output(RiskAssessment)
        
        prompt = f"""
Assess the risk level for this API endpoint:

Path: {method} {path}
Summary: {summary}
Description: {description}

Analyze and provide:
1. risk_level: "low", "medium", or "high"
   - low: Read-only, health checks, no state changes
   - medium: Restarts, cache clears, reversible operations
   - high: Destructive operations, data deletion, irreversible changes

2. requires_approval: true or false
   - true for high risk operations
   - false for low and medium risk read-only operations

3. definition: One clear sentence describing what this endpoint does
"""
        
        try:
            assessment = await asyncio.wait_for(
                structured_llm.ainvoke(prompt),
                timeout=30
            )
            
            if assessment:
                return {
                    'risk_level': assessment.risk_level,
                    'requires_approval': assessment.requires_approval,
                    'definition': assessment.definition
                }
        except Exception as e:
            print(f"Risk assessment failed: {e}")
        
        # Safe defaults
        return {
            'risk_level': 'medium',
            'requires_approval': True,
            'definition': summary or f"{method} {path}"
        }


class CoordinatedDiscoveryAgent:
    """
    Coordinated discovery using planner + subagent architecture
    """
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.planner = DiscoveryPlanner(api_key, model)
        self.subagent = EndpointSubagent(api_key, model)
    
    async def discover_from_swagger(
        self,
        swagger_doc: Dict[str, Any],
        service_name: str,
        parallel: bool = True
    ) -> List[RemediationAction]:
        """
        Discover remediation actions using planner + subagents
        
        Args:
            swagger_doc: OpenAPI spec
            service_name: Service name
            parallel: Process endpoints in parallel (faster) or sequential
        
        Returns:
            List of RemediationAction instances
        """
        
        print(f"Planner analyzing spec for {service_name}...")
        
        # Step 1: Planner identifies remediation endpoints
        candidates = await self.planner.analyze_swagger(swagger_doc, service_name)
        
        if not candidates:
            print("  No remediation endpoints identified")
            return []
        
        print(f"  Found {len(candidates)} remediation endpoint(s)")
        
        # Step 2: Process each endpoint with subagent
        actions = []
        
        if parallel:
            # Process all endpoints in parallel
            tasks = []
            for candidate in candidates:
                # Find spec for this endpoint
                spec = swagger_doc['paths'][candidate.path][candidate.method.lower()]
                task = self.subagent.process_endpoint(
                    candidate.path,
                    candidate.method,
                    spec,
                    service_name
                )
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    print(f"Failed to process {candidates[i].path}: {result}")
                elif result:
                    actions.append(result)
                    print(f"Processed {result.action_id}")
        else:
            # Process sequentially
            for candidate in candidates:
                try:
                    spec = swagger_doc['paths'][candidate.path][candidate.method.lower()]
                    action = await self.subagent.process_endpoint(
                        candidate.path,
                        candidate.method,
                        spec,
                        service_name
                    )
                    if action:
                        actions.append(action)
                        print(f"  ✓ Processed {action.action_id}")
                except Exception as e:
                    print(f" Failed to process {candidate.path}: {e}")
        
        return actions


# Example usage
async def example_usage():
    """Test the coordinated discovery"""
    from src.core.runbook_registry import RunbookRegistry
    
    cfg = get_config()
    
    # Initialize
    agent = CoordinatedDiscoveryAgent()
    registry = RunbookRegistry(cfg.database_url)
    await registry.initialize()
    
    print(f"Connected to database: {cfg.database_url.split('://')[0]}\n")
    
    # Comprehensive Swagger example with secrets
    swagger_doc = {
        "openapi": "3.0.0",
        "info": {"title": "Payment Service Admin API", "version": "1.0.0"},
        "paths": {
            "/admin/restart": {
                "post": {
                    "operationId": "restartService",
                    "summary": "Restart the payment processing service",
                    "description": "Performs a graceful restart with optional drain period",
                    "parameters": [
                        {
                            "name": "graceful",
                            "in": "query",
                            "schema": {"type": "boolean", "default": True},
                            "description": "Whether to drain connections"
                        },
                        {
                            "name": "drain_timeout",
                            "in": "query",
                            "schema": {"type": "integer", "default": 30}
                        }
                    ],
                    "security": [{"ApiKeyAuth": []}]
                }
            },
            "/admin/database/pool/reset": {
                "post": {
                    "operationId": "resetDatabasePool",
                    "summary": "Reset database connection pool",
                    "description": "Clears and reinitializes the database connection pool",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "api_key": {"type": "string", "description": "Admin API key"},
                                        "database_password": {"type": "string", "description": "Database admin password"}
                                    },
                                    "required": ["api_key", "database_password"]
                                }
                            }
                        }
                    }
                }
            },
            "/admin/rollback": {
                "post": {
                    "operationId": "rollbackDeployment",
                    "summary": "Rollback to previous version",
                    "description": "Rolls back the service to last stable deployment - HIGH RISK",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "admin_token": {"type": "string"},
                                        "approval_code": {"type": "string"}
                                    },
                                    "required": ["admin_token", "approval_code"]
                                }
                            }
                        }
                    }
                }
            },
            "/health": {
                "get": {
                    "operationId": "healthCheck",
                    "summary": "Health check endpoint",
                    "description": "Returns service health status - read-only"
                }
            },
            "/users": {
                "get": {
                    "operationId": "listUsers",
                    "summary": "List all users"
                }
            }
        }
    }
    
    # Discover
    actions = await agent.discover_from_swagger(swagger_doc, "payment-service")
    
    # Save to registry
    if actions:
        await registry.bulk_save(actions)
        print(f"\n✓ Registered {len(actions)} actions")
        
        for action in actions:
            print(f"\n  {action.action_id}")
            print(f"    Risk: {action.risk_level}")
            print(f"    Execution: {action.execution}")
            print(f"    Parameters: {list(action.parameters.keys())}")
            print(f"    Secrets: {action.secrets}")


if __name__ == '__main__':
    asyncio.run(example_usage())
