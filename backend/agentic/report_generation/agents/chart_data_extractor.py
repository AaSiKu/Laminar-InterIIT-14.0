"""
Chart Data Extractor: No longer used - reports are text/table based only
NO LLM - Pure data transformation (DEPRECATED)
"""

from typing import Dict, Any, List


class ChartDataExtractor:
    """
    DEPRECATED: Charts are no longer generated for telemetry-based reports.
    All data is presented in tables and text format.
    """
    
    def __init__(self):
        pass
    
    def extract(self, diagnostic_data: Dict[str, Any], chart_requirements: List[str]) -> List[Dict[str, Any]]:
        """
        Extract chart-ready data based on requirements.
        
        NOTE: This now returns an empty list as charts are no longer used.
        All visualizations are done through tables and formatted text.
        
        Args:
            diagnostic_data: Complete diagnostic inputs
            chart_requirements: List of chart descriptions from planner (ignored)
            
        Returns:
            Empty list (charts disabled for telemetry-based reports)
        """
        # Return empty list - no charts for telemetry-based reports
        return []
