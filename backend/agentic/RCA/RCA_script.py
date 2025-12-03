import asyncio
import json
import numpy as np
import os
from dotenv import load_dotenv
from typing import List, TypedDict, Annotated, Dict, Optional, Literal, Awaitable, TypeVar
from pydantic.v1 import BaseModel, Field
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.tools import tool
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_community.vectorstores import PathwayVectorClient
from langchain_core.prompts import ChatPromptTemplate
from langchain.agents import AgentExecutor, create_tool_calling_agent
import numpy as np
import litellm
import pathway as pw
from litellm import acompletion
import psycopg2
from psycopg2 import pool

load_dotenv()

host = os.getenv("host", "localhost")
port = os.getenv("port", "5432")
dbname = os.getenv("dbname", "observability")
user = os.getenv("user", "user")
password = os.getenv("password", "password")

class SLAAlert(BaseModel):
    workflow_id: str = Field(description="The unique identifier for the workflow definition.")
    execution_id: str = Field(description="The unique identifier for the specific workflow run.")
    trigger_node: str = Field(description="The first node in the workflow.")
    breach_magnitude: str = Field(description="Human-readable summary of the breach (e.g., '300% over baseline').")
    trace_ids: Optional[List[str]] = Field(default=None, description="A list of trace IDs associated with the workflow run.")
    has_error: bool = Field(default=False, description="Flag indicating if the workflow run failed with an error.")
    error_node: Optional[str] = Field(default=None, description="The node that produced the error.")
    error_message: Optional[str] = Field(default=None, description="A summary of the error message.")

class MetricAlert(BaseModel):
    metric_name: str = Field(description="The name of the metric that breached the threshold (e.g., 'workflow_latency_seconds').")
    workflow_id: str = Field(description="The unique identifier for the workflow definition associated with the metric.")
    filter_dimensions: Dict[str, str] = Field(description="Key-value pairs to filter traces (e.g., {'customer_id': 'acme-corp'}).")
    breach_time_utc: str = Field(description="The UTC timestamp when the breach occurred.")
    breach_value: float = Field(description="The value of the metric that caused the breach.")
    baseline_value: float = Field(description="The baseline value for the metric.")

class PlausibleAction(BaseModel):
    action_description: str = Field(description="A human-readable description of the suggested action.")
    source_case_id: str = Field(description="The ID of the past case this suggestion is based on.")
    confidence_score: float = Field(description="A score from 0.0 to 1.0 indicating the relevance.")

class RemediationPlan(BaseModel):
    bottleneck_node: str = Field(description="The node identified as the primary cause of the latency.")
    root_cause_summary: str = Field(description="A concise explanation of the root cause (e.g., 'Data Volume Issue').")
    recommended_action: str = Field(description="The specific, actionable step the user should take.")
    action_type: Literal["Configuration Change", "Workflow Redesign", "Data Pre-processing"] \
        = Field(description="The category of the recommended action.")

class RCAState(TypedDict):
    metric_alert: MetricAlert
    sla_alerts: List[SLAAlert]
    final_reports: List[Optional[RemediationPlan]]
    financial_impact_report: Optional[str]
    quick_actions: Optional[List[PlausibleAction]]
    hydrated_trace: Optional[Dict[str, any]]
    error_logs: Optional[List[Dict]]
    logs: Optional[List[Dict]]
    hypothesis: Optional[str]
    messages: Annotated[list, add_messages]
    # Fields for the (currently inactive) validation loop
    verification_command: Optional[Dict]
    validation_result: Optional[str]
    retries: int

DB_CONFIG = {
    "host": host,
    "port": port,
    "dbname": dbname,
    "user": user,
    "password": password
}

try:
    postgreSQL_pool = psycopg2.pool.SimpleConnectionPool(1, 20, **DB_CONFIG)
    if postgreSQL_pool:
        print("Connection pool created successfully")
