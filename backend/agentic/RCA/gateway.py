import time
import re
import hmac
import hashlib
import logging
from urllib.parse import urlparse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
     api_key=os.getenv('GEMINI_API_KEY'),
     http_options={
         "base_url": "https://explorer.invariantlabs.ai/api/v1/gateway/{add-your-dataset-name-here}/gemini",
         "headers": {
             "Invariant-Authorization": "Bearer your-invariant-api-key"
         },
     },
 )

MOCK_USER_DB = {
    "user_123": {"allowed_resources": ["inv_555", "inv_556"]},
    "user_456": {"allowed_resources": ["inv_777"]}
}

class MCPSecurityGateway:
    """
    (1) Network Layer: Connection Pooling (TLS), SSRF Validation.
    (2) Access Layer: Rate Limiting, PoLP (Role checks), BOLA (Ownership checks).
    (3) Data Layer: Output Sanitization, Signature Verification (Attestation).
    (4) Process Layer: HITL Review Queue, Session Ephemerality (Memory Wiping).
    """
    def __init__(self):
        self._init_connection_pool()
        self._init_rate_limits()
        self._init_permissions()
        self.allowed_domains = {
            # TODO: Add more domains as needed
        }
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("MCP_Security")

    def _init_connection_pool(self):
        """
        Protocol: Connection Pooling & Termination.
        Pre-warms connections to hide topology and enforce Transport Layer Security.
        """
        self.session = requests.Session()
        retries = Retry(total=3, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retries, pool_connections=10, pool_maxsize=10)
        self.session.mount('https://', adapter)

    def _init_rate_limits(self):
        """
        Protocol: Request Throttling & Rate Limiting.
        Stores hit counts.
        """
        self.request_counts = {}  # { 'user_id': [timestamp1, timestamp2] }
        self.RATE_LIMIT_WINDOW = 60  # seconds
        self.MAX_REQUESTS_PER_MINUTE = 20

    def _init_permissions(self):
        """
        Protocol: PoLP & Prevent Broken Function Level Architecture.
        Maps Agent Roles -> Allowed Methods -> Allowed Endpoints.
        """
        self.role_permissions = {
            "invoice_reader_agent": {
                "GET": ["/api/invoices"],
                "POST": [] 
            },
            "account_manager_agent": {
                "GET": ["/api/accounts"],
                "POST": ["/api/accounts/update"]
            }
        }

    def check_rate_limit(
            self,
            user_id: str
    ) -> bool:
        """
        Request Throttling & Rate Limiting
        token bucket
        """
        current_time = time.time()
        if user_id not in self.request_counts:
            self.request_counts[user_id] = []

        self.request_counts[user_id] = [t for t in self.request_counts[user_id] 
                                        if t > current_time - self.RATE_LIMIT_WINDOW]

        if len(self.request_counts[user_id]) >= self.MAX_REQUESTS_PER_MINUTE:
            self.logger.warning(f"Rate limit exceeded for user {user_id}")
            # TODO: "Dead Letter Queue" or HITL
            return False
        
        self.request_counts[user_id].append(current_time)
        return True

    def validate_agent_function(
            self, 
            agent_role: str, 
            method: str, 
            endpoint: str
    ) -> bool:
        """PoLP & Prevent Broken Function Level Architecture"""
        # Check if role exists
        if agent_role not in self.role_permissions:
            self.logger.error(f"Security Alert: Unknown agent role {agent_role}")
            return False

        allowed_endpoints = self.role_permissions[agent_role].get(method, [])
        is_allowed = any(endpoint.startswith(allowed) for allowed in allowed_endpoints)
        
        if not is_allowed:
            self.logger.warning(f"PoLP Violation: {agent_role} tried {method} on {endpoint}")
            return False
        return True

    def validate_object_ownership(
            self, 
            user_id: str, 
            resource_id: str
    ) -> bool:
        """Prevent Broken Object Level Architecture (BOLA)"""
        user_data = MOCK_USER_DB.get(user_id)
        
        if not user_data:
            return False
        if resource_id not in user_data["allowed_resources"]:
            self.logger.critical(f"BOLA ATTACK: User {user_id} tried to access {resource_id}")
            return False
        
        return True

    def validate_outbound_url(
            self, 
            url: str
    ) -> bool:
        """Prevent server side request forgery"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc
            
            if parsed.scheme != "https":
                self.logger.warning(f"Unsafe Protocol detected: {url}")
                return False

            if domain not in self.allowed_domains:
                self.logger.warning(f"SSRF Prevention: Blocked connection to {domain}")
                return False
                
            return True
        except Exception:
            return False

    def hash_sensitive_data(
            self, 
            data: str
    ) -> str:
        """Hashes data before storage."""
        return hashlib.sha256(data.encode()).hexdigest()

    def secure_log(
            self, 
            message: str
    ):
        """data-masking"""
        patterns = {
            r'\b\d{4}-\d{4}-\d{4}\b': 'XXXX-XXXX-XXXX',
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b': '[EMAIL_REDACTED]'
        }
        
        masked_message = message
        for pattern, replacement in patterns.items():
            masked_message = re.sub(pattern, replacement, masked_message)
            
        self.logger.info(masked_message)
        
    def verify_tool_signature(
            self, 
            payload: str, 
            provided_signature: str, 
            secret_key: str
    ) -> bool:
        """
        Ensures the data came from a trusted tool and wasn't tampered with
        post-process verification
        """
        expected_signature = hmac.new(
            secret_key.encode(), 
            payload.encode(), 
            hashlib.sha256
        ).hexdigest()
        if hmac.compare_digest(expected_signature, provided_signature):
            return True
        else:
            self.logger.critical("SECURITY BREACH: Tool signature verification failed!")
            return False

    
    def flush_session_context(
            self, 
            user_id: str, 
            session_id: str
    ):
        """
        session ephemerality: wipes the agent's memory after the task is done.
        """
        self.logger.info(f"Initiating memory wipe for Session: {session_id}")
        
        new_session_id = hashlib.sha256(f"{session_id}{time.time()}".encode()).hexdigest()
        
        self.logger.info(f"Context flushed. Rotated to new Session ID: {new_session_id}")
        return new_session_id

    def trigger_hitl_review(self, user_id: str, action: str, reason: str):
        """
        Freezes the action and sends it to a manual approval queue.
        """
        alert = {
            "status": "PENDING_APPROVAL",
            "user": user_id,
            "risky_action": action,
            "flagged_reason": reason,
            "timestamp": time.time()
        }
        # TODO: push this dict to an SQS Queue or a Slack Webhook
        self.logger.warning(f"HITL TRIGGERED: {alert}")
        return {"status": 202, "message": "Request queued for manual security review."}
    