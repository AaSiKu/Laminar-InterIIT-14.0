import os
import json
import litellm
from guardrails import secure_completion
# Import tools directly from server.py to simulate local execution
# In a real FastMCP setup, we would use an MCP client to call the server
from server import echo, read_file, get_user_data, system_tool
from dotenv import load_dotenv

load_dotenv()

# Map tool names to functions
available_tools = {
    "echo": echo,
    "read_file": read_file,
    "get_user_data": get_user_data,
    "system_tool": system_tool
}

tools_schema = [
    {
        "type": "function",
        "function": {
            "name": "echo",
            "description": "Echo a message",
            "parameters": {"type": "object", "properties": {"message": {"type": "string"}}, "required": ["message"]}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a file",
            "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_data",
            "description": "Get user data",
            "parameters": {"type": "object", "properties": {"user_id": {"type": "integer"}}, "required": ["user_id"]}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_tool",
            "description": "Run system command",
            "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]}
        }
    }
]

def run_chat_loop():
    messages = []
    user_id = "1"
    user_role = "user"
    
    print(f"Starting chat as User {user_id} ({user_role}). Type 'exit' to quit.")
    print("Try commands like: 'Read /etc/passwd', 'Get user 2 data', 'Run rm -rf /', 'What is your email?'")
    
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() == "exit":
                break
        except EOFError:
            break
            
        messages.append({"role": "user", "content": user_input})
        
        try:
            # 1. Call Model with Guardrails
            # Note: This requires GEMINI_API_KEY to be set in .env
            response = secure_completion(
                model="gemini/gemini-pro",
                messages=messages,
                tools=tools_schema,
                metadata={"user_id": user_id, "user_role": user_role}
            )
            
            msg = response.choices[0].message
            # Append assistant message to history
            # Note: msg might be a tool call, which doesn't always have content
            messages.append(msg.model_dump())
            
            # 2. Handle Tool Calls
            if msg.tool_calls:
                print(f"Model requested tool calls: {len(msg.tool_calls)}")
                for tool_call in msg.tool_calls:
                    func_name = tool_call.function.name
                    try:
                        args = json.loads(tool_call.function.arguments)
                    except:
                        args = {}
                    
                    print(f"  - Call: {func_name}({args})")
                    
                    if func_name in available_tools:
                        try:
                            # Execute Tool
                            result = available_tools[func_name](**args)
                            print(f"  - Result: {result}")
                            
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "name": func_name,
                                "content": str(result)
                            })
                        except Exception as e:
                            print(f"  - Tool Execution Error: {e}")
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "name": func_name,
                                "content": f"Error: {str(e)}"
                            })
                    else:
                        print(f"  - Tool {func_name} not found")
            else:
                print(f"Gemini: {msg.content}")
                
        except Exception as e:
            print(f"Security/Error: {e}")

if __name__ == "__main__":
    run_chat_loop()