except (Exception, psycopg2.DatabaseError) as error:
    print("Error while connecting to PostgreSQL", error)

def get_db_connection():
    return postgreSQL_pool.getconn()

def release_db_connection(conn):
    postgreSQL_pool.putconn(conn)

def get_workflow_from_db(
        workflow_id: str
) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT topology FROM workflows WHERE id = %s", (workflow_id,))
            result = cur.fetchone()
            if result:
                return result[0]
            raise ValueError(f"Workflow with id {workflow_id} not found.")
    finally:
        release_db_connection(conn)

def get_baselines_from_db(
        workflow_id: str
) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT baselines FROM performance_baselines WHERE workflow_id = %s", (workflow_id,))
            result = cur.fetchone()
            if result:
                return result[0]
            return {}
    finally:
        release_db_connection(conn)

def get_past_cases_from_db() -> List[Document]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT page_content, metadata FROM remediation_cases")
            return [Document(page_content=row[0], metadata=row[1]) for row in cur.fetchall()]
    finally:
        release_db_connection(conn)


def get_logs_from_db(
        trace_ids: List[str]
) -> List[Dict]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            query = "SELECT * FROM otel_logs WHERE trace_id = ANY(%s)"
            cur.execute(query, (trace_ids,))
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        release_db_connection(conn)


def get_spans_from_db(
        trace_ids: List[str]
) -> List[Dict]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            query = "SELECT * FROM otel_spans WHERE trace_id = ANY(%s)"
            cur.execute(query, (trace_ids,))
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        release_db_connection(conn)


def get_top_latency_traces(
    workflow_id: str, 
    start_time_utc: str, 
    end_time_utc: str, 
    limit: int = 5
) -> List[Dict]:
    """
    Finds the trace IDs with the highest end-to-end latency for a given workflow
    within a specific time window.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # TODO: This query assumes that the root span of a trace for a workflow execution
            # has a 'name' equal to the workflow_id. This might need adjustment
            # based on the actual span naming convention.
            query = """
                SELECT
                    trace_id,
                    (MAX(end_time_unix_nano) - MIN(start_time_unix_nano)) AS duration_ns
                FROM
                    otel_spans
                WHERE
                    -- This condition is an assumption. You might need to join with
                    -- a 'workflows' table or use a specific attribute to link spans
                    -- to a workflow_id.
                    attributes->>'workflow_id' = %s
                    AND start_time_unix_nano >= (extract(epoch from %s::timestamp) * 1e9)
                    AND end_time_unix_nano <= (extract(epoch from %s::timestamp) * 1e9)
                GROUP BY
                    trace_id
                ORDER BY
                    duration_ns DESC
                LIMIT %s;
            """
            cur.execute(query, (workflow_id, start_time_utc, end_time_utc, limit))
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        release_db_connection(conn)


def analyze_financial_impact(question: str, system_prompt: str):
    """
    Analyzes financial impact using Google Gemini and Tavily Search.
    Uses a Tool-Calling Agent pattern to ensure actual search occurs.
    """
    llm = ChatGoogleGenerativeAI(
        model='gemini-1.5-pro', 
        temperature=0.0,        
        google_api_version="v1",
    )

    tavily = TavilySearchResults(max_results=3)
    tools = [tavily]

    prompt = ChatPromptTemplate.from_messages([
        ("system", "{system_prompt}"),
        ("placeholder", "{chat_history}"),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

    try:
        result = agent_executor.invoke({
            "input": question,
            "system_prompt": system_prompt
        })
        return result["output"]
    except Exception as e:
        return f"Error calculating financial impact: {str(e)}"

class VectorStore:
    def __init__(self, url: str = "http://127.0.0.1:8000"):
        self.url = url
        try:
            self.client = PathwayVectorClient(url=url)
            # print(f"Connected to Pathway Vector Index at {url}")
        except Exception as e:
            # print(f"FATAL: Could not connect to Pathway Vector Index: {e}")
            self.client = None

    def add_remediation_cases(self, cases: List[Document]):
        import time, json, os
        os.makedirs("./knowledge_base", exist_ok=True)
        for i, doc in enumerate(cases):
            filename = f"./knowledge_base/case_{int(time.time())}_{i}.json"
            with open(filename, "w") as f:
                json.dump({"text": doc.page_content, "metadata": doc.metadata}, f)
        # print(f"Pushed {len(cases)} cases into ./knowledge_base")

    def find_similar_cases(self, query: str, k: int = 2) -> List[PlausibleAction]:
        if self.client is None:
            return []

        results = self.client.similarity_search_with_score(query, k=k)
        actions = []
        for doc, score in results:
            meta = doc.metadata.get("metadata", {})
            actions.append(
                PlausibleAction(
                    action_description=meta.get("action", "See documentation"),
                    source_case_id=meta.get("case_id", "Unknown"),
                    confidence_score=score,
                )
            )
        return actions

@tool
def inspect_payload_size(
    execution_id: str, 
    node_name: str
) -> str:
    """
    Inspects the size of the data payload passed to a specific node during a given execution.
    """
    return json.dumps(get_payload_size_from_opentelemetry(execution_id, node_name))

def get_api_health_from_monitoring(
    url: str
) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT status, avg_latency_ms FROM api_health WHERE url = %s", (url,))
            result = cur.fetchone()
            if result:
                return {"status": result[0], "avg_latency_ms": result[1]}
            return {"status": "unknown"}
    finally:
        release_db_connection(conn)
@tool
def check_external_api_health(
    url: str
) -> str:
    """
    Checks the health and average response time of an external API endpoint.
    """
    return json.dumps(get_api_health_from_monitoring(url))

def get_payload_size_from_opentelemetry(
        execution_id: str,
        node_name: str
) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT attributes->>'http.request.content_length'
                FROM otel_spans
                WHERE trace_id = %s AND name = %s;
            """, (execution_id, node_name))
            result = cur.fetchone()
            if result and result[0]:
                size_bytes = int(result[0])
                return {"size_mb": size_bytes / (1024*1024)}
            return {"size_mb": 0}
    finally:
        release_db_connection(conn)

