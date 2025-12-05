from typing import List, Dict, Union, Literal, TypedDict, Any
from .summarize import SummarizeOutput
from .tools import get_error_logs_for_trace_ids, get_downtime_timestamps, TablePayload
from .error_agent import analyze_error_logs
from .downtime_agent import analyze_downtime_incidents, DowntimeIncident
from .latency_agent import build_graph, MetricAlert
from .output import RCAAnalysisOutput


class InitRCA(SummarizeOutput):
    # description of the metric
    description: str
    # Dict of column_name: trace_id(s) in that column. This column and its values relevant to calculation of the SLA metric
    trace_ids : Dict[str,Union[List[str],str]]
    table_data: Dict[Literal["spans","logs", "sla_metric_trigger"], TablePayload]


async def rca(init_rca_request: InitRCA):
    print("RCA invoked")
    if len(init_rca_request.trace_ids.keys()) == 1:
        # Get the single column name and its trace_ids
        column_name = list(init_rca_request.trace_ids.keys())[0]
        trace_ids = init_rca_request.trace_ids[column_name]
        
        match init_rca_request.metric_type:
            case "error":
                # Get error logs for analysis
                error_logs = await get_error_logs_for_trace_ids(
                    trace_ids, 
                    init_rca_request.table_data["logs"],
                    13
                )
                
                # Group logs by trace_id
                logs_by_trace: Dict[str, List[Dict]] = {}
                for log in error_logs:
                    trace_id = log.get('_open_tel_trace_id', 'unknown')
                    if trace_id not in logs_by_trace:
                        logs_by_trace[trace_id] = []
                    logs_by_trace[trace_id].append(log)
                
                # Analyze error logs to find root cause
                analysis: RCAAnalysisOutput = await analyze_error_logs(logs_by_trace)
                
                return {
                    "analysis": analysis.model_dump()
                }
            
            case "latency":
                # Create metric alert from the summarized data
                metric_alert = MetricAlert(
                    metric_description=init_rca_request.description,
                    breach_time_utc=init_rca_request.breach_time_utc,
                    breach_value=init_rca_request.breach_value
                )
                
                # Build and run the latency analysis graph
                latency_graph = build_graph()
                
                # Pass table information to the graph
                initial_state = {
                    "metric_alert": metric_alert,
                    "sla_alerts": [],
                    "messages": [],
                    "final_reports": None,
                    "analysis_summary": None,
                    "rca_output": None,
                    "table_data": {
                        "spans": init_rca_request.table_data["spans"],
                        "logs": init_rca_request.table_data["logs"]
                    }
                }
                
                result = await latency_graph.ainvoke(initial_state)
                
                analysis: RCAAnalysisOutput = result.get("rca_output")
                
                if not analysis:
                    return {
                        "analysis": {
                            "message": "Latency analysis could not be completed"
                        }
                    }
                
                return {
                    "analysis": analysis.model_dump()
                }
            
            case "uptime":
                # Get actual timestamps from sla_metric_trigger table
                timestamp_data = await get_downtime_timestamps(
                    trace_ids,
                    column_name,
                    init_rca_request.table_data["sla_metric_trigger"]
                )
                
                # Create downtime incidents with actual timestamps
                incidents = []
                for row in timestamp_data:
                    incidents.append(DowntimeIncident(
                        trace_id=row["trace_id"],
                        timestamp=row["time"],
                        duration_ms=None
                    ))
                
                if not incidents:
                    return {
                        "analysis":{ 
                            "message": "No downtime incidents found in SLA metric trigger table"
                        }
                    }
                
                # Analyze downtime with 30-second window around each incident
                # Uses parallel execution for individual incidents
                analysis: RCAAnalysisOutput = await analyze_downtime_incidents(
                    incidents=incidents,
                    logs_table=init_rca_request.table_data["logs"],
                    window_seconds=30
                )
                
                return {
                    "analysis": analysis.model_dump()
                }
            
            case _:
                raise ValueError(f"Unknown metric type: {init_rca_request.metric_type}")
    else:
        # Handle multiple trace_id columns
        pass
