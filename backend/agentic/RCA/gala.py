import asyncio
import json
from typing import List, TypedDict, Annotated, Dict, Optional
from sqlalchemy import text
import docker
import re
from collections import Counter
# from docker.errors import NotFound
from pydantic.v1 import BaseModel, ConfigDict, Field
# from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

try:
    import litellm
    LITELLM_AVAILABLE = True
except Exception:
    LITELLM_AVAILABLE = False

class DiagnosticBundle(BaseModel):
    
    pipeline_id: str = Field(description="The unique identifier for the running pipeline instance.")
    service_dependency_subgraph: List[str] = Field(description="A directed list of services involved in the trace.")
    temporal_performance_profile: List[str] = Field(description="A summary of critical metric deviations.")
    error_log_abstraction: List[str] = Field(description="A de-duplicated set of unique error signatures from logs.")

class RCAState(TypedDict):
    
    trace_id: str
    diagnostic_bundle: DiagnosticBundle
    similar_past_cases: List[str]
    hypothesis: str
    verification_command: str
    validation_result: str
    messages: Annotated[list, add_messages]

try:
    docker_client = docker.from_env()
except Exception as e:
    print(f"Could not connect to Docker daemon: {e}")
    docker_client = None

DB_CONFIG = {
    "host": os.getenv("host", "localhost"), 
    "port": os.getenv("port", "5432"),
    "dbname": os.getenv("dbname", "postgres"),
    "user": os.getenv("user", "postgres"),
    "password": os.getenv("password"),
}
POSTGRES_URL = f"postgresql+psycopg2://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}"
db_engine = create_engine(POSTGRES_URL)


@tool
def verify_docker_state(pipeline_id: str, component_label: str) -> str:
    """
    Checks a Docker container's state and returns its status or exit code.
    """
    print(f"---TOOL: Scanning Docker for pipeline='{pipeline_id}', component='{component_label}'---")
    
    if not docker_client:
        return "Error: Docker client not available."
        
    try:
        filters = {
            "label": [f"pipeline_id={pipeline_id}", f"component={component_label}"]
        }
        containers = docker_client.containers.list(all=True, filters=filters)
        
        if not containers:
            return f"Status: Not Found. No container matches pipeline={pipeline_id} and component={component_label}"
            
        results = []
        for c in containers:
            state = c.status
            exit_code = c.attrs['State'].get('ExitCode', 'N/A')
            error_msg = c.attrs['State'].get('Error', '')
            results.append(f"Container {c.short_id}: Status={state}, ExitCode={exit_code}, DockerError='{error_msg}'")
            
        return "\n".join(results)

    except Exception as e:
        return f"Error interacting with Docker daemon: {str(e)}"


@tool
def query_postgres_node_output(table_name: str, limit: int = 5) -> str:
    """
    Queries a specific node's output table in PostgreSQL.
    """
    print(f"---TOOL: Safely querying Postgres table '{table_name}'---")
    # allowed table prefixes to prevent reading 'users' or 'secrets' or any PII data
    ALLOWED_PREFIXES = ["kafka_input", "transform_node", "join_node", "sink_node"]
    if not any(table_name.startswith(prefix) for prefix in ALLOWED_PREFIXES):
        return "Error: Security Violation. Access to this table is restricted."

    # Use SQLAlchemy text() with bind parameters for values
    # Note: Table names cannot be bound parameters in SQL, so we validate the name above
    # then safely interpolate.
    safe_query = text(f'SELECT * FROM "{table_name}" LIMIT :limit')
    
    try:
        with db_engine.connect() as connection:
            # Execute with bound parameters
            result_proxy = connection.execute(safe_query, {"limit": limit})
            rows = result_proxy.fetchall()
            
            if not rows:
                return f"Table '{table_name}' exists but is empty."
            
            return f"First {limit} rows from '{table_name}': {str(rows)}"
            
    except Exception as e:
        # Catch specific DB errors (like table not found) for better context
        if "does not exist" in str(e):
            return f"Error: Table '{table_name}' does not exist in the database."
        return f"Database Error: {str(e)}"

