import asyncio
import json
import os
from dotnev import load_dotenv
from typing import List, TypedDict, Annotated, Dict, Optional, Literal
from pydantic.v1 import BaseModel, Field
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.tools import tool
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_community.vectorstores.faiss import FAISS
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
import numpy as np
import litellm
from litellm import acompletion
import psycopg2 # Assumed to be installed for database access

load_dotenv()

class SLAAlert(BaseModel):
    workflow_id: str = Field(
        description="The unique identifier for the workflow definition."
    )
    execution_id: str = Field(
        description="The unique identifier for the specific workflow run."
    )
    trigger_node: str = Field(
        description="The first node in the workflow."
    )
    breach_magnitude: str = Field(
        description="Human-readable summary of the breach (e.g., '300% over baseline')."
    )
    trace_timings: Dict[str, float] = Field(
        description="A JSON object mapping node names to their execution duration in seconds."
    )
    has_error: bool = Field(default=False, description="Flag indicating if the workflow run failed with an error.")
    error_node: Optional[str] = Field(default=None, description="The node that produced the error.")
    error_message: Optional[str] = Field(default=None, description="A summary of the error message.")

class PlausibleAction(BaseModel):
    action_description: str = Field(
        description="A human-readable description of the suggested action."
    )
    source_case_id: str = Field(
        description="The ID of the past case this suggestion is based on."
    )
    confidence_score: float = Field(
        description="A score from 0.0 to 1.0 indicating the relevance."
    )

class RemediationPlan(BaseModel):
    bottleneck_node: str = Field(
        description="The node identified as the primary cause of the latency."
    )
    root_cause_summary: str = Field(
        description="A concise explanation of the root cause (e.g., 'Data Volume Issue')."
    )
    recommended_action: str = Field(
        description="The specific, actionable step the user should take."
    )
    action_type: Literal["Configuration Change", "Workflow Redesign", "Data Pre-processing"] = Field(
        description="The category of the recommended action."
    )

class RCAState(TypedDict):
    sla_alert: SLAAlert
    suggested_quick_fixes: Optional[List[PlausibleAction]]
    hydrated_trace: Optional[Dict[str, any]]
    error_logs: Optional[List[Dict]]
    hypothesis: Optional[str]
    verification_command: Optional[Dict]
    validation_result: Optional[str]
    final_report: Optional[RemediationPlan]
    messages: Annotated[list, add_messages]

host = os.getenv("host", "localhost")
port = os.getenv("port", "5432")
dbname = os.getenv("dbname", "observability")
user = os.getenv("user", "user")
password = os.getenv("password", "password")

DB_CONNECTION_PARAMS = f"host='{host}' port='{port}' dbname='{dbname}' user='{user}' password='{password}'"

def get_workflow_from_db(
        workflow_id: str
) -> dict:
    """Fetches workflow topology from the PostgreSQL database."""
    # with psycopg2.connect(DB_CONNECTION_PARAMS) as conn:
    #     with conn.cursor() as cur:
    #         cur.execute("SELECT topology FROM workflows WHERE id = %s", (workflow_id,))
    #         return cur.fetchone()[0]
    print(f"DATABASE: Fetching workflow topology for {workflow_id}")
    # Returning mock data for structure reference
    return {
        "nodes": {
            "start": {"type": "WebhookTrigger"},
            "fetch_data": {"type": "HTTP_Request", "config": {"url": "https://api.thirdparty.com/v1/records"}},
            "process_data": {"type": "Code", "config": {"timeout": "30s"}},
            "save_results": {"type": "PostgresQuery"}
        }
    }

def get_baselines_from_db(
        workflow_id: str
) -> dict:
    """Fetches performance baselines from the PostgreSQL database."""
    print(f"DATABASE: Fetching performance baselines for {workflow_id}")
    # with psycopg2.connect(DB_CONNECTION_PARAMS) as conn:
    #     ...
    return {
        "fetch_data": {"p95": 2.0},
        "process_data": {"p95": 5.0},
    }

