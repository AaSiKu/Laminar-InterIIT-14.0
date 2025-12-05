"""
Multi-Agent Discovery Pipeline - Improved Robustness

This module implements the improved discovery pipeline with:
- Analyzer Agent: Scores and filters candidates
- Generator Agent: Creates actions with reasoning chains
- Validator Agent: Semantic validation beyond schema
- Enrichment Agent: Fills gaps in low-quality outputs
"""

import asyncio
import json
import textwrap
from typing import List, Dict, Any, Optional

from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI

from src.core.config import get_config
from src.core.runbook_registry import RemediationAction
from src.models.llm_validation_models import (
    EndpointCandidate, ActionWithConfidence, ValidationResult, 
    ValidationIssue, DiscoveryStats
)


class EndpointCandidates(BaseModel):
    """Container for endpoint candidates"""
    candidates: List[EndpointCandidate]


class AnalyzerAgent:
    """Phase 1: Analyze and score remediation candidates"""
    
    def __init__(self, llm: ChatGoogleGenerativeAI):
        self.llm = llm
    
    async def analyze_swagger_endpoints(
        self, 
        swagger_doc: Dict[str, Any], 
        service_name: str
    ) -> List[EndpointCandidate]:
        """Score endpoints for remediation relevance"""
        
        system_prompt = """
You are a remediation endpoint analyzer. Your ONLY job is to score endpoints.

## Task
For each endpoint, output:
{
  "endpoint": "/path",
  "method": "POST",
  "relevance_score": 0.0-1.0,
  "reason": "Why this is/isn't remediation-related",
  "confidence": "high/medium/low"
}

## Scoring Criteria

**Score 0.9-1.0** (Definitely Remediation):
- Endpoint name: restart, reset, clear, flush, drain, scale, heal, rollback, failover
- Tags: admin, operations, maintenance, recovery
- Mutates system state (POST/PUT/DELETE)
- Example: POST /admin/cache/clear → 0.95

**Score 0.5-0.8** (Possibly Remediation):
- Diagnostic endpoints: health, metrics, status with deep checks
- Bulk operations on system resources
- Configuration updates
- Example: GET /admin/health/deep → 0.7

**Score 0.0-0.4** (Not Remediation):
- Business CRUD: users, orders, products, customers
- Read-only data queries
- Authentication endpoints
- Example: GET /api/users → 0.1

## Output Format
Return ONLY valid JSON array, no explanations outside JSON.
"""
        
        # Extract paths summary (not full spec to save tokens)
        paths_summary = []
        for path, methods in swagger_doc.get('paths', {}).items():
            for method, spec in methods.items():
                paths_summary.append({
                    'path': path,
                    'method': method.upper(),
                    'summary': spec.get('summary', ''),
                    'operationId': spec.get('operationId', ''),
                    'tags': spec.get('tags', [])
                })
        
        user_prompt = f"""
Service: {service_name}

Analyze these endpoints:
{json.dumps(paths_summary, indent=2)}

Return JSON array of scored endpoints.
"""
        
        try:
            # Use structured output with Pydantic
            structured_llm = self.llm.with_structured_output(EndpointCandidates)
            
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            result = await structured_llm.ainvoke(full_prompt)
            
            # Filter: Only candidates with score > 0.6
            return [c for c in result.candidates if c.relevance_score > 0.6]
            
        except Exception as e:
            print(f"Analyzer error: {e}")
            print(f"Attempting fallback to simple heuristic scoring...")
            
            # Fallback: Simple keyword matching
            fallback_candidates = []
            for path, methods in swagger_doc.get('paths', {}).items():
                for method, spec in methods.items():
                    # Check for remediation keywords
                    text = f"{path} {spec.get('summary', '')} {spec.get('operationId', '')}"
                    text_lower = text.lower()
                    
                    if any(kw in text_lower for kw in ['restart', 'reset', 'clear', 'flush', 'scale', 'health', 'admin']):
                        if not any(kw in text_lower for kw in ['user', 'order', 'product', 'customer']):
                            fallback_candidates.append(EndpointCandidate(
                                endpoint=path,
                                method=method.upper(),
                                relevance_score=0.7,
                                reason="Keyword match (fallback)",
                                confidence="medium"
                            ))
            
            return fallback_candidates


