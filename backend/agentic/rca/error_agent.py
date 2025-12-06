from typing import List, Dict
from langchain_core.messages import HumanMessage, SystemMessage
from .output import RCAAnalysisOutput
from datetime import datetime
from ..llm_factory import create_analyser_model
from ..guardrails.before_agent import InputScanner
from ..guardrails.gateway import MCPSecurityGateway

from ..guardrails.batch import PromptInjectionAnalyzer
from ..guardrails.before_agent import detect
from .rca_logger import rca_logger
gateway = MCPSecurityGateway()

# Create the analyzer model instance
analyser_model = create_analyser_model()

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





structured_analyser_model = None
input_scanner = None

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
        
        
        for log in logs:
            timestamp = format_timestamp(log.get('observed_time_unix_nano', 0))
            service = log.get('_open_tel_service_name') or log.get('scope_name', 'unknown')
            body = log.get('body', '')
            
            formatted_output.append(f"({timestamp}) ({service}) {body}")
        
        formatted_output.append("")  # Empty line between traces
    
    return "\n".join(formatted_output)

async def init_error_analysis_agent():
    """Initialize the error analysis model with structured output"""
    global structured_analyser_model, input_scanner
    # Use direct structured output instead of agent framework for simpler, more reliable parsing
    structured_analyser_model = analyser_model.with_structured_output(RCAAnalysisOutput)
    input_scanner = InputScanner()
    await input_scanner.preload_models()

async def analyze_error_logs(logs_by_trace: Dict[str, List[Dict]], skip_injection_scan: bool = True) -> RCAAnalysisOutput:
    """
    Analyze error logs to identify root causes of failures.
    
    Args:
        logs_by_trace: Dictionary mapping trace_id to list of log dictionaries
        skip_security_scan: If True, skip security scanning (use for trusted internal log data)
        
    Returns:
        RCAAnalysisOutput with structured analysis
    """
    if structured_analyser_model is None:
        await init_error_analysis_agent()


    # Format logs for analysis
    formatted_logs = format_logs_for_analysis(logs_by_trace)
    
    sanitized_description = detect(formatted_logs)
    
    # Scan formatted logs (skip for trusted internal data like system logs)
    # if input_scanner and not skip_security_scan:
    #     scan_result = await input_scanner.scan(formatted_logs)
    #     if not scan_result.is_safe:
    #         raise ValueError(f"Security scan failed: {scan_result.sanitized_input}")
    #     formatted_logs = scan_result.sanitized_input
        
    if not skip_injection_scan:
        
        injection_detected = await gateway.prompt_injection_analyzer.adetect(formatted_logs)
        if injection_detected:
            rca_logger.critical("High-confidence prompt injection detected in log data. Halting analysis.")
            raise ValueError(f"Data failed security checks: High-confidence prompt injection detected.")

    analysis_prompt = (
        f"Analyze the following error logs from traces that triggered an SLA threshold violation:\n\n"
        f"{sanitized_description}\n\n"
        f"Provide a structured analysis identifying the root cause, severity, affected services, "
        f"a clear narrative, and cite specific log entries as evidence."
    )
    
    # Use direct LLM call with structured output - simpler and more reliable than agent framework
    result = await structured_analyser_model.ainvoke([
        SystemMessage(content=error_analysis_prompt),
        HumanMessage(content=analysis_prompt)
    ])
    
    return result