def enrichment_node(state: RCAState) -> Dict:
    """
    Takes a metric alert, finds the top N slowest traces associated with it,
    and creates the initial SLAAlerts for the parallel analysis.
    """
    metric_alert = state['metric_alert']
    # TODO: Fix a time window length
    # Define a time window around the breach to search for traces
    # For example, 5 minutes before and after the breach.
    from datetime import datetime, timedelta
    breach_time = datetime.fromisoformat(metric_alert.breach_time_utc.replace('Z', '+00:00'))
    start_time = (breach_time - timedelta(minutes=5)).isoformat()
    end_time = (breach_time + timedelta(minutes=5)).isoformat()

    top_traces = get_top_latency_traces(
        workflow_id=metric_alert.workflow_id,
        start_time_utc=start_time,
        end_time_utc=end_time,
        limit=5
    )

    if not top_traces:
        # print("WARNING: No traces found for the given metric alert. Cannot proceed with RCA.")
        return {"sla_alerts": []}

    breach_magnitude = (metric_alert.breach_value / metric_alert.baseline_value) * 100
    
    sla_alerts = []
    for trace in top_traces:
        trace_id = trace['trace_id']
        # The execution_id is often the same as the trace_id in many systems.
        # This is an assumption that might need to be revisited.
        alert = SLAAlert(
            workflow_id=metric_alert.workflow_id,
            execution_id=trace_id,
            trigger_node="start", # This is a placeholder
            breach_magnitude=f"{breach_magnitude:.0f}% over baseline",
            trace_ids=[trace_id],
        )
        sla_alerts.append(alert)

    return {"sla_alerts": sla_alerts}


