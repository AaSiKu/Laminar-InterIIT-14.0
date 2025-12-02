from dotenv import load_dotenv
load_dotenv()
from typing import List, Dict
import json
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
from lib.agents import AlertResponse
from langchain.agents import create_agent
from langgraph.graph.state import CompiledStateGraph
from .agents import  model, create_planner_executor, AgentPayload
from .rca.summarize import summarize_prompt
from langchain_openai import ChatOpenAI
from langchain_mcp_adapters.client import MultiServerMCPClient
import os

planner_executor: CompiledStateGraph = None

# Use OpenAI's o1 reasoning model for complex analysis
reasoning_model = ChatOpenAI(model="o1", temperature=1, api_key=os.getenv("OPENAI_API_KEY"))

mcp_client = MultiServerMCPClient({
    "context7": {
        "transport": "streamable_http",
        "url": "https://mcp.context7.com/mcp",
        "headers": {"CONTEXT7_API_KEY": os.environ.get("CONTEXT7_API_KEY", "")},
    }
})
summarize_agent = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    global summarize_agent
    tools = await mcp_client.get_tools()
    summarize_agent = create_agent(
        model=reasoning_model,
        tools=tools,
        system_prompt=summarize_prompt,
    )
    yield


app = FastAPI(title="Agentic API", lifespan=lifespan)

# ============ API Endpoints ============

@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "message": "Agentic API is running"}

class InferModel(BaseModel):
    agents: List[AgentPayload]
    pipeline_name: str

@app.post("/build")
async def build(request: InferModel):
    global planner_executor
    planner_executor = create_planner_executor(request.agents)

    return {"status": "built"}

class Prompt(BaseModel):
    role: str
    content: str

class InitRCA(BaseModel):
    trace_ids : List[str]

class SummarizeRequest(BaseModel):
    metric_description: str
    pipeline_description: str
    semantic_origins: Dict[str, List[int]]

alert_agent = create_agent(
    model=model,
    tools=[],
    response_format=AlertResponse
)

class AlertRequest(BaseModel):
    alert_prompt: str
    trigger_description: str
    trigger_data: Dict

@app.post("/generate-alert")
async def generate_alert(alert_request: AlertRequest):
    full_prompt = (
        "Generate a structured alert based on the following information:\n\n"
        
        f"ALERT PURPOSE: {alert_request.alert_prompt}\n\n"
        
        f"TRIGGER CONDITION:\n{alert_request.trigger_description}\n\n"
        
        f"TRIGGER DATA:\n{json.dumps(alert_request.trigger_data, indent=2)}\n\n"
        
        "ALERT TYPE CRITERIA:\n"
        "- 'error': Critical failures, system errors, data corruption, security breaches\n"
        "- 'warning': Threshold exceeded, degraded performance, approaching limits, anomalies\n"
        "- 'info': Routine notifications, status updates, successful operations\n\n"
        
        "RESPONSE REQUIREMENTS:\n"
        "- Select the appropriate alert type based on severity\n"
        "- Write a concise message explaining what happened and why it matters\n"
        "- Include relevant values from trigger data (timestamps, counts, identifiers)\n"
        "- Keep message under 200 characters for dashboard display"
    )
    
    answer = await alert_agent.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": full_prompt
                }
            ]
        }
    )
    alert : AlertResponse = answer["structured_response"]
    return {"status": "ok", "alert": alert}


@app.post("/rca")
async def rca(init_rca_request: InitRCA):
    pass


@app.post("/summarize")
async def summarize(request: SummarizeRequest):
    """
    Generate natural language descriptions for special columns in SLA metric tables.
    """
    
    # Format semantic origins for the prompt
    semantic_origins_text = "\n".join(
        f"- {col_name}: Semantic origin at node(s) {str(origins)}"
        for col_name, origins in request.semantic_origins.items()
    )
    full_prompt = (
        f"=== SLA METRIC DESCRIPTION ===\n{request.metric_description}\n\n"
        f"=== PIPELINE DESCRIPTION ===\n{request.pipeline_description}\n\n"
        f"=== SEMANTIC ORIGINS ===\n{semantic_origins_text}\n\n"
        "Your goal is to produce a concise, professional, and technically precise natural-language description "
        "in MAXIMUM 3 lines per special column describing what each final special column in the metric table represents and their relation to telemetry entities or relationships.\n"
        "And in MAXIMUM 4 lines also explain how they together together indicate how different telemetry sources or event streams contribute to the derived SLA metric.\n"
        "Focus on semantics and context, not syntax or full restatement of the pipeline.\n"
        "use library /pathwaycom/pathway"
    )
    
    answer = await summarize_agent.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": full_prompt
                }
            ]
        }
    )
    
    summarized = answer["messages"][-1].content
    return {"status": "ok", "summarized": summarized}


@app.post("/infer")
async def infer(prompt: Prompt):
    if not planner_executor:
        raise HTTPException(status_code=502, detail="PIPELINE_ID not set in environment")
    answer = await planner_executor.ainvoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": prompt.content
                }
            ]
        }
    )
    answer = answer["messages"][-1].content
    return {"status": "ok", "answer": answer}