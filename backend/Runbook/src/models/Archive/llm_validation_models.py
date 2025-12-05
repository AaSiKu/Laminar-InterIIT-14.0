"""
Validation and Confidence Models for LLM Discovery Pipeline
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from src.core.runbook_registry import RemediationAction


class ValidationIssue(BaseModel):
    """Single validation issue"""
    severity: str = Field(description="critical, high, medium, low")
    field: str = Field(description="Field name with issue")
    problem: str = Field(description="What's wrong")
    fix: str = Field(description="How to fix it")


class ValidationResult(BaseModel):
    """Result of semantic validation"""
    valid: bool = Field(description="Overall validity")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    issues: List[ValidationIssue] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)


class ActionWithConfidence(BaseModel):
    """RemediationAction with confidence metadata"""
    action: RemediationAction
    confidence: float = Field(ge=0.0, le=1.0, description="Generation confidence")
    reasoning: str = Field(description="Why this confidence level")
    ambiguities: List[str] = Field(default_factory=list, description="Unclear aspects")


class EndpointCandidate(BaseModel):
    """Scored endpoint candidate for discovery"""
    endpoint: str = Field(description="API path")
    method: str = Field(description="HTTP method")
    relevance_score: float = Field(ge=0.0, le=1.0, description="Remediation relevance")
    reason: str = Field(description="Why this score")
    confidence: str = Field(description="high, medium, low")


class DiscoveryStats(BaseModel):
    """Statistics from discovery pipeline"""
    total_candidates: int
    analyzed: int
    high_confidence: int
    medium_confidence: int
    low_confidence: int
    auto_saved: int
    pending_review: int
    failed: int
