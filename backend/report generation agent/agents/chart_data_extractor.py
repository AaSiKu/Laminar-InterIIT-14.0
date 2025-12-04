"""
Chart Data Extractor: Extracts time-series and metric data for chart generation
NO LLM - Pure data transformation
"""

from typing import Dict, Any, List


class ChartDataExtractor:
    """
    Extracts and structures data for chart generation.
    (no llm calls, just extracting data to build charts from)
    """
    
    def __init__(self):
        pass
    
    def extract(self, diagnostic_data: Dict[str, Any], chart_requirements: List[str]) -> List[Dict[str, Any]]:
        """
        Extract chart-ready data based on requirements.
        
        Args:
            diagnostic_data: Complete diagnostic inputs
            chart_requirements: List of chart descriptions from planner
            
        Returns:
            List of chart data structures
        """
        rca = diagnostic_data.get("rca_output", {})
        topology = diagnostic_data.get("pipeline_topology", {})
        
        chart_data = []
        
        # Only extract structural/architectural charts (skip time-series)
        for requirement in chart_requirements:
            req_lower = requirement.lower()
            
            # SKIP time-series charts (make tables for those instead)
            if any(keyword in req_lower for keyword in ["latency", "throughput", "error", "trend", "timeline"]):
                continue
            
            # Pipeline topology / architecture chart
            if "pipeline" in req_lower or "topology" in req_lower or "architecture" in req_lower or "flow" in req_lower:
                affected_node = rca.get("affected_node", "")
                downstream_nodes = rca.get("impact", {}).get("downstream_nodes", []) if isinstance(rca.get("impact"), dict) else []
                
                chart_data.append({
                    "type": "flowchart",
                    "title": "Pipeline Topology",
                    "description": requirement,
                    "data": {
                        "nodes": topology.get("nodes", []),
                        "edges": topology.get("edges", []),
                        "affected_node": affected_node,
                        "downstream_impact": downstream_nodes
                    }
                })
        
        return chart_data
