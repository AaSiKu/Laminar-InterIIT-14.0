import os
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv
from security_policy import get_encoded_policy
from colorama import Fore, Style, init

# Initialize colors
init(autoreset=True)
load_dotenv()

# Setup basic logging
logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger("SecureAgent")

# --- MOCK TOOLS ---
def fetch_url(url: str):
    return f"Fetched content from {url}"

def get_sensitive_resource(resource_id: str):
    return f"Content of secret resource: {resource_id}"

# --- CLIENT SETUP ---
def create_secure_client():
    api_key = os.getenv("GEMINI_API_KEY")
    inv_key = os.getenv("INVARIANT_API_KEY")
    dataset = os.getenv("INVARIANT_DATASET", "default")

    if not api_key or not inv_key:
        print(Fore.RED + "Error: API Keys missing in .env file")
        return None

    # print(Fore.CYAN + f"Connecting to Invariant Gateway (Dataset: {dataset})...")

    client = genai.Client(
        api_key=api_key,
        http_options={
            "base_url": f"https://explorer.invariantlabs.ai/api/v1/gateway/{dataset}/gemini",
            "headers": {
                "Invariant-Authorization": f"Bearer {inv_key}",
                # Pass the encoded policy
                "Invariant-Guardrails": get_encoded_policy()
            },
        },
    )
    return client

def run_agent(prompt: str):
    client = create_secure_client()
    if not client: return

    # Define tool config
    tools = [fetch_url, get_sensitive_resource]
    
    print(Fore.YELLOW + f"\nUser Prompt: {prompt}")
    print(Fore.YELLOW + "-" * 50)

    try:
        # We use a chat session
        chat = client.chats.create(model="gemini-2.0-flash", config=types.GenerateContentConfig(tools=tools))
        
        # Send message
        response = chat.send_message(prompt)
        
        # Check if the model wants to call a tool (Function Call)
        if response.function_calls:
            for fc in response.function_calls:
                print(Fore.BLUE + f"Attempting Tool Call: {fc.name} args={fc.args}")
            print(Fore.GREEN + "Result: Tool call allowed by Guardrails.")
        else:
            print(Fore.GREEN + f"Response: {response.text}")

    except Exception as e:
        # Invariant returns HTTP errors when a rule is violated
        error_msg = str(e)
        # 403 or 400 usually indicates a policy violation from Invariant
        if "403" in error_msg or "400" in error_msg:
            print(Fore.RED + "\n[BLOCKED] INVARIANT GUARDRAIL TRIGGERED!")
            print(Fore.RED + "The security policy prevented this action.")
            print(Fore.RED + f"Details: {error_msg}")
        else:
            print(Fore.RED + f"System Error: {error_msg}")

if __name__ == "__main__":
    run_agent("Hello, are you working?")