def get_past_cases_from_db() -> List[Document]:
    """Fetches historical remediation cases from the PostgreSQL database."""
    print("DATABASE: Fetching historical cases for vector store.")
    # with psycopg2.connect(DB_CONNECTION_PARAMS) as conn:
    #     ...
    return [
        Document(
            page_content="An HTTP request node timed out because the input JSON payload was over 20MB.",
            metadata={"case_id": "case_002", "action": "Add a 'Split in Batches' node to reduce payload size per call."}
        ),
    ]

def get_payload_size_from_opentelemetry(
        execution_id: str,
        node_name: str
) -> dict:
    """
    Queries the OpenTelemetry traces in PostgreSQL to find the payload size
    for a specific span (node).
    """
    print(f"DATABASE: Querying OpenTelemetry traces for payload size of {node_name} in {execution_id}")
    # with psycopg2.connect(DB_CONNECTION_PARAMS) as conn:
    #     with conn.cursor() as cur:
    #         # This query is an example and depends heavily on your schema
    #         cur.execute("""
    #             SELECT attributes->>'http.request.content_length'
    #             FROM otel_spans
    #             WHERE trace_id = %s AND name = %s;
    #         """, (execution_id, node_name))
    #         size_bytes = cur.fetchone()[0]
    #         return {"size_mb": int(size_bytes) / (1024*1024)}
    # Simulate the large payload for the specific execution ID
    if execution_id == "exec_xyz_789":
        return {"size_mb": 50}
    return {"size_mb": 0.5}

def get_api_health_from_monitoring(url: str) -> dict:
    """
    Queries a monitoring database or calls a monitoring service API
    to get the health of an external endpoint.
    """
    print(f"DATABASE: Querying monitoring service for health of {url}")
    # with psycopg2.connect(DB_CONNECTION_PARAMS) as conn:
    #     ...
    return {"status": "healthy", "avg_latency_ms": 800}

def analyze_financial_impact(
    question: str,
):
    llm = ChatGoogleGenerativeAI(
        model='gemini-2.5-pro',
        temperature=0.2,
        google_api_version="v1",
    )

    tavily = TavilySearchResults(max_results=3)
    agent = create_react_agent(llm, [tavily])

    SYSTEM_PROMPT = f"""You are a Senior Business Analyst and Cloud Economist, tasked with providing a financial impact assessment for a technical service disruption. Your audience is a non-technical executive team, so your analysis must be clear, concise, and focused on business outcomes.

Based on the incident details provided in the user's question, generate a professional business report.

**Your report must include the following sections using Markdown:**

1.  **Executive Summary:**
    *   Start with a one-paragraph, high-level overview of the incident and its most significant financial consequences.

2.  **Estimated Direct Financial Costs:**
    *   Quantify the immediate, measurable financial losses.
    *   Use your web search tool to find industry benchmarks for metrics like:
        *   Cost of IT downtime per hour for the relevant industry (e.g., e-commerce, SaaS, finance).
        *   Typical SLA (Service Level Agreement) penalty calculations.
        *   Estimated lost revenue from failed transactions or user activity during the outage.
    *   Clearly state your assumptions (e.g., "Assuming 1,000 transactions per hour at an average value of $50...").

3.  **Indirect Business Impact:**
    *   Analyze the less tangible, but often more significant, long-term costs.
    *   Consider factors such as:
        *   Damage to customer trust and brand reputation.
        *   Potential for customer churn and impact on user retention.
        *   Cost of engineering and operational team time spent on investigation and remediation (use industry-average salaries for estimation if needed).

4.  **Strategic Recommendations:**
    *   Suggest 1-2 high-level, business-focused actions to mitigate future risks.
    *   Frame these recommendations in terms of ROI (Return on Investment), such as "Investing in an automated batch-processing solution could prevent an estimated $X in future losses."

**Crucial Instructions:**
*   **Be Quantitative:** Use numbers and estimates wherever possible.
*   **Cite Your Sources:** When you use data from your web search, mention it (e.g., "According to a 2024 Gartner report...").
*   **State Assumptions:** Clearly articulate any assumptions made during your calculations."""
    result = agent.invoke({
        "messages": [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=question)
        ]
    })

    return result["messages"][-1].content

    