def context_builder_node(
        state: RCAState
) -> Dict:
    
    alert = state['sla_alert']
    topology = get_workflow_from_db(alert.workflow_id)
    baselines = get_baselines_from_db(alert.workflow_id)
    spans = get_spans_from_db(alert.trace_ids)

    hydrated_trace = {}
    for span in spans:
        # Calculate duration from nano seconds
        duration_ns = int(span.get('end_time_unix_nano', 0)) - int(span.get('start_time_unix_nano', 0))
        duration_s = duration_ns / 1e9
        
        node_name = span.get('name')
        if not node_name:
            continue

        baseline_p95 = baselines.get(node_name, {}).get("p95")
        deviation = "N/A"
        if baseline_p95 and baseline_p95 > 0:
            deviation_percent = ((duration_s - baseline_p95) / baseline_p95) * 100
            deviation = f"{deviation_percent:.0f}% over p95 baseline"
            
        hydrated_trace[node_name] = {
            "duration_seconds": duration_s,
            "baseline_p95_seconds": baseline_p95,
            "deviation": deviation,
            "config": topology.get("nodes", {}).get(node_name, {}).get("config"),
            "span_attributes": span.get("span_attributes", {})
        }

    error_logs = []
    if alert.has_error and alert.error_node:
        error_logs = [{
            "timestamp": "2025-11-30T10:05:30Z",
            "level": "ERROR",
            "node": alert.error_node,
            "message": alert.error_message,
            "trace_id": alert.execution_id
        }]

    logs = []
    if alert.trace_ids:
        logs = get_logs_from_db(alert.trace_ids)

    return {"hydrated_trace": hydrated_trace, "error_logs": error_logs, "logs": logs}



async def analysis_agent_node(state: RCAState) -> Dict:
    error_context = "No errors detected."
    if state.get("error_logs"):
        error_context = f"**Error Logs:**\n{json.dumps(state['error_logs'], indent=2)}"

    log_context = "No logs available."
    if state.get("logs"):
        log_context = f"**Logs:**\n{json.dumps(state['logs'], indent=2)}"

    prompt = f"""
    You are an expert SRE debugging a slow or failed workflow on a low-code platform.
    Your task is to identify the root cause of an SLA breach and propose a verification step.

    **Workflow Context:**
    - Workflow ID: {state['sla_alert'].workflow_id}
    - Execution ID: {state['sla_alert'].execution_id}
    - SLA Breach: {state['sla_alert'].breach_magnitude}

    **Hydrated Trace Data (Duration vs. Baseline):**
    {json.dumps(state['hydrated_trace'], indent=2)}

    {error_context}

    {log_context}

    **Previous Tool Output (if any):**
    {state.get('validation_result', 'N/A')}

    **Your Goal:**
    1. Form a `hypothesis` about the root cause (is it 'System Latency', 'Data Volume', or a specific 'Error Condition'?). If your previous hypothesis was wrong, you MUST formulate a new one.
    2. Choose a `verification_command` to test your hypothesis. The command must be a JSON object with 'tool' and 'args'.

    **Available Tools:**
    - `inspect_payload_size(execution_id: str, node_name: str)`: Use this to check for data volume issues.
    - `check_external_api_health(url: str)`: Use this to check for system latency issues.

    **Response Format (MUST be a single JSON object):**
    {{
        "hypothesis": "Your concise hypothesis here.",
        "verification_command": {{
            "tool": "tool_name_here",
            "args": {{ "arg1": "value1", ... }}
        }}
    }}
    """
    
    messages = state.get("messages", []) + [{"role": "user", "content": prompt}]
    
    response = await acompletion(
        model=os.getenv('RCA_LLM_MODEL', 'gemini-1.5-pro'),
        messages=messages,
        response_format={"type": "json_object"}
    )
    
    content = response.choices[0].message.content
    llm_response = json.loads(content)
    
    new_messages = messages + [{"role": "assistant", "content": content}]
    
    return {
        "hypothesis": llm_response.get("hypothesis"),
        "verification_command": llm_response.get("verification_command"),
        "messages": new_messages
    }

