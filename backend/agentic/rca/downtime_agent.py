from pydantic import BaseModel, Field
from typing import List, Dict, Literal, Optional, TypedDict, Annotated
from langchain.agents import create_agent
from ..chat_models import reasoning_model
from datetime import datetime
from .tools import get_logs_in_time_window
from ..sql_tool import TablePayload
from langgraph.graph import StateGraph, END
import operator

# Individual incident analysis prompt
individual_incident_prompt = """
You are an expert Site Reliability Engineer (SRE) analyzing a single downtime incident. Your task is to examine critical logs (severity >= 20) around one specific downtime event to identify what caused that particular service unavailability.

You will be provided with:
1. A single downtime incident with timestamp and trace_id
2. Critical logs from a time window around the incident (before and after)

Log Format:
Each log entry follows:
(timestamp) (service_name or scope_name) [SEVERITY_LEVEL] Log body

SEVERITY LEVELS (>= 20):
- 20: FATAL - System is unusable
- 21-24: FATAL+ - Critical system failures

Your Analysis Must:

1. IDENTIFY IMMEDIATE CAUSE:
   - What directly triggered this specific downtime
   - Sequence of events leading to unavailability
   - Which service(s) became unavailable

2. DETERMINE ROOT CAUSE SERVICE:
   - Where the problem originated
   - Whether it cascaded from dependencies

3. CITE EVIDENCE:
   - 2-3 most critical log entries
   - Include timestamps, services, and severity
   - Show the progression of the failure

ANALYSIS GUIDELINES:
- Focus on FATAL severity logs
- Look for: "service unavailable", "connection refused", "timeout", "crash", "panic"
- Distinguish between cause and effect in cascading failures
- Be specific to THIS incident only
"""

aggregation_prompt = """
You are an expert Site Reliability Engineer (SRE) performing aggregated root cause analysis. You will receive individual analyses of multiple downtime incidents that triggered an SLO breach.

Your task is to synthesize these individual analyses into a comprehensive understanding of why the service experienced downtime.

Your Aggregated Analysis Must:

1. DETERMINE SYSTEMIC ROOT CAUSE:
   - Common underlying issue causing repeated downtimes
   - Whether incidents are related or independent
   - Infrastructure, application, or dependency failures

2. ASSESS OVERALL SEVERITY:
   - CRITICAL: Complete service unavailability, data loss
   - HIGH: Partial unavailability, degraded to unusable state
   - MEDIUM: Intermittent unavailability, some requests succeed

3. IDENTIFY AFFECTED SERVICES:
   - Top-level service that went down (breaching SLO)
   - Root cause service (where problem originated)
   - All intermediate services affected

4. DETERMINE RELATIONSHIP:
   - Are incidents related (same root cause)?
   - Are they independent failures?
   - Is there a pattern or progression?

5. CONSTRUCT NARRATIVE:
   - Overall story of why service experienced downtime
   - Connect incidents if related
   - Explain systemic vs one-off issues
   - Keep under 6 sentences, technical but clear

6. CONSOLIDATE CITATIONS:
   - Select 3-7 most critical citations from all incidents
   - Ensure coverage across different incidents
   - Prioritize evidence supporting the root cause

Be evidence-based, actionable, and synthesize patterns across incidents.
"""

class DowntimeIncident(BaseModel):
    trace_id: str = Field(description="Trace ID where downtime was detected")
    timestamp: int = Field(description="Unix nanoseconds when downtime occurred")
    duration_ms: Optional[int] = Field(default=None, description="Duration of downtime in milliseconds if known")

class DowntimeCitation(BaseModel):
    incident_trace_id: str = Field(description="Which downtime incident this citation relates to")
    timestamp: str = Field(description="Timestamp of the log entry")
    service: str = Field(description="Service or scope name")
    severity: str = Field(description="Severity level (FATAL, FATAL+)")
    message: str = Field(description="Critical error message from log body")

class IndividualIncidentAnalysis(BaseModel):
    trace_id: str = Field(description="Trace ID of the incident")
    timestamp: str = Field(description="Human-readable timestamp of incident")
    immediate_cause: str = Field(description="What directly caused this downtime")
    affected_service: str = Field(description="Service that became unavailable")
    root_cause_service: Optional[str] = Field(description="Service where the problem originated (if different)")
    citations: List[DowntimeCitation] = Field(
        description="2-3 critical log entries for this incident",
        min_length=2,
        max_length=3
    )

