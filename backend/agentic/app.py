from typing import List, TypedDict, Union, Dict,Any, Literal
import json
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from pydantic import BaseModel
from lib.agents import Agent, AlertResponse
from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.graph.state import CompiledStateGraph
from langchain_community.utilities.sql_database import SQLDatabase
from langchain_community.tools import QuerySQLDataBaseTool
import os
load_dotenv()

from postgres_util import postgre_engine

model = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.0,
    max_retries=2,
    api_key=os.environ["GROQ_API_KEY"]
)



@asynccontextmanager
async def lifespan(app: FastAPI):
    global supervisor
    supervisor = None

    # Hand over control to FastAPI runtime
    yield


app = FastAPI(title="Agentic API", lifespan=lifespan)



# ============ API Endpoints ============

@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "message": "Agentic API is running"}

class TablePayload(TypedDict):
    table_name: str
    schema: Dict[str,Any]
    description: str

class AgentPayload(Agent):
    tools: List[Union[TablePayload]]
class InferModel(BaseModel):
    agents: List[AgentPayload]
    pipeline_name: str

@app.post("/build")
async def build(request: InferModel):
    agents = request.agents

    agent_descriptions = '\n'.join([f"Agent with name {agent.name} described as: {agent.description}" for agent in agents])
    SUPERVISOR_PROMPT = (
        f"You are a supervisor agent that manages the {request.pipeline_name} pipeline\n"
        "You have the following list of agents you can call as tools\n"
        f"{agent_descriptions}\n"
        "Break down user requests into appropriate agent calls and coordinate the agents, compile the answers and return what the user wants.\n"
        "Do not execute the tasks yourself\n"
    )
    
    agents_as_tool = []
    for agent in agents:
        agent.name = agent.name.replace(" ", "_")
        # TODO: Create our pre defined custom tools array based on what the user has defined the agent's tools as
            # The custom tools feature should also include a human in the loop implementation
            # Implement mappings from tool ids to the actual tool function for custom tools
        # TODO: Make sure the agentic LLM model does not hallucinate SQL calls
        # TODO: Make sure that the agent if connected to any RAG node(s) call them appropriately with structured output

        tool_tables = [tool for tool in agent.tools if isinstance(tool,TablePayload)]

        tools = []
        if len(tool_tables) > 0:
            db_agent = SQLDatabase(postgre_engine, include_tables=[table.table_name for table in tool_tables])
            
            db_description = (
                "The following is the list of tables you can access through this tool (in the format TABLE_NAME\n TABLE_SCHEMA:\n"
                f"{'\n'.join([
                    f"{i+1}. {table.table_name}\n{json.dumps(table.schema)}" for i,table in enumerate(tool_tables)
                ])}\n"
                "Input to this tool is a detailed and correct SQL query, output is a result from the database.\n"
                "Only use this tool for read requests and when you absolutely need some data from the table."
                "If the query is not correct, an error message will be returned.\n"
                "If an error is returned, rewrite the query, check the query, and try again.\n"
            )
            tools.append(QuerySQLDataBaseTool(description=db_description, db=db_agent))

        langchain_agent = create_agent(model=model,system_prompt=agent.master_prompt, tools=tools)


        @tool(agent.name,description=agent.description)
        async def agent_as_tool(request: str) -> str:
            result = await langchain_agent.ainvoke({
                "messages": [{"role": "user", "content": request}]
            })
            return result["messages"][-1].content
        agents_as_tool.append(agent_as_tool)

    global supervisor
    supervisor = create_agent(
        model,
        tools=agents_as_tool,
        system_prompt=SUPERVISOR_PROMPT,
    )

    return {"status": "built"}

class Prompt(BaseModel):
    role: str
    content: str


@app.post("/infer")
async def infer(prompt: Prompt):
    if not supervisor:
        raise HTTPException(status_code=502, detail="PIPELINE_ID not set in environment")
    answer = await supervisor.ainvoke(
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
        "You are an alert generator. Produce a concise alert message.\n"
        f"Alert Purpose: {alert_request.alert_prompt}\n"
        "Trigger Description:\n"
        f"{alert_request.trigger_description}\n"

        "Trigger Data (JSON):\n"
        f"{json.dumps(alert_request.trigger_data, indent=2)}\n"

        "Decide the alert type:\n"
        "- Use \"warning\" for undesirable but non-critical conditions.\n"
        "- Use \"error\" for failed operations or critical issues.\n"
        "- Use \"info\" for neutral notifications.\n"

        "Return only a valid alert matching the schema.\n"
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