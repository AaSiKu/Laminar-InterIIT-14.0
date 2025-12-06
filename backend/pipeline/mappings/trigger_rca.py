from lib.trigger_rca import TriggerRCANode
import pathway as pw
from ..types import Graph, MetricNodeDescription
import httpx
import os
from postgres_util import construct_table_name
import json
from datetime import datetime, timezone
import asyncio
agentic_url = os.getenv("AGENTIC_URL")

class RCAOutputSchema(pw.Schema):
    analysis: pw.Json


def trigger_rca(metric_table: pw.Table, node: TriggerRCANode, graph: Graph) -> pw.Table:
    # Retreive columns which contain trace ids relevent to the calculation of the metric connected to the TriggerRCA node
    metric: MetricNodeDescription = None
    metric_node_idx: int = None
    for idx,_met in graph["metric_node_descriptions"].items():
         if _met["description"] == node.metric_description:
              metric = _met
              metric_node_idx = idx
        
    semantic_origins = {}
    for special_col, origins in metric["special_columns_source_indexes"].items():
         semantic_origins[special_col] = [metric["pipeline_description_indexes_mapping"][origin] for origin in origins]
    
    if len(semantic_origins.keys()) == 0:
        raise Exception("Can only perform RCA on metrics derived from OpenTelemetry data")
    with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{agentic_url.rstrip('/')}/summarize",
                json={
                    "metric_description": metric["description"],
                    "pipeline_description": metric["pipeline_description"],
                    "semantic_origins": semantic_origins
                },
            )
            resp.raise_for_status()
            summarized_metric = resp.json()["summarized"]
    if summarized_metric["metric_type"] == "error":
        if len(semantic_origins.keys()) > 1:
            raise Exception("Currently RCA on an error-rate metric derived from multiple traces is not supported")
    if summarized_metric["metric_type"] == "uptime":
        if len(semantic_origins.keys()) > 1:
            raise Exception("Currently RCA on an uptime metric derived from multiple traces is not supported")
    if summarized_metric["metric_type"] == "latency":
        if len(semantic_origins.keys()) > 2:
            raise Exception("Currently RCA on a latency metric derived from more than 2 traces is not supported")
    
    spans_node_idx : int = None
    logs_node_idx: int = None

    for idx,node in enumerate(graph["nodes"]):
        if node.node_id == "open_tel_spans_input" and spans_node_idx is None:
            spans_node_idx = idx
        if node.node_id == "open_tel_logs_input" and logs_node_idx is None:
            logs_node_idx = idx
    if any(el is None for el in [spans_node_idx,logs_node_idx]):
        raise Exception("No tables for span/logs found. Cannot run RCA on metrics derived from non open telemetry sources")
    tables_data = {
        "spans": {
            "table_name": construct_table_name(graph["nodes"][spans_node_idx].node_id, spans_node_idx),
            # "table_schema": graph["node_outputs"][spans_node_idx].schema.columns_to_json_serializable_dict()
        },
        "logs": {
            "table_name": construct_table_name(graph["nodes"][logs_node_idx].node_id, logs_node_idx),
            # "table_schema": graph["node_outputs"][logs_node_idx].schema.columns_to_json_serializable_dict()
        },
        "sla_metric_trigger": {
            "table_name": construct_table_name(node.node_id,metric_node_idx),
            # "table_schema": metric_table.schema.columns_to_json_serializable_dict()
        }
    }


    class RCATransformer(pw.AsyncTransformer, output_schema=RCAOutputSchema):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
        
        async def invoke(self,**columns) -> dict:
            
            # Extract breach_value from the metric column
            metric_column_name = summarized_metric["metric_column"]
            breach_value = float(columns.get(metric_column_name, 0))
            
            # Get current timestamp in ISO format with UTC timezone
            breach_time_utc = datetime.now(timezone.utc).isoformat()
            
            request_data = {
                "trace_ids": {
                    special_column: (list(columns[special_column]) if isinstance(columns[special_column], tuple) else columns[special_column]) for special_column in semantic_origins.keys()
                },
                **summarized_metric,
                "table_data": tables_data,
                "description": metric["description"],
                "breach_value": breach_value,
                "breach_time_utc": breach_time_utc
            } 
          
            # Call RCA API
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"{agentic_url.rstrip('/')}/rca",
                    json=request_data,
                )
                if resp.status_code != 200:
                    raise Exception(f"Request Data: {json.dumps(request_data,indent=4)}\n\n{resp.text}")
                rca_data = resp.json()
            
            # Check if RCA returned empty dict (indicating another RCA is running)
            if not rca_data or rca_data == {}:
                return {}
            
            # Extract RCA analysis output for parallel API calls
            rca_output = rca_data.get("analysis")
            
            if not rca_output:
                return rca_data
            
            # Define async functions for parallel API calls
            async def generate_report():
                """Call the incident report generation API"""
                try:
                    async with httpx.AsyncClient(timeout=120) as client:
                        report_resp = await client.post(
                            f"{agentic_url.rstrip('/')}/api/v1/reports/incident",
                            json={"rca_output": rca_output}
                        )
                        if report_resp.status_code == 200:
                            return report_resp.json()
                        else:
                            return {"error": f"Report generation failed: {report_resp.text}"}
                except Exception as e:
                    return {"error": f"Report generation error: {str(e)}"}
            
            async def recommend_actions():
                """Call the runbook remediation API"""
                try:
                    # Use root_cause as the error message for remediation
                    error_message = rca_output.get("root_cause", "Unknown error")
                    async with httpx.AsyncClient(timeout=120) as client:
                        remediation_resp = await client.post(
                            f"{agentic_url.rstrip('/')}/runbook/remediate",
                            json={
                                "error_message": error_message,
                                "auto_execute": True,  # Don't auto-execute, just suggest
                                "require_approval_medium": True
                            }
                        )
                        if remediation_resp.status_code == 200:
                            return remediation_resp.json()
                        else:
                            return {"error": f"Remediation suggestion failed: {remediation_resp.text}"}
                except Exception as e:
                    return {"error": f"Remediation suggestion error: {str(e)}"}
            
            # Call both APIs in parallel
            report_result, remediation_result = await asyncio.gather(
                generate_report(),
                recommend_actions(),
                return_exceptions=True
            )
            
            # Combine all results
            return {
                "analysis": rca_output,
                "report": report_result if not isinstance(report_result, Exception) else {"error": str(report_result)},
                "remediation": remediation_result if not isinstance(remediation_result, Exception) else {"error": str(remediation_result)}
            }
    return RCATransformer(input_table=metric_table).successful