class DowntimeAnalysisOutput(BaseModel):
    severity: Literal["CRITICAL", "HIGH", "MEDIUM"] = Field(
        description="Overall impact severity of the downtime events"
    )
    top_level_service: str = Field(
        description="The top-level service that breached SLO (went down)"
    )
    root_cause_service: str = Field(
        description="The service where the root cause originated"
    )
    affected_services: List[str] = Field(
        description="All services affected by the downtime incidents"
    )
    aggregated_root_cause: str = Field(
        description="The underlying systemic issue causing downtime across incidents"
    )
    incidents_related: bool = Field(
        description="Whether the downtime incidents are related to each other"
    )
    aggregated_narrative: str = Field(
        description="Overall explanation of why the service experienced downtime (max 6 sentences)"
    )
    incident_analyses: List[IndividualIncidentAnalysis] = Field(
        description="Individual analysis for each downtime incident"
    )
    critical_citations: List[DowntimeCitation] = Field(
        description="3-7 critical log entries supporting the analysis",
        min_length=3,
        max_length=7
    )

# State for LangGraph
class DowntimeAnalysisState(TypedDict):
    incidents: List[DowntimeIncident]
    logs_table: TablePayload
    window_seconds: int
    individual_analyses: Annotated[List[IndividualIncidentAnalysis], operator.add]
    final_output: Optional[DowntimeAnalysisOutput]

individual_agent = None
aggregation_agent = None

def format_timestamp(unix_nano: int) -> str:
    """Convert Unix nanoseconds to readable timestamp"""
    if unix_nano == 0:
        return "unknown"
    timestamp_seconds = unix_nano / 1_000_000_000
    dt = datetime.fromtimestamp(timestamp_seconds)
    return dt.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

def get_severity_text(severity_number: int) -> str:
    """Convert severity number to text"""
    if severity_number >= 21:
        return "FATAL+"
    elif severity_number == 20:
        return "FATAL"
    else:
        return f"SEVERITY_{severity_number}"

def format_incident_logs(incident: DowntimeIncident, logs: List[Dict]) -> str:
    """Format a single incident and its logs for analysis"""
    formatted_output = []
    
    formatted_output.append(
        f"DOWNTIME INCIDENT\n"
        f"Trace ID: {incident.trace_id}\n"
        f"Timestamp: {format_timestamp(incident.timestamp)}\n"
    )
    
    if incident.duration_ms:
        formatted_output.append(f"Duration: {incident.duration_ms}ms\n")
    
    formatted_output.append(f"\n{'='*80}\n")
    
    if not logs:
        formatted_output.append("No critical logs found in window\n")
        return "".join(formatted_output)
    
    # Sort logs by timestamp
    sorted_logs = sorted(logs, key=lambda x: x.get('observed_time_unix_nano', 0))
    
    formatted_output.append(f"Critical Logs (window around downtime):\n\n")
    for log in sorted_logs:
        timestamp = format_timestamp(log.get('observed_time_unix_nano', 0))
        service = log.get('_open_tel_service_name') or log.get('scope_name', 'unknown')
        severity_num = log.get('severity_number', 0)
        severity = get_severity_text(severity_num)
        body = log.get('body', '')
        
        
        formatted_output.append(f"({timestamp}) ({service}) [{severity}] {body}\n")
    
    return "".join(formatted_output)

async def init_agents():
    """Initialize both agents"""
    global individual_agent, aggregation_agent
    
    if individual_agent is None:
        individual_agent = create_agent(
            model=reasoning_model,
            tools=[],
            system_prompt=individual_incident_prompt,
            response_format=IndividualIncidentAnalysis
        )
    
    if aggregation_agent is None:
        aggregation_agent = create_agent(
            model=reasoning_model,
            tools=[],
            system_prompt=aggregation_prompt,
            response_format=DowntimeAnalysisOutput
        )

async def analyze_single_incident(
    incident: DowntimeIncident,
    logs_table: TablePayload,
    window_seconds: int
) -> IndividualIncidentAnalysis:
    """Analyze a single downtime incident"""
    if individual_agent is None:
        await init_agents()
    
    # Define time window (convert to nanoseconds)
    start_time = incident.timestamp - (window_seconds * 1_000_000_000)
    end_time = incident.timestamp + (window_seconds * 1_000_000_000)
    
    # Fetch critical logs (severity >= 20) in this window
    logs = await get_logs_in_time_window(
        start_time=start_time,
        end_time=end_time,
        logs_table=logs_table,
        min_severity=20
    )
    
    # Format logs for analysis
    formatted_logs = format_incident_logs(incident, logs)
    
    analysis_prompt = (
        f"Analyze this specific downtime incident:\n\n"
        f"{formatted_logs}\n\n"
        f"Provide a focused analysis of this single incident, identifying the immediate cause, "
        f"affected service, root cause service, and cite 2-3 critical log entries as evidence."
    )
    
    result = await individual_agent.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": analysis_prompt
                }
            ]
        }
    )
    
    return result["structured_output"]

