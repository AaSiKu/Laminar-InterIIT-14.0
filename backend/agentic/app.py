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
from .agents import create_planner_executor, AgentPayload
from .rca.summarize import summarize_prompt
from .llm_factory import create_reasoning_model, create_alert_model
from langchain_mcp_adapters.client import MultiServerMCPClient
import os
import sqlite3
import hashlib
from pathlib import Path

planner_executor: CompiledStateGraph = None

# Create reasoning model using the factory
# This will use the default provider (OpenAI with o1 model) for complex analysis
# To change provider, set DEFAULT_REASONING_PROVIDER environment variable
reasoning_model = create_reasoning_model()

# MCP client for Context7 integration (kept separate from LLM factory)
mcp_client = MultiServerMCPClient({
    "context7": {
        "transport": "streamable_http",
        "url": "https://mcp.context7.com/mcp",
        "headers": {"CONTEXT7_API_KEY": os.environ.get("CONTEXT7_API_KEY", "")},
    }
})
# SQLite cache setup
CACHE_DB_PATH = "summarize_prompts_cache.db"

def init_cache_db():
    """Initialize the SQLite cache database"""
    
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS summarize_cache (
            prompt_hash TEXT PRIMARY KEY,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def get_cached_response(full_prompt: str) -> str | None:
    """Retrieve cached response for a given prompt"""
    prompt_hash = hashlib.sha256(full_prompt.encode()).hexdigest()
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT response FROM summarize_cache WHERE prompt_hash = ?",
        (prompt_hash,)
    )
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

def cache_response(full_prompt: str, response: str):
    """Store a new prompt-response pair in the cache"""
    prompt_hash = hashlib.sha256(full_prompt.encode()).hexdigest()
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO summarize_cache (prompt_hash, prompt, response) VALUES (?, ?, ?)",
        (prompt_hash, full_prompt, response)
    )
    conn.commit()
    conn.close()

summarize_agent = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    
    global summarize_agent
    init_cache_db()
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

# Create alert model using the factory
# This will use the default provider (Groq) for fast alert generation
# To change provider, set DEFAULT_ALERT_PROVIDER environment variable
alert_agent = create_agent(
    model=create_alert_model(),
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
    
    # Check cache first
    cached_response = get_cached_response(full_prompt)
    if cached_response:
        return {"status": "ok", "summarized": cached_response, "cached": True}
    
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
    
    # Cache the response
    cache_response(full_prompt, summarized)
    
    return {"status": "ok", "summarized": summarized, "cached": False}


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