class VectorStore:
    def __init__(self, file_path: str = "rca_vector_store.faiss"):
        self.file_path = file_path
        try:
            self.embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
            if os.path.exists(self.file_path):
                self.index = FAISS.load_local(self.file_path, self.embeddings, allow_dangerous_deserialization=True)
                print(f"VectorStore loaded from {self.file_path}.")
            else:
                self.index = FAISS(
                    embedding_function=self.embeddings,
                    index=np.zeros((0, 768), dtype=np.float32),
                    docstore=InMemoryDocstore(),
                    index_to_docstore_id={}
                )
                print("New VectorStore initialized.")
        except Exception as e:
            print(f"FATAL: Failed to initialize FAISS/Google embeddings: {e}.")
            self.index = None

    def add_remediation_cases(self, cases: List[Document]):
        if self.index is None: return
        self.index.add_documents(cases)
        self.index.save_local(self.file_path)
        print(f"Added {len(cases)} cases and saved to {self.file_path}.")

    def find_similar_cases(self, query: str, k: int = 2) -> List[PlausibleAction]:
        if self.index is None: return []
        results = self.index.similarity_search_with_score(query, k=k)
        return [
            PlausibleAction(
                action_description=doc.metadata.get("action", "No action specified."),
                source_case_id=doc.metadata.get("case_id", "N/A"),
                confidence_score=1 - score
            ) for doc, score in results
        ]

@tool
def inspect_payload_size(
    execution_id: str, 
    node_name: str
) -> str:
    """
    Inspects the size of the data payload passed to a specific node during a given execution.
    """
    return json.dumps(get_payload_size_from_opentelemetry(execution_id, node_name))

@tool
def check_external_api_health(
    url: str
) -> str:
    """
    Checks the health and average response time of an external API endpoint.
    """
    return json.dumps(get_api_health_from_monitoring(url))

# --- 4. Core Agent Nodes ---

def context_builder_node(
        state: RCAState
) -> Dict:
    alert = state['sla_alert']
    topology = get_workflow_from_db(alert.workflow_id)
    baselines = get_baselines_from_db(alert.workflow_id)
    
    hydrated_trace = {}
    for node, duration in alert.trace_timings.items():
        baseline_p95 = baselines.get(node, {}).get("p95")
        deviation = "N/A"
        if baseline_p95:
            deviation_percent = ((duration - baseline_p95) / baseline_p95) * 100
            deviation = f"{deviation_percent:.0f}% over p95 baseline"
            
        hydrated_trace[node] = {
            "duration_seconds": duration,
            "baseline_p95_seconds": baseline_p95,
            "deviation": deviation,
            "config": topology.get("nodes", {}).get(node, {}).get("config")
        }
    
    error_logs = []
    if alert.has_error and alert.error_node:
        # In a real system, this would query a log store like OpenTelemetry,
        # using the execution_id as the trace_id.
        error_logs = [{
            "timestamp": "2025-11-30T10:05:30Z",
            "level": "ERROR",
            "node": alert.error_node,
            "message": alert.error_message,
            "trace_id": alert.execution_id
        }]

    return {"hydrated_trace": hydrated_trace, "error_logs": error_logs}

def retrieval_agent_node(state: RCAState) -> Dict:
    alert = state['sla_alert']
    bottleneck_node = max(alert.trace_timings, key=alert.trace_timings.get)
    query = f"SLA breach in workflow {alert.workflow_id} at node {bottleneck_node}. Breach magnitude: {alert.breach_magnitude}."
    
    similar_cases = vector_store.find_similar_cases(query)
        
    return {"suggested_quick_fixes": similar_cases}

async def analysis_agent_node(state: RCAState) -> Dict:
    error_context = "No errors detected."
    if state.get("error_logs"):
        error_context = f"**Error Logs:**\n{json.dumps(state['error_logs'], indent=2)}"

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

    **Previous Tool Output (if any):**
    {state.get('validation_result', 'N/A')}

    **Your Goal:**
    1. Form a `hypothesis` about the root cause (is it 'System Latency', 'Data Volume', or a specific 'Error Condition'?).
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

