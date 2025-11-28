from typing import List, Union
from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.tools import BaseTool
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

    tool_tables = [tool for tool in agent.tools if isinstance(tool,TablePayload)]
    tools = []
    table_descriptions = None
    if len(tool_tables) > 0: 
        query_tool, _table_descriptions= create_sql_tool(tool_tables, agent.name)
        table_descriptions = _table_descriptions
        tools.append(query_tool)

    # TODO: Enhance prompt to include instructions to handle the RAGNode as a tool as well as other custom tools
    agent_system_prompt = (
        f"You are an agent with the following description:\n{agent.description}\n\n"
        
        "OUTPUT RULES (CRITICAL):\n"
        "1. Answer ONLY what is explicitly requested\n"
        "3. Do NOT provide additional context, related fields, or explanations unless requested\n"
        "4. Format: Clear, natural language with actual values\n"
        "5. Convert raw data (objects, tuples, SQL results) into readable sentences\n\n"
    )
    
    langchain_agent = create_agent(model=model, system_prompt=agent_system_prompt, tools=tools)
    agent_description = f"This is an agent with the following description:\n{agent.description}"
    if len(tool_tables)> 0:
        agent_description += f"It has read access to the following postgres tables:\n{table_descriptions}"
    # TODO: Enhance agent descriptions with the custom tools available to it as well.
    langchain_agent.description = agent_description
    langchain_agent.name = agent.name
    return langchain_agent

def create_planner_executor(_agents: List[AgentPayload]):
    langchain_agents = [build_agent(_agent) for _agent in _agents]
    tool_descriptions = "\n".join(
        f"{i + 1}. {tool.name}(request: str)\nRequest is natural language\n{tool.description}"
        for i, tool in enumerate(
            langchain_agents
        )
    )
    
    num_tools = len(_agents)
    planner_prompt = (
        f"Given a user query, create a plan to solve it with the utmost parallelizability. "
        f"Each plan should comprise an action from the following {num_tools+1} types:\n"
        f"{tool_descriptions}\n"
        f"{num_tools+1}. join(): Aggregates and finalizes results from previous actions.\n"
        "\n"
        "Rules and Guidelines:\n"
        "1. Each action must be one of the types listed above — never invent new actions.\n"
        "2. Each action must have a unique, strictly increasing integer ID.\n"
        "3. Inputs for actions can either be constants or outputs from previous actions.\n"
        "   - To use the output of a prior action, refer to it using the format `$id`, e.g. `$1` for action 1.\n"
        "   - You can use `$id` directly inside a string argument to an action. If you need to include a literal dollar sign in that string argument `$`, escape it as `\\$`.\n"
        "4. Each action should strictly adhere to its input/output types and its description.\n"
        "5. join should always be the last action in the plan, and will be called in two scenarios:\n"
        "   (a) if the answer can be determined by gathering the outputs from tasks to generate the final response.\n"
        "   (b) if the answer cannot be determined in the planning phase before you execute the plans.\n"
        "7. Prefer executing independent actions in parallel whenever possible (i.e., if an action does not depend on the output of another, it can be executed concurrently).\n"
        "8. The plan must be acyclic — no action may depend on itself, directly or indirectly.\n"
        "\n"
        "Handling Impossible Requests:\n"
        "If the user's request CANNOT be fulfilled with the available actions (missing agents, impossible query, no relevant data access), output 'CANNOT_EXECUTE' followed by explanation of why it cannot be executed:\n"
        "- List available agents and their capabilities (based on descriptions above)\n"
        "- Clarify if the request is fundamentally impossible (e.g., requesting future data, non-existent information)\n"
        "- Provide concrete examples of what CAN be done with current setup\n"
        "\n"
        "Example CANNOT_EXECUTE response:\n"
        "CANNOT_EXECUTE\n"
        "I cannot execute this request because no agent has access to customer transaction data.\n\n"
        "\n"
        "Output Format (for executable requests):\n"
        "1. tool_name(arg=value)\n"
        "2. another_tool(arg=$1)\n"
        "3. join(inputs=[$1,$2])\n"
        "\n"
        "Example:\n"
        "1. search(query=\"nobel prize winners 2023\")\n"
        "2. summarize(text=\"Summarise the following text: \\n $1\")\n"
        "3. join(inputs=[$2])\n"
        "\n"
        "Notes:\n"
        " - The plan must only contain the allowed actions.\n"
        " - Maximize independence between actions to enable parallel execution.\n"
        " - Do not include any explanations or commentary — output **only** the formatted plan or CANNOT_EXECUTE response.\n"
    )


    planner_executor = create_agent(model, system_prompt=planner_prompt)
    
    return planner_executor