class GeneratorAgent:
    """Phase 2: Generate single action with deep reasoning"""
    
    def __init__(self, llm: ChatGoogleGenerativeAI):
        self.llm = llm
    
    async def generate_action_with_confidence(
        self,
        endpoint: str,
        method: str,
        endpoint_spec: Dict[str, Any],
        service_name: str,
        full_swagger: Dict[str, Any]
    ) -> ActionWithConfidence:
        """Generate ONE complete action with confidence assessment"""
        
        system_prompt = f"""
You are a RemediationAction generator. Create ONE complete action.

## Reasoning Process (You MUST follow this order)

### Step 1: Understand the Operation
- What does this endpoint DO?
- What systems does it affect?
- What are the prerequisites?

### Step 2: Extract Technical Details
- HTTP method, path, content-type
- Required parameters (path, query, body)
- Authentication requirements

### Step 3: Assess Risk
- High: Deletes data, terminates processes, affects production
- Medium: Restarts services, clears caches, modifies config
- Low: Read-only diagnostics, health checks

### Step 4: Generate action_id
Format: {{risk_level}}-{{operation}}-{{resource}}-{{service}}
Example: medium-restart-cache-payment-service

### Step 5: Populate ALL Fields
Check: execution ≠ {{}}, parameters ≠ {{}}, action_metadata ≠ {{}}

## Self-Validation Checklist
Before returning, verify:
[ ] action_id is unique and descriptive
[ ] definition explains WHAT, WHEN, IMPACT (not just "does X")
[ ] execution contains endpoint, http_method, content_type
[ ] parameters extracted from schema (with types, defaults)
[ ] secrets identified (api_key, password, token, etc.)
[ ] risk_level matches operation type
[ ] requires_approval = true for medium/high risk
[ ] action_metadata has operationId, tags, estimated_runtime

## Confidence Assessment
After generating, assess your confidence:

**0.9-1.0 (HIGH)**: 
- Spec is complete and unambiguous
- All fields have clear values
- Risk level is obvious

**0.6-0.8 (MEDIUM)**:
- Spec has some missing details
- Need to infer some parameters
- Unclear whether requires approval

**0.0-0.5 (LOW)**:
- Spec is very incomplete
- Many assumptions required
- Unclear what endpoint actually does

## Output Format (JSON)
{{
  "action": {{
    "action_id": "...",
    "method": "rpc",
    "service": "{service_name}",
    "definition": "ACTION: ... | WHEN: ... | IMPACT: ...",
    "requires_approval": true,
    "risk_level": "medium",
    "validated": false,
    "execution": {{"endpoint": "...", "http_method": "...", "content_type": "application/json"}},
    "parameters": {{"param": {{"type": "...", "required": true, "description": "..."}}}},
    "secrets": ["api_key"],
    "action_metadata": {{"operationId": "...", "tags": [...], "estimated_runtime_seconds": 30}}
  }},
  "confidence": 0.85,
  "reasoning": "Spec is mostly complete but...",
  "ambiguities": ["Parameter X default value unclear"]
}}

Return ONLY valid JSON.
"""
        
        user_prompt = f"""
Service: {service_name}
Endpoint: {endpoint} ({method})

Full Specification:
{json.dumps(endpoint_spec, indent=2)}

Global Context:
- Base URL: {full_swagger.get('servers', [{}])[0].get('url', 'N/A')}
- Security: {json.dumps(full_swagger.get('components', {}).get('securitySchemes', {}), indent=2)}

Generate ONE complete RemediationAction with confidence assessment.
Follow the reasoning process step-by-step.
"""
        
        try:
            # Use structured output
            structured_llm = self.llm.with_structured_output(ActionWithConfidence)
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            result = await structured_llm.ainvoke(full_prompt)
            return result
            
        except Exception as e:
            print(f"Generator error for {endpoint}: {e}")
            # Return low-confidence placeholder
            return ActionWithConfidence(
                action=RemediationAction(
                    action_id=f"failed-{endpoint.replace('/', '-')}",
                    method="rpc",
                    service=service_name,
                    definition=f"Failed to generate from {endpoint}",
                    requires_approval=True,
                    risk_level="high",
                    validated=False,
                    execution={},
                    parameters={},
                    secrets=[],
                    action_metadata={"error": str(e)}
                ),
                confidence=0.0,
                reasoning=f"Generation failed: {e}",
                ambiguities=["Complete failure"]
            )