async def analyze_incidents_node(state: DowntimeAnalysisState) -> Dict:
    """Node that analyzes all incidents in parallel"""
    incidents = state["incidents"][:5]  # Limit to 5 incidents
    logs_table = state["logs_table"]
    window_seconds = state["window_seconds"]
    
    # Analyze each incident (LangGraph will handle parallel execution)
    import asyncio
    analyses = await asyncio.gather(*[
        analyze_single_incident(incident, logs_table, window_seconds)
        for incident in incidents
    ])
    
    return {"individual_analyses": analyses}

async def aggregate_analyses_node(state: DowntimeAnalysisState) -> Dict:
    """Node that aggregates all individual analyses"""
    if aggregation_agent is None:
        await init_agents()
    
    individual_analyses = state["individual_analyses"]
    
    # Format individual analyses for aggregation
    analyses_text = []
    for idx, analysis in enumerate(individual_analyses, 1):
        analyses_text.append(
            f"\n{'='*80}\n"
            f"INCIDENT #{idx} ANALYSIS\n"
            f"Trace ID: {analysis.trace_id}\n"
            f"Timestamp: {analysis.timestamp}\n"
            f"Immediate Cause: {analysis.immediate_cause}\n"
            f"Affected Service: {analysis.affected_service}\n"
            f"Root Cause Service: {analysis.root_cause_service or 'Same as affected'}\n\n"
            f"Evidence:\n"
        )
        
        for citation in analysis.citations:
            analyses_text.append(
                f"  - ({citation.timestamp}) {citation.service} [{citation.severity}]: {citation.message}\n"
            )
    
    formatted_analyses = "".join(analyses_text)
    
    aggregation_prompt_text = (
        f"You have received {len(individual_analyses)} individual downtime incident analyses. "
        f"Synthesize these into a comprehensive root cause analysis.\n\n"
        f"{formatted_analyses}\n\n"
        f"Provide an aggregated analysis that:\n"
        f"1. Identifies the systemic root cause across all incidents\n"
        f"2. Determines if incidents are related or independent\n"
        f"3. Assesses overall severity and impact\n"
        f"4. Identifies all affected services and the top-level service that breached SLO\n"
        f"5. Constructs a cohesive narrative\n"
        f"6. Consolidates the most critical 3-7 citations from all incidents\n"
        f"7. Includes all individual incident analyses in the output"
    )
    
    result = await aggregation_agent.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": aggregation_prompt_text
                }
            ]
        }
    )
    
    output: DowntimeAnalysisOutput = result["structured_output"]
    
    # Ensure individual analyses are included
    output.incident_analyses = individual_analyses
    
    return {"final_output": output}

# Build LangGraph workflow
def build_downtime_analysis_graph():
    """Build the LangGraph workflow for downtime analysis"""
    workflow = StateGraph(DowntimeAnalysisState)
    
    # Add nodes
    workflow.add_node("analyze_incidents", analyze_incidents_node)
    workflow.add_node("aggregate_analyses", aggregate_analyses_node)
    
    # Define edges
    workflow.set_entry_point("analyze_incidents")
    workflow.add_edge("analyze_incidents", "aggregate_analyses")
    workflow.add_edge("aggregate_analyses", END)
    
    return workflow.compile()

downtime_graph = None

async def analyze_downtime_incidents(
    incidents: List[DowntimeIncident],
    logs_table: TablePayload,
    window_seconds: int = 30
) -> DowntimeAnalysisOutput:
    """
    Analyze downtime incidents using parallel execution for individual analyses.
    
    Args:
        incidents: List of downtime incidents with trace_ids and timestamps
        logs_table: TablePayload for logs table
        window_seconds: Time window in seconds to look before/after each incident (default 30s)
        
    Returns:
        DowntimeAnalysisOutput with aggregated root cause analysis
    """
    global downtime_graph
    
    if downtime_graph is None:
        await init_agents()
        downtime_graph = build_downtime_analysis_graph()
    
    # Limit to 5 incidents max
    incidents = incidents[:5]
    
    # Run the graph
    initial_state: DowntimeAnalysisState = {
        "incidents": incidents,
        "logs_table": logs_table,
        "window_seconds": window_seconds,
        "individual_analyses": [],
        "final_output": None
    }
    
    final_state = await downtime_graph.ainvoke(initial_state)
    
    return final_state["final_output"]
