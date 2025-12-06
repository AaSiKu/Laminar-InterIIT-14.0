from pydantic import BaseModel, Field
from typing import List, Literal, Dict, Any

class ErrorCitation(BaseModel):
    timestamp: str = Field(description="Timestamp of the log entry")
    service: str = Field(description="Service or scope name where the error occurred")
    message: str = Field(description="Relevant error message or excerpt from the log body")

class FinancialImpact(BaseModel):
    """Financial impact estimation for the incident (hardcoded values for demo)"""
    estimated_loss_usd: float = Field(description="Estimated financial loss in USD")
    affected_transactions: int = Field(description="Number of transactions affected")
    duration_minutes: int = Field(description="Duration of the incident in minutes")

class RCAAnalysisOutput(BaseModel):
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"] = Field(
        description="Impact severity of the failure"
    )
    affected_services: List[str] = Field(
        description="List of services affected by this issue, with primary service first"
    )
    narrative: str = Field(
        description="Clear, concise explanation of what happened and why (max 5 sentences)"
    )
    error_citations: List[ErrorCitation] = Field(
        description="2-5 specific log entries that support the analysis",
        min_length=2,
        max_length=5
    )
    root_cause: str = Field(
        description="Technical root cause of the failure (be specific and actionable)"
    )
    financial_impact: FinancialImpact = Field(
        description="Estimated financial impact (hardcoded demo values)"
    )