class ValidatorAgent:
    """Phase 3: Semantic validation beyond schema"""
    
    def __init__(self, llm: ChatGoogleGenerativeAI):
        self.llm = llm
    
    async def validate_action(
        self, 
        action_with_conf: ActionWithConfidence,
        original_spec: Dict[str, Any]
    ) -> ValidationResult:
        """Validate semantic correctness"""
        
        system_prompt = """
You are a RemediationAction validator. Find problems in generated actions.

## Validation Checks

### 1. Completeness (CRITICAL)
- [ ] execution.endpoint matches spec path
- [ ] execution.http_method matches spec method
- [ ] All required parameters present
- [ ] Secrets list includes auth fields

### 2. Correctness (HIGH)
- [ ] risk_level appropriate for operation type
- [ ] requires_approval = true for destructive ops
- [ ] parameter types match spec types
- [ ] defaults match spec defaults

### 3. Clarity (MEDIUM)
- [ ] definition explains WHAT/WHEN/IMPACT (not just "does X")
- [ ] action_id is descriptive (not generic)
- [ ] metadata includes estimated_runtime

### 4. Safety (CRITICAL)
- [ ] No hardcoded credentials in execution
- [ ] Destructive operations require approval
- [ ] Timeout specified for long-running ops

## Output Format (JSON)
{
  "valid": true/false,
  "confidence": 0.0-1.0,
  "issues": [
    {"severity": "critical", "field": "execution", "problem": "Empty execution dict", "fix": "Populate with endpoint, http_method, content_type"}
  ],
  "suggestions": ["Add timeout_seconds to execution", "Enhance definition with WHEN context"]
}

Return ONLY valid JSON.
"""
        
        user_prompt = f"""
Validate this action against the original specification.

Action:
{action_with_conf.action.model_dump_json(indent=2)}

Generation Confidence: {action_with_conf.confidence}
Ambiguities: {action_with_conf.ambiguities}

Original Spec:
{json.dumps(original_spec, indent=2)}

Find ALL issues. Be thorough.
"""
        
        try:
            # Use structured output
            structured_llm = self.llm.with_structured_output(ValidationResult)
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            result = await structured_llm.ainvoke(full_prompt)
            return result
            
        except Exception as e:
            print(f"Validator error: {e}")
            return ValidationResult(
                valid=False,
                confidence=0.0,
                issues=[ValidationIssue(
                    severity="critical",
                    field="validation",
                    problem=f"Validation failed: {e}",
                    fix="Manual review required"
                )],
                suggestions=[]
            )


class EnrichmentAgent:
    """Phase 4: Fill gaps in low-quality outputs"""
    
    def __init__(self, llm: ChatGoogleGenerativeAI):
        self.llm = llm
    
    async def enrich_action(
        self,
        action: RemediationAction,
        validation: ValidationResult,
        original_spec: Dict[str, Any]
    ) -> RemediationAction:
        """Fix specific issues identified by validator"""
        
        if validation.confidence > 0.9:
            return action  # Already high quality
        
        system_prompt = """
You are an enrichment agent. Fix specific issues in RemediationActions.

## Task
Given an action and a list of issues, return the FIXED action.

## Guidelines
- Add missing parameters with sensible defaults
- Enhance descriptions (add WHEN/WHY/IMPACT context)
- Fill empty execution fields
- Add estimated_runtime to metadata
- Ensure secrets list is complete
- Fix type mismatches

## Output Format
Return the complete FIXED RemediationAction as JSON (the action object only, not wrapped).

Return ONLY valid JSON matching RemediationAction schema.
"""
        
        user_prompt = f"""
Original Action:
{action.model_dump_json(indent=2)}

Issues to Fix:
{json.dumps([i.model_dump() for i in validation.issues], indent=2)}

Suggestions:
{json.dumps(validation.suggestions, indent=2)}

Original Spec (for reference):
{json.dumps(original_spec, indent=2)}

Return the enriched action with ALL issues resolved.
"""
        
        try:
            # Use structured output
            structured_llm = self.llm.with_structured_output(RemediationAction)
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            enriched = await structured_llm.ainvoke(full_prompt)
            return enriched
            
        except Exception as e:
            print(f"Enrichment error: {e}")
            return action  # Return original if enrichment fails


