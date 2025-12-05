"""
Request schemas for the report generation API.
Defines the structure and validation rules for incoming requests.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime


class ErrorCitation(BaseModel):
    """Schema for a specific error log citation."""
    timestamp: str = Field(..., description="Timestamp of the log entry")
    service: str = Field(..., description="Service or scope name where the error occurred")
    message: str = Field(..., description="Relevant error message or excerpt from the log body")
    
    class Config:
        json_schema_extra = {
            "example": {
                "timestamp": "2024-03-15T14:30:00Z",
                "service": "transform-001",
                "message": "GC overhead detected: Old Gen collection took 2.3s, heap 89%"
            }
        }


class RCAOutputSchema(BaseModel):
    """Schema for Root Cause Analysis output - matches RCAAnalysisOutput from agentic/rca/output.py."""
    severity: str = Field(..., description="Impact severity of the failure (CRITICAL, HIGH, MEDIUM, LOW)")
    affected_services: List[str] = Field(..., description="List of services affected by this issue, with primary service first")
    narrative: str = Field(..., description="Clear, concise explanation of what happened and why (max 5 sentences)")
    error_citations: List[ErrorCitation] = Field(..., description="2-5 specific log entries that support the analysis", min_length=2, max_length=5)
    root_cause: str = Field(..., description="Technical root cause of the failure (be specific and actionable)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "severity": "CRITICAL",
                "affected_services": ["transform-001", "ml-tide-001"],
                "narrative": "Critical SLA breach detected on Transformation Node following deployment v1.3. P99 latency spiked from 85ms to 342ms causing timeout errors and downstream backpressure, affecting 12,487 transactions.",
                "error_citations": [
                    {
                        "timestamp": "2024-03-15T14:30:00Z",
                        "service": "transform-001",
                        "message": "GC overhead detected: Old Gen collection took 2.3s, heap 89%"
                    },
                    {
                        "timestamp": "2024-03-15T14:35:00Z",
                        "service": "transform-001",
                        "message": "SLA breach: P99 latency 342ms exceeds threshold 200ms"
                    }
                ],
                "root_cause": "Bad deployment v1.3 introduced memory-intensive operations without sufficient container memory allocation, triggering frequent garbage collection pauses."
            }
        }


class IncidentReportRequest(BaseModel):
    """Request payload for generating an incident report from telemetry data RCA."""
    rca_output: RCAOutputSchema = Field(..., description="Root cause analysis results from telemetry data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "rca_output": {
                    "severity": "CRITICAL",
                    "affected_services": ["payment-service", "database-service"],
                    "narrative": "Critical performance degradation detected in payment service. Response times increased from 100ms to 3500ms causing transaction timeouts and customer impact.",
                    "error_citations": [
                        {
                            "timestamp": "2024-03-15T14:30:00Z",
                            "service": "payment-service",
                            "message": "Database connection pool exhausted: 50/50 connections in use"
                        },
                        {
                            "timestamp": "2024-03-15T14:32:00Z",
                            "service": "payment-service",
                            "message": "Response time SLA breach: P99 latency 3500ms exceeds 500ms threshold"
                        }
                    ],
                    "root_cause": "Database connection pool exhaustion due to long-running queries not releasing connections, combined with increased traffic load."
                }
            }
        }


class WeeklyReportRequest(BaseModel):
    """Request payload for generating a weekly summary report."""
    start_date: Optional[datetime] = Field(None, description="Start date for the weekly report period (optional, defaults to all reports)")
    end_date: Optional[datetime] = Field(None, description="End date for the weekly report period (optional, defaults to all reports)")
    cleanup_after_report: bool = Field(False, description="If True, deletes all incident reports from the document store after generating the weekly report")
    
    class Config:
        json_schema_extra = {
            "example": {
                "start_date": "2024-03-10T00:00:00Z",
                "end_date": "2024-03-17T00:00:00Z",
                "cleanup_after_report": False
            }
        }
