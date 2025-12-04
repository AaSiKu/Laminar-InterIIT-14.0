import re
import time
import logging
from typing import List, Dict, Any, Optional
import litellm
# from litellm import CustomGuardrail

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SecurityGuardrails:
    def __init__(self):
        self.request_history = []
        self.rate_limit_window = 60  # seconds
        self.rate_limit_max_requests = 5
        self.blocked_users = set()
        
        # PII Patterns
        self.pii_patterns = {
            'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            'phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
            'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'
        }
        
        # Prompt Injection Patterns (Basic)
        self.injection_keywords = [
            "ignore previous instructions",
            "system override",
            "delete all files",
            "drop table"
        ]

    def check_rate_limit(self, user_id: str) -> bool:
        current_time = time.time()
        # Filter requests for this user in the window
        user_requests = [t for u, t in self.request_history if u == user_id and current_time - t < self.rate_limit_window]
        
        if len(user_requests) >= self.rate_limit_max_requests:
            logger.warning(f"Rate limit exceeded for user {user_id}")
            return False
            
        self.request_history.append((user_id, current_time))
        # Cleanup old history
        self.request_history = [rt for rt in self.request_history if current_time - rt[1] < self.rate_limit_window]
        return True

    def detect_pii(self, text: str) -> Dict[str, List[str]]:
        found_pii = {}
        for pii_type, pattern in self.pii_patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                found_pii[pii_type] = matches
        return found_pii

    def redact_pii(self, text: str) -> str:
        for pii_type, pattern in self.pii_patterns.items():
            text = re.sub(pattern, f"[{pii_type.upper()}_REDACTED]", text)
        return text

    def detect_prompt_injection(self, text: str) -> bool:
        text_lower = text.lower()
        for keyword in self.injection_keywords:
            if keyword in text_lower:
                logger.warning(f"Prompt injection detected: {keyword}")
                return True
        return False

    def check_ssrf(self, url: str) -> bool:
        # Basic SSRF check - block internal IPs and localhost
        blocked_domains = ["localhost", "127.0.0.1", "0.0.0.0", "192.168.", "10."]
        for domain in blocked_domains:
            if domain in url:
                logger.warning(f"SSRF attempt detected: {url}")
                return True
        return False

    def check_bola(self, user_id: str, resource_owner_id: str) -> bool:
        # Principle: User can only access their own resources
        if user_id != resource_owner_id:
            logger.warning(f"BOLA attempt detected: User {user_id} tried to access {resource_owner_id}")
            return True
        return False

    def check_polp(self, user_role: str, tool_name: str) -> bool:
        # Principle of Least Privilege
        # Define allowed tools per role
        allowed_tools = {
            "user": ["echo", "read_public_file", "get_my_data", "read_file", "get_user_data"],
            "admin": ["echo", "read_public_file", "get_my_data", "delete_user", "system_command", "read_file", "get_user_data"]
        }
        
        if tool_name not in allowed_tools.get(user_role, []):
            logger.warning(f"POLP violation: Role {user_role} tried to use {tool_name}")
            return True
        return False

    def detect_loop(self, messages: List[Dict]) -> bool:
        # Check if the last user message is repeated multiple times
        if len(messages) < 3:
            return False
            
        last_msg = messages[-1].get('content', '')
        count = 0
        for msg in reversed(messages[:-1]):
            if msg.get('role') == 'user' and msg.get('content') == last_msg:
                count += 1
        
        if count >= 2: # 3 times total
            logger.warning("Loop detected in conversation")
            return True
        return False

# Integration with LiteLLM
guard = SecurityGuardrails()

def validate_input(data: dict):
    """
    LiteLLM Input Callback
    """
    messages = data.get("messages", [])
    user_id = data.get("metadata", {}).get("user_id", "anonymous")
    user_role = data.get("metadata", {}).get("user_role", "user")
    
    # 1. Rate Limiting
    if not guard.check_rate_limit(user_id):
        raise Exception("Rate limit exceeded")

    # 2. Loop Detection
    if guard.detect_loop(messages):
        raise Exception("Conversation loop detected")

    last_message = messages[-1]['content'] if messages else ""
    
    # 3. Prompt Injection
    if guard.detect_prompt_injection(last_message):
        raise Exception("Prompt injection detected")

    # 4. PII Detection & Redaction (in input)
    # We might want to block or redact. Let's redact for this example.
    redacted_msg = guard.redact_pii(last_message)
    if redacted_msg != last_message:
        logger.info("PII redacted from input")
        messages[-1]['content'] = redacted_msg
        
    return data

def validate_tool_call(tool_name: str, tool_args: dict, user_metadata: dict):
    """
    Custom validation for tool calls (SSRF, BOLA, POLP)
    """
    user_id = user_metadata.get("user_id", "anonymous")
    user_role = user_metadata.get("user_role", "user")

    # 1. POLP Check
    if guard.check_polp(user_role, tool_name):
        raise Exception(f"Access Denied: User role '{user_role}' cannot use tool '{tool_name}'")

    # 2. SSRF Check (for read_file)
    if tool_name == "read_file":
        path = tool_args.get("path", "")
        if guard.check_ssrf(path):
            raise Exception(f"Security Alert: SSRF/Path Traversal detected for path '{path}'")
        # Also check for absolute paths or sensitive files
        if path.startswith("/") or ".." in path:
             # Simple heuristic for this test
             if "/etc/" in path or "passwd" in path:
                 raise Exception(f"Security Alert: Access to sensitive file '{path}' blocked")

    # 3. BOLA Check (for get_user_data)
    if tool_name == "get_user_data":
        requested_user_id = tool_args.get("user_id")
        # In a real app, we'd check if user_id matches the authenticated user
        # Here we assume user_id in metadata is the authenticated user
        # And they can only access their own data
        if str(requested_user_id) != str(user_id):
             raise Exception(f"Security Alert: BOLA detected. User {user_id} cannot access data for {requested_user_id}")

    return True

def secure_completion(**kwargs):
    """
    Wrapper around litellm.completion with guardrails
    """
    metadata = kwargs.get("metadata", {})
    messages = kwargs.get("messages", [])
    
    # Input Validation
    # Construct a dummy data object for validate_input
    input_data = {"messages": messages, "metadata": metadata}
    validate_input(input_data)
    
    # We need to handle tool calls. 
    # If the model returns a tool call, we must validate it before execution.
    # Since we are wrapping completion, we can inspect the response.
    
    response = litellm.completion(**kwargs)
    
    # Output Validation (PII Redaction)
    if response.choices and response.choices[0].message.content:
        content = response.choices[0].message.content
        redacted = guard.redact_pii(content)
        response.choices[0].message.content = redacted
        
    # Tool Call Validation
    if response.choices and response.choices[0].message.tool_calls:
        for tool_call in response.choices[0].message.tool_calls:
            function_name = tool_call.function.name
            import json
            try:
                function_args = json.loads(tool_call.function.arguments)
            except:
                function_args = {}
            
            validate_tool_call(function_name, function_args, metadata)
            
    return response

