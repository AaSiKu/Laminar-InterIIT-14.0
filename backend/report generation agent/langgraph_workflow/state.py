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
    
    # Parallel processing outputs
    matched_rules: List[Dict[str, Any]]
    chart_data: List[Dict[str, Any]]
    
    # Chart generation output
    charts: List[Dict[str, str]]
    
    # Final output
    final_report: str
    
    # Metadata
    execution_time: float
    error: str
