"""
Post-Execution Reviewer Agent
Analyzes execution results, learns from outcomes, and suggests improvements
"""

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ExecutionReview:
    """Results of post-execution analysis"""
    effectiveness_score: float  # 0.0 to 1.0
    summary: str
    what_went_well: List[str]
    improvements: List[str]
    runbook_updates: Optional[Dict[str, Any]]
    follow_up_actions: List[Dict[str, Any]]
    lessons_learned: List[str]
    should_create_runbook: bool = False
    should_update_runbook: bool = False


class PostExecutionReviewerAgent:
    """
    LLM agent that reviews execution results and learns from them
    Provides insights for continuous improvement
    """
    
    def __init__(
        self,
        llm_client,
        runbook_registry,
        model: str = "claude-3-5-sonnet-20241022"
    ):
        self.llm_client = llm_client
        self.registry = runbook_registry
        self.model = model
    
    async def analyze_execution(
        self,
        execution_result: Dict[str, Any],
        rca_result: Dict[str, Any],
        remediation_plan: Dict[str, Any],
        metrics_before: Dict[str, Any],
        metrics_after: Dict[str, Any]
    ) -> ExecutionReview:
        """
        Analyze execution outcome and generate review
        
        Args:
            execution_result: Execution status, duration, errors
            rca_result: Original RCA that led to remediation
            remediation_plan: The plan that was executed
            metrics_before: System metrics before execution
            metrics_after: System metrics after execution
        
        Returns:
            ExecutionReview with analysis and recommendations
        """
        
        # Build prompt for LLM
        prompt = self._build_reviewer_prompt(
            execution_result,
            rca_result,
            remediation_plan,
            metrics_before,
            metrics_after
        )
        
        # Call LLM
        try:
            response = await self._invoke_llm(prompt)
            
            # Parse response
            review_data = self._parse_llm_response(response)
            
            # Create ExecutionReview object
            review = ExecutionReview(
                effectiveness_score=review_data.get('effectiveness_score', 0.5),
                summary=review_data.get('summary', ''),
                what_went_well=review_data.get('what_went_well', []),
                improvements=review_data.get('improvements', []),
                runbook_updates=review_data.get('runbook_updates'),
                follow_up_actions=review_data.get('follow_up_actions', []),
                lessons_learned=review_data.get('lessons_learned', []),
                should_create_runbook=review_data.get('should_create_runbook', False),
                should_update_runbook=review_data.get('should_update_runbook', False)
            )
            
            logger.info(
                f"Execution review complete: effectiveness {review.effectiveness_score:.2f}, "
                f"{len(review.follow_up_actions)} follow-up actions"
            )
            
            # Apply runbook updates if recommended
            if review.should_update_runbook and review.runbook_updates:
                await self._apply_runbook_updates(review.runbook_updates)
            
            # Create new runbook if recommended
            if review.should_create_runbook:
                await self._create_new_runbook(rca_result, remediation_plan, execution_result)
            
            return review
            
        except Exception as e:
            logger.error(f"Failed to analyze execution: {e}")
            return self._create_fallback_review(execution_result)
    
    def _build_reviewer_prompt(
        self,
        execution_result: Dict[str, Any],
        rca_result: Dict[str, Any],
        remediation_plan: Dict[str, Any],
        metrics_before: Dict[str, Any],
        metrics_after: Dict[str, Any]
    ) -> str:
        """Build prompt for LLM to review execution"""
        
        # Calculate metric changes
        metric_changes = {}
        for key in metrics_before.keys():
            if key in metrics_after:
                before_val = metrics_before[key]
                after_val = metrics_after[key]
                if isinstance(before_val, (int, float)) and isinstance(after_val, (int, float)):
                    change_pct = ((after_val - before_val) / before_val * 100) if before_val != 0 else 0
                    metric_changes[key] = {
                        'before': before_val,
                        'after': after_val,
                        'change_pct': change_pct
                    }
        
        prompt = f"""You are an SRE reviewing an automated remediation execution.

EXECUTION SUMMARY:
Action: {remediation_plan.get('selected_remediation', 'unknown')}
Status: {execution_result.get('status', 'unknown')}
Duration: {execution_result.get('duration_seconds', 0)} seconds
Errors: {json.dumps(execution_result.get('errors', []))}

ORIGINAL PROBLEM:
Root cause: {rca_result.get('root_cause', 'unknown')}
Contributing factors: {json.dumps(rca_result.get('contributing_factors', []))}

METRICS COMPARISON:
{json.dumps(metric_changes, indent=2)}

BUSINESS IMPACT:
Expected recovery time: {remediation_plan.get('estimated_recovery_time_seconds', 0)}s
Actual recovery time: {execution_result.get('duration_seconds', 0)}s
Downtime: {execution_result.get('downtime_seconds', 0)}s
Estimated cost: ${execution_result.get('estimated_cost_impact', 0)}

TASK: Analyze the execution and provide comprehensive review.

Answer these questions:
1. Did the remediation work? How effectively?
2. What went well?
3. What could be improved?
4. Should we update the runbook with learnings?
5. Are there any follow-up actions needed?
6. What lessons can we learn?

Respond ONLY with valid JSON in this exact format:
{{
  "effectiveness_score": 0.95,
  "summary": "Highly effective remediation. Error rate dropped from 45% to 0.8% within 60 seconds...",
  "what_went_well": [
    "Graceful drain prevented transaction loss",
    "Recovery faster than estimated",
    "No rollback needed"
  ],
  "improvements": [
    "Human approval added 90s delay - consider auto-approval given success rate",
    "Root cause not addressed - will recur",
    "No alerting to product team"
  ],
  "runbook_updates": {{
    "should_update": true,
    "changes": [
      "Increase confidence threshold to 0.95",
      "Add auto-approval for off-peak hours",
      "Add post-execution step: Rate-limit endpoint"
    ]
  }},
  "follow_up_actions": [
    {{
      "action": "Create JIRA ticket",
      "assignee": "backend-team",
      "title": "Optimize query (add index)",
      "priority": "P1",
      "reason": "Root cause still exists"
    }},
    {{
      "action": "Rate-limit endpoint",
      "endpoint": "/api/v1/reports/generate",
      "limit": "10 requests/minute",
      "reason": "Prevent pool saturation"
    }}
  ],
  "lessons_learned": [
    "New feature deployments need query performance tests",
    "Connection pool sizing should be reviewed with new features"
  ],
  "should_create_runbook": false,
  "should_update_runbook": true
}}

IMPORTANT: Respond ONLY with the JSON object, no other text."""
        
        return prompt
    
    async def _invoke_llm(self, prompt: str, max_retries: int = 3) -> str:
        """Call LLM with retry logic"""
        
        for attempt in range(max_retries):
            try:
                response = await self.llm_client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    temperature=0.5,  # Lower temperature for analysis
                    messages=[{
                        "role": "user",
                        "content": prompt
                    }]
                )
                
                return response.content[0].text
                
            except Exception as e:
                logger.warning(f"LLM call attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise
    
    def _parse_llm_response(self, response_text: str) -> Dict[str, Any]:
        """Parse LLM JSON response"""
        
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if not json_match:
            raise ValueError(f"No JSON found in LLM response: {response_text[:200]}")
        
        json_str = json_match.group(0)
        
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON: {e}")
            raise ValueError(f"Invalid JSON from LLM: {e}")
        
        return data
    
    def _create_fallback_review(self, execution_result: Dict[str, Any]) -> ExecutionReview:
        """Create basic review when LLM fails"""
        
        status = execution_result.get('status', 'unknown')
        success = status in ['success', 'completed']
        
        return ExecutionReview(
            effectiveness_score=0.8 if success else 0.3,
            summary=f"Execution {status}. LLM analysis unavailable.",
            what_went_well=["Action executed"] if success else [],
            improvements=["LLM reviewer unavailable - manual review recommended"],
            runbook_updates=None,
            follow_up_actions=[],
            lessons_learned=[],
            should_create_runbook=False,
            should_update_runbook=False
        )
    
    async def _apply_runbook_updates(self, updates: Dict[str, Any]) -> None:
        """Apply recommended updates to runbook"""
        
        if not updates.get('should_update'):
            return
        
        changes = updates.get('changes', [])
        
        logger.info(f"Applying {len(changes)} runbook updates based on execution review")
        
        for change in changes:
            logger.info(f"  - {change}")
        
        # Update the runbook registry with learned improvements
        try:
            if hasattr(self, 'runbook_registry'):
                # Store improvements for this runbook
                if not hasattr(self.runbook_registry, '_runbook_improvements'):
                    self.runbook_registry._runbook_improvements = {}
                
                runbook_id = rca_result.get('matched_runbook_id', 'unknown')
                if runbook_id not in self.runbook_registry._runbook_improvements:
                    self.runbook_registry._runbook_improvements[runbook_id] = []
                
                self.runbook_registry._runbook_improvements[runbook_id].append({
                    'timestamp': datetime.utcnow().isoformat(),
                    'changes': changes
                })
                
                logger.info(f"Stored improvements for runbook {runbook_id}")
        except Exception as e:
            logger.warning(f"Could not update runbook registry: {e}")
    
    async def _create_new_runbook(
        self,
        rca_result: Dict[str, Any],
        remediation_plan: Dict[str, Any],
        execution_result: Dict[str, Any]
    ) -> None:
        """Create new runbook entry from successful remediation"""
        
        # Build runbook entry
        runbook_entry = {
            'error_pattern': {
                'error_type': rca_result.get('error_type'),
                'service_name': execution_result.get('service_name'),
                'confidence_threshold': 0.80
            },
            'remedial_action': {
                'action_id': remediation_plan.get('selected_remediation'),
                'action_type': remediation_plan.get('execution_plan', {}).get('type'),
                'endpoint': remediation_plan.get('execution_plan', {}).get('endpoint'),
                'risk_level': remediation_plan.get('risk_assessment', {}).get('level'),
                'requires_approval': False,
                'source': 'learned_from_execution',
                'created_at': execution_result.get('timestamp')
            }
        }
        
        logger.info(f"Created new runbook entry from execution: {runbook_entry['remedial_action']['action_id']}")
        
        # Register with registry
        # await self.registry.register_action(runbook_entry)
    
    async def generate_post_mortem(
        self,
        execution_review: ExecutionReview,
        rca_result: Dict[str, Any],
        remediation_plan: Dict[str, Any],
        timeline: List[Dict[str, Any]]
    ) -> str:
        """
        Generate comprehensive post-mortem document
        
        Args:
            execution_review: Review from analyze_execution
            rca_result: RCA results
            remediation_plan: Remediation plan executed
            timeline: Timeline of events
        
        Returns:
            Markdown-formatted post-mortem document
        """
        
        prompt = f"""Generate a comprehensive post-mortem document for this incident.

INCIDENT SUMMARY:
Root cause: {rca_result.get('root_cause')}
Service: {remediation_plan.get('execution_plan', {}).get('service_name', 'unknown')}

REMEDIATION:
Action: {remediation_plan.get('selected_remediation')}
Effectiveness: {execution_review.effectiveness_score:.0%}

REVIEW:
{json.dumps({{
    'what_went_well': execution_review.what_went_well,
    'improvements': execution_review.improvements,
    'lessons_learned': execution_review.lessons_learned
}}, indent=2)}

TIMELINE:
{json.dumps(timeline, indent=2)}

Generate a post-mortem document in this format:

# Incident Post-Mortem

## Summary
[Brief overview]

## Impact
[Business and technical impact]

## Root Cause
[Detailed explanation]

## Timeline
[Key events]

## Resolution
[What was done]

## What Went Well
[Successes]

## What Could Be Improved
[Areas for improvement]

## Action Items
[Follow-up tasks]

## Lessons Learned
[Key takeaways]

Respond with the markdown document."""
        
        try:
            response = await self._invoke_llm(prompt)
            return response
        except Exception as e:
            logger.error(f"Failed to generate post-mortem: {e}")
            return self._generate_basic_post_mortem(
                execution_review,
                rca_result,
                remediation_plan
            )
    
    def _generate_basic_post_mortem(
        self,
        execution_review: ExecutionReview,
        rca_result: Dict[str, Any],
        remediation_plan: Dict[str, Any]
    ) -> str:
        """Generate basic post-mortem when LLM fails"""
        
        return f"""# Incident Post-Mortem

## Summary
{rca_result.get('root_cause', 'Unknown')}

## Resolution
Executed: {remediation_plan.get('selected_remediation')}
Effectiveness: {execution_review.effectiveness_score:.0%}

## What Went Well
{chr(10).join(f'- {item}' for item in execution_review.what_went_well)}

## What Could Be Improved
{chr(10).join(f'- {item}' for item in execution_review.improvements)}

## Lessons Learned
{chr(10).join(f'- {item}' for item in execution_review.lessons_learned)}

## Follow-Up Actions
{chr(10).join(f'- {action.get("action")}: {action.get("title")}' for action in execution_review.follow_up_actions)}
"""