@tool
def check_kafka_alerts(pipeline_id: str) -> str:
    """
    Simulates checking for recent alerts on the pipeline's Kafka topic.
    """
    print(f"---TOOL: Checking Kafka alerts for topic 'alert_{pipeline_id}'---")
    if pipeline_id == "pipeline-xyz-789":
        return "Alerts found: ['CRITICAL: Database connection failed', 'WARN: High processing latency']"
    return "No recent alerts found."

tools = [verify_docker_state, query_postgres_node_output, check_kafka_alerts]

class MockLLM:
    """A mock LLM to simulate responses, kept as a fallback."""
    def __init__(self, loop_count=0):
        self.loop_count = loop_count

    async def generate_hypothesis(self, state: RCAState) -> Dict:
        print("---MockLLM: Generating hypothesis---")
        bundle = state['diagnostic_bundle']
        # More robust check for the "zero output" scenario
        critical_output_drop = any("Output Throughput: 0 records/sec" in s for s in bundle.temporal_performance_profile)

        if self.loop_count == 0:
            if critical_output_drop:
                return {
                    "hypothesis": "The pipeline ran but produced no output. The issue might be in the final processing step. Let's check the output table of the last node.",
                    "verification_command": json.dumps({"tool": "query_postgres_node_output", "args": {"table_name": "transform_node__2"}})
                }
        elif self.loop_count == 1:
            validation_res = state.get("validation_result", "")
            # More robust check for the "empty table" validation result
            if "exists but is empty" in validation_res:
                return {
                    "hypothesis": "The final transform node's output is empty. This implies the error is upstream. Let's check the input source node's output table.",
                    "verification_command": json.dumps({"tool": "query_postgres_node_output", "args": {"table_name": "kafka_input__0"}})
                }
        return {"hypothesis": "Unable to determine root cause.", "verification_command": "{}"}