async def validate_hypothesis_with_llm(hypothesis: str, validation_result: str) -> bool:
    """
    Uses an LLM to determine if the result of a tool call confirms or refutes a hypothesis.
    """
    prompt = f"""
    You are a validation agent. Your task is to determine if a piece of evidence confirms or refutes a hypothesis.

    **Hypothesis:**
    {hypothesis}

    **Evidence (Tool Output):**
    {validation_result}

    **Question:**
    Does the evidence support and confirm the hypothesis?

    **Your Answer (MUST be a single JSON object with a single boolean key "confirmed"):**
    {{
        "confirmed": true
    }}
    OR
    {{
        "confirmed": false
    }}
    """
    
    try:
        response = await acompletion(
            model=os.getenv('RCA_LLM_MODEL', 'gemini-1.5-pro'),
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        llm_response = json.loads(content)
        return llm_response.get("confirmed", False)
    except Exception as e:
        # print(f"Error during LLM-based validation: {e}")
        return False

### TODO: Client will give the MCP server of tools
def validation_agent_node(state: RCAState) -> Dict:
    # Increment the retry counter
    retries = state.get("retries", 0) + 1
    
    command = state.get("verification_command")
    if not command:
        return {"validation_result": "No verification command was provided.", "retries": retries}

    tool_map = {"inspect_payload_size": inspect_payload_size, "check_external_api_health": check_external_api_health}
    tool_name = command.get("tool")
    tool_args = command.get("args", {})
    
    if tool_name not in tool_map:
        return {"validation_result": f"Error: Tool '{tool_name}' not found.", "retries": retries}
        
    tool_function = tool_map[tool_name]
    try:
        result = tool_function.invoke(tool_args)
        return {"validation_result": result, "retries": retries}
    except Exception as e:
        return {"validation_result": f"Error executing tool '{tool_name}': {e}", "retries": retries}

async def supervisor_edge(state: RCAState) -> str:
    max_retries = 2
    retries = state.get("retries", 0)

    if retries >= max_retries:
        # print(f"--- Max retries ({max_retries}) reached. Proceeding to final report. ---")
        return "FinalReportGenerator"

    validation_result = state.get("validation_result")
    hypothesis = state.get("hypothesis")

    if not validation_result or not hypothesis:
        return "AnalysisAgent"

    hypothesis_confirmed = await validate_hypothesis_with_llm(hypothesis, validation_result)
    
    if hypothesis_confirmed:
        # print("--- Hypothesis confirmed by LLM. Proceeding to final report. ---")
        return "FinalReportGenerator"
    else:
        # print("--- Hypothesis refuted by LLM. Retrying analysis. ---")
        return "AnalysisAgent"

def build_graph() -> StateGraph:
    # This is the sub-graph that will run for each individual trace analysis
    rca_sub_graph = StateGraph(RCAState)
    rca_sub_graph.add_node("ContextBuilder", context_builder_node)
    rca_sub_graph.add_node("AnalysisAgent", analysis_agent_node)
    rca_sub_graph.add_node("ValidationAgent", validation_agent_node)
    rca_sub_graph.add_node("FinalReportGenerator", final_report_node)
    
    rca_sub_graph.set_entry_point("ContextBuilder")
    rca_sub_graph.add_edge("ContextBuilder", "AnalysisAgent")
    rca_sub_graph.add_conditional_edges(
        "AnalysisAgent",
        # The output of the analysis agent should always lead to validation.
        lambda x: "ValidationAgent",
        {"ValidationAgent": "ValidationAgent"}
    )
    rca_sub_graph.add_conditional_edges(
        "ValidationAgent",
        supervisor_edge,
        {"AnalysisAgent": "AnalysisAgent", "FinalReportGenerator": "FinalReportGenerator"}
    )
    rca_sub_graph.add_edge("FinalReportGenerator", END)
    
    runnable_sub_graph = rca_sub_graph.compile()

    # This is the main graph that orchestrates the parallel runs
    workflow = StateGraph(RCAState)
    workflow.add_node("enrichment", enrichment_node)
    workflow.add_node("scatter", scatter_node)
    workflow.add_node("sub_graphs", runnable_sub_graph.map())
    workflow.add_node("gather", gather_node)

    workflow.set_entry_point("enrichment")
    workflow.add_edge("enrichment", "scatter")
    workflow.add_edge("scatter", "sub_graphs")
    workflow.add_edge("sub_graphs", "gather")
    workflow.add_edge("gather", END)

    return workflow.compile()
    


def scatter_node(state: RCAState) -> Dict:
    """
    Takes the list of alerts and prepares them for parallel processing.
    The `map()` operator in the graph will treat each item in `sla_alerts`
    as a separate input for the sub-graph.
    """
    # Each item in the list will be processed by a separate instance of the sub-graph
    return {
        "sla_alert": state["sla_alerts"],
        # Pass down other state items needed by the sub-graph
        "messages": [[] for _ in state["sla_alerts"]],
        "retries": [0 for _ in state["sla_alerts"]],
    }

def gather_node(state: RCAState) -> Dict:
    """
    Gathers the results from the parallel sub-graph runs.
    The 'final_reports' will be a list containing the output of the 'FinalReportGenerator'
    from each parallel run.
    """
    return {"final_reports": state["final_reports"]}


def final_report_node(state: RCAState) -> Dict:
    hydrated_trace = state['hydrated_trace']
    
    # Find the node with the maximum deviation or duration
    bottleneck_node = "Unknown"
    max_duration = -1
    if hydrated_trace:
        for node, data in hydrated_trace.items():
            if data.get('duration_seconds', 0) > max_duration:
                max_duration = data['duration_seconds']
                bottleneck_node = node

    hypothesis = state.get('hypothesis', 'N/A')
    
    # Simple logic to determine action type based on hypothesis
    if "data volume" in hypothesis.lower():
        action_type = "Data Pre-processing"
        recommended_action = f"Investigate the source of large data payloads for the '{bottleneck_node}' node. Consider adding a pre-processing step to reduce data size before it hits this node."
    elif "system latency" in hypothesis.lower():
        action_type = "Configuration Change"
        recommended_action = f"The external dependency for '{bottleneck_node}' is slow. Check its status, consider increasing timeouts, or contact the service owner."
    else:
        action_type = "Workflow Redesign"
        recommended_action = f"The root cause is unclear, but the bottleneck is '{bottleneck_node}'. Review the logic and configuration of this node."

    report = RemediationPlan(
        bottleneck_node=bottleneck_node,
        root_cause_summary=hypothesis,
        recommended_action=recommended_action,
        action_type=action_type
    )
    
    # In the mapped sub-graph, we return a dictionary where the key matches
    # the state key we want to update. LangGraph will automatically append
    # this to the list in the main graph's state.
    return {"final_reports": report}


# async def main():
#     """
#     Main function to run the RCA agent.
#     """
#     app = build_graph()

#     # Simulate an incoming metric alert
#     metric_alert = MetricAlert(
#         metric_name="workflow_latency_seconds",
#         workflow_id="wf_marketing_email_blast",
#         filter_dimensions={"campaign_id": "q4_2025_promo"},
#         breach_time_utc="2025-12-04T10:00:00Z",
#         breach_value=15.5,
#         baseline_value=5.0,
#     )
    
#     initial_state = {
#         "metric_alert": metric_alert,
#     }

#     async for event in app.astream(initial_state, {"recursion_limit": 10}):
#         for key, value in event.items():
#             print(f"--- Event: {key} ---")
#             print(value)
#             print("\n")

# if __name__ == "__main__":
#     asyncio.run(main())
