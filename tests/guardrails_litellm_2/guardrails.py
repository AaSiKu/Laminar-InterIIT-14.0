import re
import time
from typing import List, Dict, Any, Optional
import litellm

class SecurityError(Exception):
    """Base class for security violations."""
    pass

class SSRFError(SecurityError):
    pass

class BOLAError(SecurityError):
    pass

class PIIError(SecurityError):
    pass

class PromptInjectionError(SecurityError):
    pass

class RateLimitError(SecurityError):
    pass

class POLPError(SecurityError):
    pass

class LoopDetectionError(SecurityError):
    pass

class GuardrailManager:
    def __init__(self):
        self.request_history = []
        self.call_counts = {}
        self.blocked_ips = ["127.0.0.1", "localhost", "169.254.169.254"]
        self.pii_patterns = {
            "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"
        }
        self.injection_keywords = ["ignore previous instructions", "system override", "pwned"]
        self.user_permissions = {
            "user1": ["add", "echo", "get_user_data"],
            "admin": ["add", "echo", "fetch_url", "read_file", "get_user_data", "loop_tool"]
        }

    def check_ssrf(self, url: str):
        """Check for SSRF attempts."""
        for blocked in self.blocked_ips:
            if blocked in url:
                raise SSRFError(f"SSRF detected: Access to {url} is blocked.")

    def check_bola(self, current_user: str, requested_resource_id: str):
        """Check for BOLA."""
        # Simplified: user can only access their own data (resource_id == user_id)
        # Unless they are admin
        if current_user == "admin":
            return
        if current_user != requested_resource_id:
            raise BOLAError(f"BOLA detected: User {current_user} cannot access {requested_resource_id}")

    def redact_pii(self, text: str) -> str:
        """Redact PII from text."""
        for pii_type, pattern in self.pii_patterns.items():
            text = re.sub(pattern, f"[REDACTED {pii_type.upper()}]", text)
        return text

    def check_prompt_injection(self, text: str):
        """Check for prompt injection."""
        text_lower = text.lower()
        for keyword in self.injection_keywords:
            if keyword in text_lower:
                raise PromptInjectionError(f"Prompt Injection detected: Found keyword '{keyword}'")

    def check_rate_limit(self, user_id: str, limit: int = 5, window: int = 60):
        """Check rate limiting."""
        current_time = time.time()
        if user_id not in self.call_counts:
            self.call_counts[user_id] = []
        
        # Filter old calls
        self.call_counts[user_id] = [t for t in self.call_counts[user_id] if current_time - t < window]
        
        if len(self.call_counts[user_id]) >= limit:
            raise RateLimitError(f"Rate limit exceeded for user {user_id}")
        
        self.call_counts[user_id].append(current_time)

    def check_polp(self, user_id: str, tool_name: str):
        """Check Principle of Least Privilege."""
        allowed_tools = self.user_permissions.get(user_id, [])
        if tool_name not in allowed_tools:
            raise POLPError(f"POLP Violation: User {user_id} is not allowed to use {tool_name}")

    def check_loop(self, tool_name: str, args: Dict, threshold: int = 3):
        """Check for loops in tool calls."""
        # Simple check: same tool and args called consecutively
        count = 0
        for entry in reversed(self.request_history):
            if entry["tool"] == tool_name and entry["args"] == args:
                count += 1
            else:
                break
        if count >= threshold:
            raise LoopDetectionError(f"Loop detected: {tool_name} called {count} times with same args")
        
        self.request_history.append({"tool": tool_name, "args": args})

    def pre_call_hook(self, user_id: str, prompt: str):
        """Hook to run before LLM call."""
        self.check_rate_limit(user_id)
        self.check_prompt_injection(prompt)
        # Return redacted prompt if needed, but usually we just check
        return prompt

    def tool_call_hook(self, user_id: str, tool_name: str, tool_args: Dict):
        """Hook to run before executing a tool."""
        self.check_polp(user_id, tool_name)
        self.check_loop(tool_name, tool_args)
        
        if tool_name == "fetch_url":
            self.check_ssrf(tool_args.get("url", ""))
        
        if tool_name == "get_user_data":
            self.check_bola(user_id, tool_args.get("user_id", ""))

    def post_call_hook(self, response_text: str) -> str:
        """Hook to run after LLM call (on response)."""
        return self.redact_pii(response_text)
