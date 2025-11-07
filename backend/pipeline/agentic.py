from typing import List
from lib.agent import Agent
from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.graph.state import CompiledStateGraph

import os

model = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.0,
    max_retries=2,
    api_key=os.environ["GROQ_API_KEY"]
)



def build_agentic_graph(agents: List[Agent], pipeline_name: str) -> CompiledStateGraph:
    agent_descriptions = '\n'.join([f"Agent with name {agent.name} described as: {agent.description}" for agent in agents])
    SUPERVISOR_PROMPT = (
        f"You are a supervisor agent that manages the {pipeline_name} pipeline"
        "You have the following list of agents you can call as tools"
        f"{agent_descriptions}"
        "Break down user requests into appropriate agent calls and coordinate the agents. "
    )
    
    agents_as_tool = []
    for agent in agents:
        # TODO: Create database access tools or our pre defined custom tools array based on what the user has defined the agent's tools as
            # The custom tools feature should also include a human in the loop implementation
            # Implement mappings from tool ids to the actual tool function for custom tools
            # Add a tool wrapper to database
        # TODO: Make sure the agentic LLM model does not hallucinate SQL calls
        # TODO: Make sure that the agent if connected to any RAG node(s) call them appropriately with structured output
        langchain_agent = create_agent(model=model,system_prompt=agent.master_prompt, tools=[])


        @tool(description=agent.description)
        def agent_as_tool(request: str) -> str:
            result = langchain_agent.invoke({
                "messages": [{"role": "user", "content": request}]
            })
            return result["messages"][-1].text
        agents_as_tool.append(agent_as_tool)

    supervisor_agent = create_agent(
        model,
        tools=agents_as_tool,
        system_prompt=SUPERVISOR_PROMPT,
    )
    return supervisor_agent