def validation_agent_node(state: RCAState) -> Dict:
    command = state.get("verification_command")
    if not command:
        return {"validation_result": "No verification command was provided."}

    tool_map = {"inspect_payload_size": inspect_payload_size, "check_external_api_health": check_external_api_health}
    tool_name = command.get("tool")
    tool_args = command.get("args", {})
    
    if tool_name not in tool_map:
        return {"validation_result": f"Error: Tool '{tool_name}' not found."}
        
    tool_function = tool_map[tool_name]
    try:
        result = tool_function.invoke(tool_args)
        return {"validation_result": result}
    except Exception as e:
        return {"validation_result": f"Error executing tool '{tool_name}': {e}"}

def supervisor_edge(state: RCAState) -> str:
    if state.get("validation_result"):
        validation_data = json.loads(state['validation_result'])
        if "size_mb" in validation_data and validation_data["size_mb"] > 10:
             return "generate_final_report"
        
        return "AnalysisAgent"

    return "AnalysisAgent"

def final_report_node(state: RCAState) -> Dict:
    bottleneck_node = max(state['sla_alert'].trace_timings, key=state['sla_alert'].trace_timings.get)
    
    report = RemediationPlan(
        bottleneck_node=bottleneck_node,
        root_cause_summary="Data Volume Issue: The payload processed by the node was excessively large (50MB), causing a timeout.",
        recommended_action="Add a 'Split in Batches' node before the HTTP Request node to process records in smaller chunks.",
        action_type="Workflow Redesign"
    )
    
    return {"final_report": report}


def build_graph() -> StateGraph:
    workflow = StateGraph(RCAState)

    workflow.add_node("ContextBuilder", context_builder_node)
    workflow.add_node("RetrievalAgent", retrieval_agent_node)
    workflow.add_node("AnalysisAgent", analysis_agent_node)
    workflow.add_node("ValidationAgent", validation_agent_node)
    workflow.add_node("generate_final_report", final_report_node)

    workflow.set_entry_point("ContextBuilder")
    workflow.add_edge("ContextBuilder", "RetrievalAgent")
    workflow.add_edge("RetrievalAgent", "AnalysisAgent")

    workflow.add_conditional_edges(
        "AnalysisAgent",
        lambda x: "ValidationAgent",
        {"ValidationAgent": "ValidationAgent"}
    )
    
    workflow.add_conditional_edges(
        "ValidationAgent",
        supervisor_edge,
        {
            "AnalysisAgent": "AnalysisAgent",
            "generate_final_report": "generate_final_report"
        }
    )
    
    workflow.add_edge("generate_final_report", END)
    
    return workflow.compile()

# --- 6. Main Simulation Block ---

if __name__ == "__main__":
    vector_store = VectorStore()
    past_cases = [
        Document(
            page_content="A workflow with a slow HTTP node was fixed by enabling caching on the API endpoint.",
            metadata={"case_id": "case_001", "action": "Enable caching on the target API."}
        ),
        Document(
            page_content="An HTTP request node timed out because the input JSON payload was over 20MB.",
            metadata={"case_id": "case_002", "action": "Add a 'Split in Batches' node to reduce payload size per call."}
        ),
        Document(
            page_content="High latency in a Postgres node was resolved by adding an index to the queried table.",
            metadata={"case_id": "case_003", "action": "Add a database index to the 'created_at' column."}
        )
    ]
    vector_store.add_remediation_cases(past_cases)
    
    simulated_alert = SLAAlert(
        workflow_id="wf_abc_123",
        execution_id="exec_xyz_789",
        trigger_node="start",
        breach_magnitude="500% over p95 baseline",
        trace_timings={
            "start": 0.1,
            "fetch_data": 30.0,
            "process_data": 0.0,
            "save_results": 0.0
        }
    )

    app = build_graph()
    
    initial_state = {"sla_alert": simulated_alert, "messages": []}
    
    async def run_agent():
        async for event in app.astream(initial_state):
            pass

    asyncio.run(run_agent())
