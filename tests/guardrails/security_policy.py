"""
This file defines the Invariant Guardrails Policy.
"""

# We use r"" (raw string) to prevent Python from misinterpreting regex backslashes
POLICY_DEFINITION = r"""
# Import built-in detectors
from invariant.detectors import pii, secrets
from invariant import count

# ==========================================
# 1. PII & DATA LEAKAGE PROTECTION
# ==========================================
raise "Security Alert: PII Leakage Detected" if:
    (msg: Message)
    msg.role == "assistant"
    any(pii(msg.content))

# ==========================================
# 2. SSRF (Server-Side Request Forgery) PROTECTION
# ==========================================
raise "Security Alert: SSRF - Domain not whitelisted" if:
    (call: ToolCall)
    call is tool:fetch_url
    # Regex check: Must start with https and be invariantlabs.ai or google.com
    not call.arguments["url"] matches "^https:\/\/(www\.)?(invariantlabs\.ai|google\.com)"

# ==========================================
# 3. RATE LIMITING / LOOP DETECTION
# ==========================================
raise "Rate Limit Exceeded: Loop detected" if:
    (call: ToolCall)
    count(min=3):
        call -> (prev: ToolCall)
        prev.function.name == call.function.name

# ==========================================
# 4. BOLA (Broken Object Level Authorization)
# ==========================================
raise "Access Control Violation: BOLA Detected" if:
    (call: ToolCall)
    call is tool:get_sensitive_resource
    # We enforce that the resource_id MUST start with 'user_123'
    not call.arguments["resource_id"] matches "^user_123_.*"

# ==========================================
# 5. PROMPT INJECTION
# ==========================================
raise "Prompt Injection Detected" if:
    (msg: Message)
    msg.role == "user"
    msg.content matches "(?i)(ignore previous instructions|delete system prompt)"
"""

def get_encoded_policy():
    """
    CRITICAL FIX: HTTP headers cannot contain newlines.
    We must escape them (turn \n into literal \\n characters)
    """
    return POLICY_DEFINITION.encode("unicode_escape").decode("utf-8")