class ImprovedDiscoveryPipeline:
    """Multi-agent discovery pipeline with validation"""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        cfg = get_config()
        api_key = api_key or cfg.google_api_key
        model = model or cfg.llm_model
        
        if not api_key:
            raise ValueError("Google AI API key required")
        
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=cfg.llm_temperature,
            max_tokens=cfg.llm_max_tokens,
            timeout=cfg.llm_timeout,
            max_retries=2
        )
        
        self.analyzer = AnalyzerAgent(self.llm)
        self.generator = GeneratorAgent(self.llm)
        self.validator = ValidatorAgent(self.llm)
        self.enrichment = EnrichmentAgent(self.llm)
    
    async def discover_from_swagger_improved(
        self,
        swagger_doc: Dict[str, Any],
        service_name: str,
        confidence_threshold: float = 0.8
    ) -> Dict[str, Any]:
        """
        Improved discovery with multi-agent pipeline
        
        Returns:
            {
                'high_confidence': [actions],  # Auto-save these
                'medium_confidence': [actions],  # Human review
                'low_confidence': [actions],  # Manual creation needed
                'stats': DiscoveryStats
            }
        """
        
        if not swagger_doc or not service_name:
            return {'high_confidence': [], 'medium_confidence': [], 'low_confidence': [], 'stats': None}
        
        # Phase 1: Analyze and score endpoints
        print(f"[Analyzer] Scoring endpoints...")
        candidates = await self.analyzer.analyze_swagger_endpoints(swagger_doc, service_name)
        print(f"[Analyzer] Found {len(candidates)} remediation candidates")
        
        # Phase 2: Generate actions with confidence
        print(f"[Generator] Generating actions...")
        all_results = []
        
        for candidate in candidates:
            # Get full spec for this endpoint
            endpoint_spec = swagger_doc['paths'][candidate.endpoint][candidate.method.lower()]
            
            result = await self.generator.generate_action_with_confidence(
                endpoint=candidate.endpoint,
                method=candidate.method,
                endpoint_spec=endpoint_spec,
                service_name=service_name,
                full_swagger=swagger_doc
            )
            all_results.append((candidate, result, endpoint_spec))
        
        # Phase 3: Validate each action
        print(f"[Validator] Validating {len(all_results)} actions...")
        validated_results = []
        
        for candidate, action_conf, spec in all_results:
            validation = await self.validator.validate_action(action_conf, spec)
            validated_results.append((action_conf, validation, spec))
        
        # Phase 4: Enrich low-quality actions
        print(f"[Enrichment] Enriching low-confidence actions...")
        final_results = []
        
        for action_conf, validation, spec in validated_results:
            if validation.confidence < 0.7:
                # Try to enrich
                enriched_action = await self.enrichment.enrich_action(
                    action_conf.action, 
                    validation, 
                    spec
                )
                # Update confidence based on enrichment
                final_conf = min(validation.confidence + 0.1, 1.0)
                final_results.append(ActionWithConfidence(
                    action=enriched_action,
                    confidence=final_conf,
                    reasoning=f"Enriched from {action_conf.confidence} (validation: {validation.confidence})",
                    ambiguities=action_conf.ambiguities
                ))
            else:
                # Keep original with updated confidence from validation
                final_results.append(ActionWithConfidence(
                    action=action_conf.action,
                    confidence=validation.confidence,
                    reasoning=action_conf.reasoning,
                    ambiguities=action_conf.ambiguities
                ))
        
        # Categorize by confidence
        high_conf = [r for r in final_results if r.confidence >= confidence_threshold]
        medium_conf = [r for r in final_results if 0.5 <= r.confidence < confidence_threshold]
        low_conf = [r for r in final_results if r.confidence < 0.5]
        
        stats = DiscoveryStats(
            total_candidates=len(candidates),
            analyzed=len(all_results),
            high_confidence=len(high_conf),
            medium_confidence=len(medium_conf),
            low_confidence=len(low_conf),
            auto_saved=0,  # Caller decides
            pending_review=len(medium_conf),
            failed=len(low_conf)
        )
        
        print(f"\n[Stats] High: {len(high_conf)}, Medium: {len(medium_conf)}, Low: {len(low_conf)}")
        
        return {
            'high_confidence': [r.action for r in high_conf],
            'medium_confidence': [r.action for r in medium_conf],
            'low_confidence': [r.action for r in low_conf],
            'stats': stats,
            'all_results': final_results  # Include full metadata
        }
