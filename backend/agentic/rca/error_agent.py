from pydantic import BaseModel, Field
from typing import List, Dict, Literal
from langchain.agents import create_agent
from ..chat_models import reasoning_model
from datetime import datetime

error_analysis_prompt = """
You are an expert Site Reliability Engineer (SRE) and system diagnostics specialist. Your task is to analyze error logs from distributed systems to identify root causes of failures that triggered SLA threshold violations.

You will be provided with error logs grouped by trace_id, where each trace represents a request flow through the system. The logs are ordered chronologically within each trace, and traces themselves are ordered by time.

Log Format:
Each log entry follows this format:
(timestamp) (service_name or scope_name) Log body

Your Analysis Must:

1. IDENTIFY PATTERNS: Look for common error patterns across traces
   - Recurring error messages
   - Specific services that consistently fail
   - Temporal patterns (e.g., cascading failures)
   - Error propagation through the service chain

2. DETERMINE SEVERITY: Assess the impact level
   - CRITICAL: System-wide outage, data loss, security breach
   - HIGH: Multiple services affected, user-facing errors
   - MEDIUM: Isolated service issues, degraded performance
   - LOW: Minor issues, self-recovering errors

3. IDENTIFY AFFECTED SERVICES: List all services involved
   - Primary affected service (where the root cause originates)
   - Secondary affected services (cascade effects)
   - Include service names and their roles

4. CONSTRUCT NARRATIVE: Provide a clear, concise explanation
   - What happened (the failure mode)
   - Why it happened (the root cause)
   - How it propagated (if applicable)
   - Impact on system behavior
   - Keep it under 5 sentences, technical but accessible

5. CITE EVIDENCE: Reference specific log entries
   - Quote relevant error messages
   - Include timestamps and services
   - Show the progression of the failure
   - Minimum 2-3 citations, maximum 5

6. DETERMINE ROOT CAUSE: Identify the underlying issue
   - Technical root cause (e.g., "Database connection pool exhaustion")
   - Contributing factors if applicable
   - Distinguish between symptoms and root causes

ANALYSIS GUIDELINES:
- Focus on actionable insights, not just description
- Distinguish between root causes and symptoms
- Consider cascading failures and dependencies
- Look for common error codes, exceptions, or patterns
- Pay attention to the first occurrence of errors in each trace
- Consider resource exhaustion, timeouts, network issues, data corruption
- Be precise and evidence-based

Output a structured response with all required fields.
"""

class ErrorCitation(BaseModel):
    timestamp: str = Field(description="Timestamp of the log entry")
    service: str = Field(description="Service or scope name where the error occurred")
    message: str = Field(description="Relevant error message or excerpt from the log body")

class ErrorAnalysisOutput(BaseModel):
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"] = Field(
        description="Impact severity of the failure"
    )
    affected_services: List[str] = Field(
        description="List of services affected by this issue, with primary service first"
    )
    narrative: str = Field(
        description="Clear, concise explanation of what happened and why (max 5 sentences)"
    )
    error_citations: List[ErrorCitation] = Field(
        description="2-5 specific log entries that support the analysis",
        min_length=2,
        max_length=5
    )
    root_cause: str = Field(
        description="Technical root cause of the failure (be specific and actionable)"
    )

error_analysis_agent = None

def format_timestamp(unix_nano: int) -> str:
    """Convert Unix nanoseconds to readable timestamp"""
    if unix_nano == 0:
        return "unknown"
    timestamp_seconds = unix_nano / 1_000_000_000
    dt = datetime.fromtimestamp(timestamp_seconds)
    return dt.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

def format_logs_for_analysis(logs_by_trace: Dict[str, List[Dict]]) -> str:
    """
    Format logs grouped by trace for analysis.
    
    Args:
        logs_by_trace: Dictionary mapping trace_id to list of log dictionaries
        
    Returns:
        Formatted string with logs ordered by trace and timestamp
    """
    formatted_output = []
    
    # Sort traces by earliest log timestamp
    sorted_traces = sorted(
        logs_by_trace.items(),
        key=lambda x: min(log.get('observed_time_unix_nano', 0) for log in x[1])
    )
    
    for trace_id, logs in sorted_traces:
        formatted_output.append(f"\n=== TRACE: {trace_id} ===\n")
        
        # Sort logs within trace by observed_time_unix_nano
        sorted_logs = sorted(logs, key=lambda x: x.get('observed_time_unix_nano', 0))
        
        for log in sorted_logs:
            timestamp = format_timestamp(log.get('observed_time_unix_nano', 0))
            service = log.get('_open_tel_service_name') or log.get('scope_name', 'unknown')
            body = log.get('body', '')
            
            # Handle body if it's a dict/json
            if isinstance(body, dict):
                body = str(body.get('stringValue', body))
            
            formatted_output.append(f"({timestamp}) ({service}) {body}")
        
        formatted_output.append("")  # Empty line between traces
    
    return "\n".join(formatted_output)

async def init_error_analysis_agent():
    """Initialize the error analysis agent"""
    global error_analysis_agent
    error_analysis_agent = create_agent(
        model=reasoning_model,
        tools=[],  # No tools needed for this analysis
        system_prompt=error_analysis_prompt,
        response_format=ErrorAnalysisOutput
    )

async def analyze_error_logs(logs_by_trace: Dict[str, List[Dict]]) -> ErrorAnalysisOutput:
    """
    Analyze error logs to identify root causes of failures.
    
    Args:
        logs_by_trace: Dictionary mapping trace_id to list of log dictionaries
        
    Returns:
        ErrorAnalysisOutput with structured analysis
    """
    if error_analysis_agent is None:
        await init_error_analysis_agent()
    
    # Format logs for analysis
    formatted_logs = format_logs_for_analysis(logs_by_trace)
    
    analysis_prompt = (
        f"Analyze the following error logs from traces that triggered an SLA threshold violation:\n\n"
        f"{formatted_logs}\n\n"
        f"Provide a structured analysis identifying the root cause, severity, affected services, "
        f"a clear narrative, and cite specific log entries as evidence."
    )
    
    result = await error_analysis_agent.ainvoke(
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
