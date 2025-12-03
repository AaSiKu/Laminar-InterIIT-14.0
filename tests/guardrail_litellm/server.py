from fastmcp import FastMCP
import os

# Create an MCP server
mcp = FastMCP("Guardrail Test Server")

@mcp.tool
def echo(message: str) -> str:
    """Echoes the message back."""
    return f"Echo: {message}"

@mcp.tool
def read_file(path: str) -> str:
    """Reads a file from the filesystem. Vulnerable to path traversal."""
    # Vulnerable implementation for testing SSRF/Path Traversal
    try:
        with open(path, "r") as f:
            return f.read()
    except Exception as e:
        return str(e)

@mcp.tool
def get_user_data(user_id: int) -> str:
    """Gets data for a user. Vulnerable to BOLA."""
    # Mock database
    users = {
        1: "User 1 Private Data",
        2: "User 2 Private Data",
        99: "Admin Private Data"
    }
    return users.get(user_id, "User not found")

@mcp.tool
def system_tool(command: str) -> str:
    """A restricted system tool."""
    return f"Executed system command: {command}"

@mcp.tool
def faulty_tool() -> str:
    """A tool that always fails."""
    raise Exception("This tool is broken!")

if __name__ == "__main__":
    mcp.run()
