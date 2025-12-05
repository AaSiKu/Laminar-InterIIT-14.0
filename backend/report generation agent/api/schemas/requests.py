"""
Request schemas for the report generation API.
Defines the structure and validation rules for incoming requests.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime


class PipelineStepSchema(BaseModel):
    """Schema for a single step in the data pipeline."""
    step_id: str = Field(..., description="Unique identifier for the pipeline step")
    step_name: str = Field(..., description="Human-readable name of the step")
    step_type: str = Field(..., description="Type of operation (e.g., 'transformation', 'aggregation')")
    dependencies: List[str] = Field(default_factory=list, description="List of step IDs this step depends on")
    
    class Config:
        json_schema_extra = {
            "example": {
                "step_id": "step_001",
                "step_name": "Data Ingestion",
                "step_type": "source",
                "dependencies": []
            }
        }


class PipelineTopologySchema(BaseModel):
    """Schema for the complete data pipeline topology."""
    pipeline_name: str = Field(..., description="Name of the data pipeline")
    steps: List[PipelineStepSchema] = Field(..., description="List of pipeline steps in order")
    
    class Config:
        json_schema_extra = {
            "example": {
                "pipeline_name": "Customer Analytics Pipeline",
                "steps": [
                    {
                        "step_id": "step_001",
                        "step_name": "Data Ingestion",
                        "step_type": "source",
                        "dependencies": []
                    }
                ]
            }
        }


class AffectedComponentSchema(BaseModel):
    """Schema for a component affected by the incident."""
    component_name: str = Field(..., description="Name of the affected component")
    impact_level: str = Field(..., description="Impact severity (e.g., 'critical', 'high', 'medium')")
    error_details: Optional[str] = Field(None, description="Specific error messages or details")
    
    class Config:
        json_schema_extra = {
            "example": {
                "component_name": "Data Warehouse Connector",
                "impact_level": "critical",
                "error_details": "Connection timeout after 30 seconds"
            }
        }


class RCAOutputSchema(BaseModel):
    """Schema for Root Cause Analysis output."""
    incident_id: str = Field(..., description="Unique identifier for the incident")
    incident_time: datetime = Field(..., description="Timestamp when the incident occurred")
    severity: str = Field(..., description="Severity level (critical, high, medium, low)")
    root_cause: str = Field(..., description="Identified root cause of the incident")
    affected_components: List[AffectedComponentSchema] = Field(..., description="List of affected components")
    resolution_steps: List[str] = Field(..., description="Steps taken or recommended to resolve the issue")
    additional_context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Any additional metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "incident_id": "INC-2024-001",
                "incident_time": "2024-03-15T14:30:00Z",
                "severity": "critical",
                "root_cause": "Database connection pool exhausted",
                "affected_components": [
                    {
                        "component_name": "Data Warehouse Connector",
                        "impact_level": "critical",
                        "error_details": "Connection timeout after 30 seconds"
                    }
                ],
                "resolution_steps": [
                    "Increased connection pool size from 10 to 50",
                    "Implemented connection timeout handling"
                ],
                "additional_context": {
                    "detected_by": "monitoring_system",
                    "alert_triggered": True
                }
            }
        }


class IncidentReportRequest(BaseModel):
    """Request payload for generating an incident report."""
    pipeline_topology: PipelineTopologySchema = Field(..., description="Structure of the data pipeline")
    rca_output: RCAOutputSchema = Field(..., description="Root cause analysis results")
    
    class Config:
        json_schema_extra = {
            "example": {
                "pipeline_topology": {
                    "pipeline_name": "Customer Analytics Pipeline",
                    "steps": []
                },
                "rca_output": {
                    "incident_id": "INC-2024-001",
                    "incident_time": "2024-03-15T14:30:00Z",
                    "severity": "critical",
                    "root_cause": "Database connection pool exhausted",
                    "affected_components": [],
                    "resolution_steps": []
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
