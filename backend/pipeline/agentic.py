from typing import List, Dict, Literal, Type
from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.graph.state import CompiledStateGraph
from langchain_community.utilities.sql_database import SQLDatabase
from langchain_community.tools import QuerySQLDataBaseTool
from lib.agent import Agent
from lib.node import Node
from .postgre import  construct_table_name, postgre_read_engine
import pathway as pw
import json
import os

model = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.0,
    max_retries=2,
    api_key=os.environ["GROQ_API_KEY"]
)

class AgentOutputSchema(pw.Schema):
    prompt: str
    answer: str
    caller: str


# TODO: Implement observability to LangSmith because pathway does not show prints inside async transformers
def build_agentic_graph(agents: List[Agent], pipeline_name: str, nodes: List[Node], node_outputs: List[pw.Table]) -> Dict[Literal["prompt", "trigger"], pw.AsyncTransformer]:
    agent_descriptions = '\n'.join([f"Agent with name {agent.name} described as: {agent.description}" for agent in agents])
    SUPERVISOR_PROMPT = (
        f"You are a supervisor agent that manages the {pipeline_name} pipeline"
        "You have the following list of agents you can call as tools"
        f"{agent_descriptions}"
        "Break down user requests into appropriate agent calls and coordinate the agents, compile the answers and return what the user wants "
    )
    
    agents_as_tool = []
    for agent in agents:
        # TODO: Create our pre defined custom tools array based on what the user has defined the agent's tools as
            # The custom tools feature should also include a human in the loop implementation
            # Implement mappings from tool ids to the actual tool function for custom tools
        # TODO: Make sure the agentic LLM model does not hallucinate SQL calls
        # TODO: Make sure that the agent if connected to any RAG node(s) call them appropriately with structured output

        tool_tables = {}
        try:
            tool_tables = {
                construct_table_name(nodes[tool], tool) : {
                    "schema": node_outputs[tool].schema.columns_to_json_serializable_dict(),
                    "description": nodes[tool].tool_description
                }
                for tool in agent.tools if type(tool) == int
            }
        except:
            raise Exception("Every tool should have a description")
        tools = []
        if len(tool_tables.keys()) > 0:
            db_agent = SQLDatabase(postgre_read_engine, include_tables=tool_tables.keys())
            
            db_description = (
                "The following is the list of tables you can access through this tool (in the format TABLE_NAME\n TABLE_SCHEMA:\n"
                f"{'\n'.join([
                    f"{i+1}. {table_name}\n{json.dumps(schema)}"
                    for i,(table_name, schema) in enumerate(tool_tables.items())
                ])}\n"
                "Input to this tool is a detailed and correct SQL query, output is a result from the database.\n"
                "Only use this tool for read requests and when you absolutely need some data from the table."
                "If the query is not correct, an error message will be returned.\n"
                "If an error is returned, rewrite the query, check the query, and try again.\n"
            )
            tools.append(QuerySQLDataBaseTool(description=db_description, db=db_agent))

        langchain_agent = create_agent(model=model,system_prompt=agent.master_prompt, tools=tools)


        @tool(description=agent.description)
        def agent_as_tool(request: str) -> str:
            result = langchain_agent.invoke({
                "messages": [{"role": "user", "content": request}]
            })
            return result["messages"][-1].content
        agents_as_tool.append(agent_as_tool)

    supervisor_agent = create_agent(
        model,
        tools=agents_as_tool,
        system_prompt=SUPERVISOR_PROMPT,
    )

    class SupervisorPromptTransformer(pw.AsyncTransformer, output_schema=AgentOutputSchema):
        def __init__(self, *args, **kwargs):
            super().__init__(*args,**kwargs)
        
        # TODO: Implement token by token inference streaming for role="user" which will be sent to the frontend for good UX 
        async def infer(self,role: str,content: str):
            answer = await supervisor_agent.ainvoke({
                "messages": [
                    {
                        "role": role,
                        "content": content
                    }
                ]
            })
            answer = answer["messages"][-1].content
            return answer
        async def invoke(self, prompt: str) -> dict:
            return {
                "caller": "user",
                "prompt": prompt,
                "answer": await self.infer("user",prompt)
            }
    
    class SupervisorTriggerTransformer(SupervisorPromptTransformer, output_schema=AgentOutputSchema):
        def __init__(self, trigger_name : str, trigger_description: str, trigger_schema: Type[pw.Schema], *args, **kwargs):
            self.trigger_name = trigger_name
            self.trigger_description = trigger_description
            self.trigger_schema = trigger_schema
            super().__init__(*args,**kwargs)

        async def invoke(self,**kwargs):
            
            prompt = (
                "This is a trigger from a table with\n"
                f"Schema: {json.dumps(self.trigger_schema.columns_to_json_serializable_dict(), indent=4)}\n"
                f"and description: {self.trigger_description}.\n"
                f"The new row content is {json.dumps(kwargs,indent=4)}.\n"
                "This row is a new addition to the table"
            )

            answer = await self.infer("system",prompt)
            return {
                "caller": self.trigger_name,
                "prompt": prompt,
                "answer": answer,
            }
    return dict(
        prompt=SupervisorPromptTransformer,
        trigger= SupervisorTriggerTransformer
    )