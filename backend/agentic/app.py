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


planner_executor: CompiledStateGraph = None

@asynccontextmanager
async def lifespan(app: FastAPI):
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