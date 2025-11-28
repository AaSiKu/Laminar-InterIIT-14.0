from typing import List, Union
from langgraph.graph.state import CompiledStateGraph
from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.tools import tool, BaseTool
from lib.agents import Agent
from .sql_tool import TablePayload, create_sql_tool
import os




class AgentPayload(Agent):
    tools: List[Union[TablePayload]]

model = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.0,
    max_retries=2,
    api_key=os.environ["GROQ_API_KEY"]
)

def build_agent(agent: AgentPayload) -> BaseTool:
    agent.name = agent.name.replace(" ", "_")
    # TODO: Create our pre defined custom tools array based on what the user has defined the agent's tools as
        # The custom tools feature should also include a human in the loop implementation
        # Implement mappings from tool ids to the actual tool function for custom tools
    # TODO: Make sure that the agent if connected to any RAG node(s) call them appropriately with structured output

    tool_tables = [tool for tool in agent.tools if isinstance(tool,TablePayload)]

    tools = []
    if len(tool_tables) > 0: 
        tools.append(create_sql_tool(tool_tables, agent.name))

    # Enhanced agent prompt with strict scope boundaries
    agent_system_prompt = (
        f"{agent.master_prompt}\n\n"
        
        "OUTPUT RULES (CRITICAL):\n"
        "1. Answer ONLY what is explicitly requested\n"
        "3. Do NOT provide additional context, related fields, or explanations unless requested\n"
        "4. Format: Clear, natural language with actual values\n"
        "5. Convert raw data (tuples, SQL results) into readable sentences\n\n"
        
        "When using SQL tools:\n"
        "- SELECT only the columns needed to answer the question\n"
        "- Do NOT SELECT * unless all fields are requested\n\n"
        "- Handling empty results on SELECT"
        "   - If an SQL query returns empty results ([], empty string, or no rows), clearly state that no data was found\n"
        "   - Explain what was searched for (e.g., 'No records found for X in table Y')\n"
        "   - Do NOT make assumptions or provide placeholder data\n"
        "   - Suggest that the requested data may not exist in the database"
    )
    
    langchain_agent = create_agent(model=model, system_prompt=agent_system_prompt, tools=tools)


    @tool(agent.name,description=agent.description)
    async def agent_as_tool(request: str) -> str:
        result = await langchain_agent.ainvoke({
            "messages": [{"role": "user", "content": request}]
        })
        return result["messages"][-1].content
    return agent_as_tool

def create_planner_executor(agents: List[CompiledStateGraph]):
    SUPERVISOR_PROMPT = (
        "You are a helpful personal assistant.\n"
        "Break down user requests into appropriate tool calls and coordinate the results.\n"
        "When a request involves multiple actions, use multiple tools in sequence.\n"
        "Output the answer, once complete.\n"
        "As an helpful personal assistant, ask the user for more clarification if needed but only when necessary\n"
        "As an helpful personal assistant, gracefully output any error that the user should know in executing the user requests\n"
    )
    planner_executor = create_agent(model, tools=agents, system_prompt=SUPERVISOR_PROMPT)
    
    return planner_executor