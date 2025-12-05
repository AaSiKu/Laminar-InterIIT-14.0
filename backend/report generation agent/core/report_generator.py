"""
Core incident report generation logic.
Handles the workflow execution for generating incident reports.
"""

import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, Tuple
from pathlib import Path

# Add parent directories to path to import from agentic module
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(backend_path / "agentic"))

# Import from agentic module using absolute imports
import llm_config
import llm_factory

from langgraph_workflow import create_workflow, ReportState
from document_store_manager import get_incident_store


def generate_incident_report(
    pipeline_topology: Dict[str, Any],
    rca_output: Dict[str, Any]
) -> Tuple[str, Dict[str, Any]]:
    """
    Generate an incident report using the LangGraph multi-agent workflow.
    
    Args:
        pipeline_topology: Structure and configuration of the data pipeline
        rca_output: Root cause analysis results from the diagnostic system
        
    Returns:
        Tuple of (report_content, metadata) where metadata includes:
            - report_id: Unique identifier for the report
            - filepath: Location where report was saved
            - severity: Severity level of the incident
            - execution_time: Time taken to generate report
            - incident_id: ID from RCA output
            
    Raises:
        ValueError: If required LLM configuration is missing
        Exception: If workflow execution fails
    """
    # Create LLM models using the unified factory
    # Planner and ChartGen use agent models, Drafter uses reasoning
    try:
        agent_model = llm_factory.create_agent_model()
        reasoning_model = llm_factory.create_reasoning_model()
    except Exception as e:
        raise ValueError(
            f"Failed to create LLM models from factory: {str(e)}. "
            "Ensure API keys are set in backend/agentic/.env"
        )
    
    # Prepare diagnostic data structure expected by workflow
    diagnostic_data = {
        "pipeline_topology": pipeline_topology,
        "rca_output": rca_output
    }
    
    # Initialize workflow with LLM models from factory
    workflow = create_workflow(agent_model, reasoning_model)
    
    # Initialize state for the multi-agent workflow
    initial_state: ReportState = {
        "diagnostic_data": diagnostic_data,
        "report_plan": {},
        "matched_rules": [],
        "chart_data": [],
        "charts": [],
        "final_report": "",
        "execution_time": 0.0,
        "error": ""
    }
    
    # Execute the workflow (Planner -> Rules/Charts -> ChartGen -> Drafter)
    start_time = time.time()
    final_state = workflow.invoke(initial_state)
    execution_time = time.time() - start_time
    
    # Check for workflow errors
    if final_state.get("error"):
        raise Exception(f"Workflow execution failed: {final_state['error']}")
    
    report_content = final_state["final_report"]
    
    # Extract metadata from RCA output
    severity = rca_output.get("severity", "unknown").lower()
    incident_id = rca_output.get("incident_id", "UNKNOWN")
    affected_node = rca_output.get("affected_node", "unknown")
    
    # Save and index the report if severity warrants it
    metadata = {
        "incident_id": incident_id,
        "severity": severity,
        "execution_time": execution_time,
        "generated_at": datetime.now()
    }
    
    if severity in ["critical", "high", "medium"]:
        # Use document store to save and index the report
        incident_store = get_incident_store()
        
        store_metadata = incident_store.store_incident_report(
            report_markdown=report_content,
            incident_id=incident_id,
            severity=severity,
            affected_node=affected_node,
            timestamp=datetime.now()
        )
        
        # Use filename without extension as report_id
        metadata["report_id"] = store_metadata["filename"].replace(".md", "")
        metadata["filepath"] = store_metadata["filepath"]
    else:
        # Low severity reports are not indexed, just save with basic naming
        from pathlib import Path
        reports_dir = Path("reports")
        reports_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"report_{timestamp}_{severity}.md"
        filepath = reports_dir / filename
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(report_content)
        
        metadata["report_id"] = filename.replace(".md", "")
        metadata["filepath"] = str(filepath)
    
    return report_content, metadata