async def get_gemini_hypothesis(state: RCAState, loop_count: int = 0) -> Dict:
    """
    Call Gemini via litellm to obtain a structured hypothesis.
    Returns a dict with keys: hypothesis, verification_command, or {"error": ...} on failure.
    """
    if not LITELLM_AVAILABLE:
        return {"error": "litellm library not installed"}

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("LITELLM_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY not set"}

    bundle = state['diagnostic_bundle']
    
    tool_list = "\n".join([f"- {t.name}: {t.description}" for t in tools])
    previous_result = state.get("validation_result")
    history = f"A previous verification attempt resulted in: {previous_result}\nUse this information to form a new, different hypothesis." if previous_result else ""

    prompt = (
        "You are an expert root cause analysis agent for a data pipeline.\n"
        "Analyze the following diagnostic data:\n"
        f"Pipeline ID: {bundle.pipeline_id}\n"
        f"Service Dependency: {'; '.join(bundle.service_dependency_subgraph)}\n"
        f"Temporal Profile: {'; '.join(bundle.temporal_performance_profile)}\n"
        f"Error Logs: {'; '.join(bundle.error_log_abstraction)}\n\n"
        f"{history}\n\n"
        "Your task is to provide a single, concise root-cause hypothesis and a verification command.\n"
        "The verification command MUST be a JSON object that calls one of the following available tools:\n"
        f"{tool_list}\n\n"
        "Example of a valid JSON response:\n"
        '{"hypothesis": "The final output is empty, so the issue may be in the last transform node.", "verification_command": "{\\"tool\\": \\"query_postgres_node_output\\", \\"args\\": {\\"table_name\\": \\"transform_node__2\\"}}"}\n\n'
        "Now, provide your analysis as a single JSON object with keys 'hypothesis' and 'verification_command'."
    )

    try:
        model = os.getenv("RCA_LLM_MODEL", "gemini/gemini-2.5-pro")
        resp = await litellm.acompletion(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content
        if isinstance(content, str):
            return json.loads(content)
        return content
    except Exception as e:
        return {"error": str(e)}

def cluster_logs(raw_logs: List[str]) -> List[str]:
    """
    'Log Abstraction'
    It replaces dynamic tokens (numbers, GUIDs) to find patterns.
    """
    patterns = []
    for log in raw_logs:
        # Regex to mask Timestamps (ISO8601-ish)
        mask_1 = re.sub(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?', '<TIMESTAMP>', log)
        # Regex to mask GUIDs/UUIDs
        mask_2 = re.sub(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', '<UUID>', mask_1)
        # Regex to mask generic numbers (e.g. pids, ports, counts)
        mask_3 = re.sub(r'\b\d+\b', '<NUM>', mask_2)
        patterns.append(mask_3)
    
    # Count occurrences of each template
    counts = Counter(patterns)
    
    # Return formatted abstraction
    abstraction = []
    for template, count in counts.most_common(10): # Top 10 patterns
        abstraction.append(f"[Count: {count}] {template}")
    
    return abstraction

async def context_builder_node(state: RCAState) -> RCAState:
    """
    Node A: The Context Builder.
    performs active Log Abstraction instead of using static data.
    """
    print("---NODE A: Context Builder (Processing Raw Data)---")
    
    raw_logs_simulation = [
        "2023-10-27T10:00:01 ERROR Connection refused to DB at 192.168.1.5",
        "2023-10-27T10:00:02 ERROR Connection refused to DB at 192.168.1.5",
        "2023-10-27T10:00:03 INFO Processing item 45231",
        "2023-10-27T10:00:04 ERROR Connection refused to DB at 192.168.1.5",
        "2023-10-27T10:00:05 WARN Retry attempt 1 for item 45231",
    ]
    
    log_summary = cluster_logs(raw_logs_simulation)
    
    bundle = DiagnosticBundle(
        pipeline_id="pipeline-xyz-789",
        service_dependency_subgraph=["kafka_input -> join_node -> transform_node"],
        temporal_performance_profile=[
            "CPU Usage: 15% (Normal)", 
            "Memory Usage: 45% (Normal)", 
            "Output Throughput: 0 records/sec (Critical Drop)"
        ],
        error_log_abstraction=log_summary
    )
    
    return {**state, "diagnostic_bundle": bundle}

async def retrieval_agent_node(state: RCAState) -> RCAState:
    """
    Node B: The Retrieval Agent.
    Queries a mock vector DB for similar historical incidents.
    """
    print("---NODE B: Retrieval Agent---")
    similar_past_cases = [
        "Case #4321: Empty output caused by incorrect join key in 'join_node__1'.",
        "Case #8765: Empty output caused by upstream Kafka topic being empty."
    ]
    return {**state, "similar_past_cases": similar_past_cases}

async def analysis_agent_node(state: RCAState) -> RCAState:
    
    print("---NODE C: Analysis Agent---")
    await asyncio.sleep(1)

    gemini_used = False
    gemini_result = None
    if LITELLM_AVAILABLE and (os.getenv("GEMINI_API_KEY") or os.getenv("LITELLM_API_KEY")):
        gemini_result = await get_gemini_hypothesis(state, loop_count=state.get('messages', []) and len(state['messages']) // 2 or 0)
        if gemini_result and not gemini_result.get("error"):
            gemini_used = True

    if gemini_used:
        return {**state, "hypothesis": gemini_result.get('hypothesis'), "verification_command": gemini_result.get('verification_command')}

    if gemini_result and gemini_result.get("error"):
        print(f"Gemini error: {gemini_result.get('error')} - falling back to MockLLM")

    llm = MockLLM(loop_count=state.get('messages', []) and len(state['messages']) // 2 or 0)
    response = await llm.generate_hypothesis(state)
    return {**state, "hypothesis": response.get("hypothesis"), "verification_command": response.get("verification_command")}

async def validation_agent_node(state: RCAState) -> RCAState:
    """
    Node D: The Validation Agent.
    Executes the verification command using the available tools.
    """
    print("---NODE D: Validation Agent---")
    command_str = state.get("verification_command", "{}")
    try:
        command = json.loads(command_str)
    except json.JSONDecodeError:
        return {**state, "validation_result": "Error: Invalid verification command format."}

    tool_name = command.get("tool")
    tool_args = command.get("args", {})

    result = f"Validation failed: Tool '{tool_name}' not found."
    for tool_func in tools:
        if tool_func.name == tool_name:
            # In a real scenario, you'd handle tool exceptions gracefully
            result = tool_func.invoke(tool_args)
            break
    return {**state, "validation_result": result}


def supervisor_edge(state: RCAState) -> str:
    """
    Node E: The Supervisor.
    Evaluates the validation result and decides the next step.
    """
    print("---NODE E: Supervisor---")
    validation_result = state.get("validation_result", "")
    if "kafka_input__0" in validation_result and "exists but is empty" not in validation_result:
        print("---SUPERVISOR: Hypothesis confirmed. Root cause isolated between input and transform. Ending workflow.---")
        return "end"
    else:
        print("---SUPERVISOR: Hypothesis rejected or needs more data. Looping back to Analyst.---")
        return "continue"

# --- 6. Graph Definition & Execution ---

def build_graph() -> StateGraph:
    """Builds and compiles the LangGraph for the MA-RCA workflow."""
    workflow = StateGraph(RCAState)

    workflow.add_node("ContextBuilder", context_builder_node)

    workflow.add_node("RetrievalAgent", retrieval_agent_node)

    workflow.add_node("AnalysisAgent", analysis_agent_node)

    workflow.add_node("ValidationAgent", validation_agent_node)

    workflow.set_entry_point("ContextBuilder")
    
    workflow.add_edge("ContextBuilder", "RetrievalAgent")
    
    workflow.add_edge("RetrievalAgent", "AnalysisAgent")
    
    workflow.add_edge("AnalysisAgent", "ValidationAgent")

    workflow.add_conditional_edges(

        "ValidationAgent",

        supervisor_edge,

        {"continue": "AnalysisAgent", "end": END},
    )

    app = workflow.compile()
    return app

async def main():
    """Main function to run a simulated RCA scenario."""
    print("### STARTING CUSTOMIZED MA-RCA WORKFLOW ###\n")
    app = build_graph()

    # Define the initial alert scenario
    initial_state = {
        "trace_id": "trace-xyz-789",
        "messages": [],
    }

    print("---SIMULATION: Setting up mock database state---")
    try:
        with db_engine.connect() as connection:
            connection.execute(text('CREATE TABLE IF NOT EXISTS "kafka_input__0" (id INT);'))
            connection.execute(text('TRUNCATE TABLE "kafka_input__0";'))
            connection.execute(text('INSERT INTO "kafka_input__0" SELECT generate_series(1, 1000);'))
            connection.execute(text('CREATE TABLE IF NOT EXISTS "transform_node__2" (id INT);'))
            connection.execute(text('TRUNCATE TABLE "transform_node__2";'))
            connection.commit()
        print("---SIMULATION: Mock database state is ready---\n")
    except Exception as e:
        print(f"Could not set up mock database. Please ensure Postgres is running and accessible. Error: {e}")
        return


    # Stream the graph execution
    async for event in app.astream(initial_state):
        for key, value in event.items():
            print(f"--- Event: {key} ---")
            # Pretty print the state for readability
            if isinstance(value, dict):
                for k, v in value.items():
                    print(f"  {k}: {v}")
            else:
                print(value)
            print("\n")

    print("\n### MA-RCA WORKFLOW COMPLETE ###")

if __name__ == "__main__":
    asyncio.run(main())
