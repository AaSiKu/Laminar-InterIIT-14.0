"""
State definition for LangGraph workflow
"""

from typing import TypedDict, Dict, Any, List


class ReportState(TypedDict):
    """
    State object passed through the LangGraph workflow.
    Each node reads from and writes to this state.
    """
    
    # Inputs
    diagnostic_data: Dict[str, Any]
    
    # Planner outputs
    report_plan: Dict[str, Any]
    
    # Rule matching output
    matched_rules: List[Dict[str, Any]]
    
    # Final output
    final_report: str
    
    # Metadata
    execution_time: float
    error: str
