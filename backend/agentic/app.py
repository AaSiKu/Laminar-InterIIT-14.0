from dotenv import load_dotenv
load_dotenv()
from typing import List
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from pydantic import BaseModel
from langgraph.graph.state import CompiledStateGraph
from .prompts import create_planner_executor, AgentPayload
from .rca.summarize import init_summarize_agent, summarize

planner_executor: CompiledStateGraph = None

# Use OpenAI's o1 reasoning model for complex analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_summarize_agent()
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

@app.post("/generate-alert")()

@app.post("/summarize")(summarize)

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