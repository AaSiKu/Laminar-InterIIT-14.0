import asyncio
import logging
from typing import Optional, Any, Dict, List, Union
from mcp import ClientSession
from mcp.client.sse import sse_client
from langchain_mcp_adapters.tools import load_mcp_tools
from langchain.agents import create_agent
from langchain.tools import BaseTool
from dotenv import load_dotenv

logger = logging.getLogger(__name__)



async def get_agent(
    llm: Any,
    prompt: str,
    tools: Optional[List[BaseTool]] = None,
    mcp_endpoint: Optional[str] = None,
    mcp_headers: Optional[Dict[str, str]] = None,
    combine_tools: bool = True
):
    
    final_tools = []
    
    try:
        if tools:
            logger.info(f"Adding {len(tools)} regular tools")
            final_tools.extend(tools)
            logger.info(f"Regular tools: {[tool.name for tool in tools]}")
        
        if mcp_endpoint:
            logger.info(f"Connecting to MCP server at {mcp_endpoint}")
            
            # Create the SSE connection
            sse_context = sse_client(mcp_endpoint, headers=mcp_headers)
            read, write = await sse_context.__aenter__()
            
            # Create the client session
            client_session = ClientSession(read, write)
            session = await client_session.__aenter__()
            await session.initialize()
            logger.info("MCP session initialized")
            
            mcp_tools = await load_mcp_tools(session)
            logger.info(f"Loaded {len(mcp_tools)} MCP tools")
            logger.info(f"MCP tools: {[tool.name for tool in mcp_tools]}")
            
            if combine_tools or not tools:
                final_tools.extend(mcp_tools)
            else:
                final_tools = mcp_tools
            
            # Store contexts for cleanup
            session_context = {
                'sse_context': sse_context,
                'client_session': client_session,
                'session': session
            }
        else:
            session_context = None
        
        if not final_tools:
            logger.warning("No tools or MCP endpoint provided. Agent will have no tools.")
        
        logger.info(f"Creating agent with {len(final_tools)} total tools")
        graph = create_agent(
            model=llm,
            tools=final_tools,
            system_prompt=prompt,
        )
        
        return graph, session_context
        
    except Exception as e:
        logger.error(f"Failed to create agent: {e}")
        raise


async def cleanup_session(session_context):
    if session_context:
        try:
            logger.info("Closing MCP connections")
            await session_context['client_session'].__aexit__(None, None, None)
            await session_context['sse_context'].__aexit__(None, None, None)
            logger.info("MCP connections closed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


async def main():
    from langchain_groq import ChatGroq
    import os
    from langchain_core.tools import tool
    
    @tool
    def summ(a: int, b: int) -> int:
        """Takes two integers as input and provides the sum of the inputs given."""
        return a *b
    
    load_dotenv()
    model = ChatGroq(model="llama-3.1-8b-instant", api_key=api)
    
    agent, session_context = await get_agent(
        llm=model,
        prompt="You are a helpful assistant. When asked about your capabilities, simply describe the tools you have access to without calling any functions.",
        tools=[summ],
        mcp_endpoint="https://demo-day.mcp.cloudflare.com/sse"
    )
    
    print("Agent created successfully!")
    
    try:
        result = await agent.ainvoke({"messages": [{"role": "user", "content": "what is 5 + 3?"}]})
        print(result)
        
        result2 = await agent.ainvoke({"messages": [{"role": "user", "content": "what tools do you have"}]})
        print(result2)
    finally:
        await cleanup_session(session_context)


if __name__ == "__main__":
    asyncio.run(main())