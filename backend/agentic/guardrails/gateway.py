import time
import re
import hmac
import hashlib
import logging
from urllib.parse import urlparse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import os, sys
import asyncio
from dotenv import load_dotenv
from google import genai
from pydantic import Field
from pydantic.dataclasses import dataclass
from openai import AsyncClient
from re import Pattern
import unicodedata
from typing import Generic, TypeVar, Callable, Awaitable, List, Generic, Optional, Any

load_dotenv()

T = TypeVar("T")
R = TypeVar("R")

# client = genai.Client(
#      api_key=os.getenv('GEMINI_API_KEY'),
#      http_options={
#          "base_url": "https://explorer.invariantlabs.ai/api/v1/gateway/{add-your-dataset-name-here}/gemini",
#          "headers": {
#              "Invariant-Authorization": "Bearer your-invariant-api-key"
#          },
#      },
#  )

MOCK_USER_DB = {
    "user_123": {"allowed_resources": ["inv_555", "inv_556"]},
    "user_456": {"allowed_resources": ["inv_777"]}
}




client: AsyncClient | None = None
def get_openai_client() -> AsyncClient:
    """Get an OpenAI client for making requests."""
    global client
    if client is None:
        client = AsyncClient()
    return client


@dataclass
class DetectorResult:
    entity: str = Field(..., description="The type of entity that was detected.")
    start: int = Field(..., description="The start index of the detected entity.")
    end: int = Field(..., description="The end index of the detected entity.")


class BaseDetector:
    """Base class for detectors."""

    def get_entities(self, results: list[DetectorResult]) -> list[str]:
        """Returns a list of entities from a list of DetectorResult objects.

        Args:
            results: A list of DetectorResult objects.
        Returns:
            A list of entities.
        """
        return [result.entity for result in results]

    def detect_all(self, text: str, *args, **kwargs) -> list[DetectorResult]:
        """Performs detection on the given text and returns a list of DetectorResult objects.

        Args:
            text: The text to analyze.
        Returns:
            A list of DetectorResult objects.
        """
        raise NotImplementedError("")

    def detect(self, text: str, *args, **kwargs) -> bool:
        """Performs detection on the given text and returns a boolean indicating whether there has been any detection.

        Args:
            text: The text to analyze.
        Returns:
            A boolean indicating whether there has been any detection.
        """
        return len(self.detect_all(text, *args, **kwargs)) > 0

    async def preload(self):
        """
        Some workload to run to initialize the detector for lower-latency inference later on.

        For instance, model loading or other expensive operations.
        """
        pass


class ExtrasImport:
    
    def __init__(self, import_name, package_name, version_constraint):
        """Creates a new ExtrasImport object.

        Args:
            import_name (str): The name or specifier of the module to import (e.g. 'lib' or 'lib.submodule')
            package_name (str): The name of the pypi package that contains the module.
            version_constraint (str): The version constraint for the package (e.g. '>=1.0.0')
        """
        self.name = import_name
        self.package_name = package_name
        self.version_constraint = version_constraint

        # collection of sites where this dependency is used
        # (only available if find_all is used)
        self.sites = []

    def import_names(self, *specifiers):
        
        module = self.import_module()
        elements = [getattr(module, specifier) for specifier in specifiers]
        if len(elements) == 1:
            return elements[0]
        return elements

    def import_module(self):
        module = __import__(self.name, fromlist=[self.name])
        return module

    def __str__(self):
        if len(self.sites) > 0:
            sites_str = f", sites={self.sites}"
        else:
            sites_str = ""
        return f"ExtrasImport('{self.name}', '{self.package_name}', '{self.version_constraint}'{sites_str})"

    def __repr__(self):
        return str(self)



TERMINATE_ON_EXTRA_FAILURE = True

class Extra:
    """
    An Extra is a group of optional dependencies that can be installed on demand.

    The extra is defined by a name, a description, and a collection of packages.

    For a list of available extras, see `Extra.find_all()` and below.
    """

    def __init__(self, name, description, packages):
        self.name = name
        self.description = description
        self.packages = packages
        self._is_available = None

        Extra.extras[name] = self

    def is_available(self) -> bool:
        """Returns whether the extra is available (all assigned imports can be resolved)."""
        if self._is_available is not None:
            return self._is_available

        for package in self.packages.values():
            try:
                __import__(package.name)
            except ImportError:
                self._is_available = False
                return False

        self._is_available = True
        return True

    def package(self, name) -> ExtrasImport:
        """Returns the package with the given name."""
        if not self.is_available():
            self.install()

        return self.packages[name]

    def install(self):
        """Installs all required packages for this extra (using pip if available)."""
        # like for imports, but all in one go
        msg = "warning: you are trying to use a feature that relies on the extra dependency '{}', which requires the following packages to be installed:\n".format(
            self.name
        )
        for imp in self.packages.values():
            msg += "   - " + imp.package_name + imp.version_constraint + "\n"

        sys.stderr.write(msg + "\n")

        # check if terminal input is possible
        if sys.stdin.isatty():
            sys.stderr.write("Press (y/enter) to install the packages or Ctrl+C to exit: ")
            answer = input()
            if answer == "y" or len(answer) == 0:
                import subprocess

                # check if 'pip' is installed
                result = subprocess.run(
                    [sys.executable, "-m", "pip", "--version"], capture_output=True
                )
                if result.returncode != 0:
                    sys.stderr.write(
                        "error: 'pip' is not installed. Please install the above mentioned packages manually.\n"
                    )
                    if TERMINATE_ON_EXTRA_FAILURE:
                        sys.exit(1)
                    else:
                        raise RuntimeError(
                            "policy execution failed due to missing dependencies in the runtime environment"
                        )
                for imp in self.packages.values():
                    subprocess.call(
                        [
                            sys.executable,
                            "-m",
                            "pip",
                            "install",
                            f"{imp.package_name}{imp.version_constraint}",
                        ]
                    )
            else:
                if TERMINATE_ON_EXTRA_FAILURE:
                    sys.exit(1)
                else:
                    raise RuntimeError(
                        "policy execution failed due to missing dependencies in the runtime environment"
                    )
        else:
            if TERMINATE_ON_EXTRA_FAILURE:
                sys.exit(1)
            else:
                raise RuntimeError(
                    "policy execution failed due to missing dependencies in the runtime environment"
                )

    @staticmethod
    def find_all() -> list["Extra"]:
        return list(Extra.extras.values())


Extra.extras = {}


PRESIDIO_EXTRA = Extra(
    "PII and Secrets Scanning (using Presidio)",
    "Enables the detection of personally identifiable information (PII) and secret scanning in text",
    {
        "presidio_analyzer": ExtrasImport("presidio_analyzer", "presidio-analyzer", ">=2.2.354"),
        "spacy": ExtrasImport("spacy", "spacy", ">=3.7.5"),
    },
)

transformers_extra = Extra(
    "Transformers",
    "Enables the use of `transformer`-based models and classifiers in the analyzer",
    {
        "transformers": ExtrasImport("transformers", "transformers", ">=4.41.1"),
        "torch": ExtrasImport("torch", "torch", ">=2.3.0"),
    },
)

class PII_Analyzer(BaseDetector):
    def __init__(self, threshold=0.5):
        AnalyzerEngine = PRESIDIO_EXTRA.package("presidio_analyzer").import_names("AnalyzerEngine")
        self.analyzer = AnalyzerEngine()
        self.threshold = threshold

    def detect_all(self, text: str, entities: list[str] | None = None):
        results = self.analyzer.analyze(text, language="en", entities=entities)
        res_matches = set()
        for res in results:
            if res.score > self.threshold:
                res_matches.add(res)
        return list(res_matches)

    async def adetect(self, text: str, entities: list[str] | None = None):
        return self.detect_all(text, entities)
    
class BatchAccumulator(Generic[T, R]):
    """
    A simple asyncio batch accumulator that collects items and processes them in batches.

    This is useful for batching API calls, database operations, or other operations
    where processing items in bulk is more efficient than processing them individually.
    """

    def __init__(
        self,
        batch_processor: Callable[[List[T]], Awaitable[List[R]]],
        max_batch_size: int = 100,
        max_wait_time: float = 1.0,
    ):
        """
        Initialize a new batch accumulator.

        Args:
            batch_processor: Async function that processes a batch of items
            max_batch_size: Maximum number of items to collect before processing
            max_wait_time: Maximum time to wait before processing a partial batch (in seconds)
        """
        self.batch_processor = batch_processor
        self.max_batch_size = max_batch_size
        self.max_wait_time = max_wait_time

        self._queue: List[asyncio.Future[R]] = []
        self._items: List[T] = []
        self._batch_task: Optional[asyncio.Task] = None
        self._timer_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self._running = False

    async def start(self) -> None:
        """Start the batch accumulator."""
        if self._running:
            return

        self._running = True
        self._timer_task = asyncio.create_task(self._timer_loop())

    async def stop(self) -> None:
        """Stop the batch accumulator and process any remaining items."""
        if not self._running:
            return

        self._running = False

        if self._timer_task:
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                pass

        # Process any remaining items
        if self._items:
            await self._process_batch()

    async def add(self, item: T) -> R:
        """
        Add an item to the batch and return a future that will resolve when the item is processed.

        Args:
            item: The item to add to the batch

        Returns:
            A Future that resolves to the result of processing the item
        """
        if not self._running:
            raise RuntimeError("BatchAccumulator is not running. Call start() first.")

        future: asyncio.Future[R] = asyncio.Future()

        async with self._lock:
            self._items.append(item)
            self._queue.append(future)

            if len(self._items) >= self.max_batch_size:
                # We've hit the max batch size, process immediately
                await self._process_batch()

        return await future

    async def _timer_loop(self) -> None:
        """Background task that processes batches after max_wait_time has elapsed."""
        try:
            while self._running:
                await asyncio.sleep(self.max_wait_time)
                async with self._lock:
                    if self._items:
                        await self._process_batch()
        except asyncio.CancelledError:
            # if this gets cancelled, we are shutting down this instance
            # new start() call will re-initialize the instance
            self._running = False
        except Exception:
            import traceback

            traceback.print_exc()

    async def _process_batch(self) -> None:
        """Process the current batch of items."""
        if not self._items:
            return

        items = self._items.copy()
        futures = self._queue.copy()
        self._items = []
        self._queue = []

        try:
            results = await self.batch_processor(items)

            # Resolve futures with results
            if len(results) != len(futures):
                error = ValueError(
                    f"Batch processor returned {len(results)} results for {len(futures)} items"
                )
                for future in futures:
                    if not future.done():
                        future.set_exception(error)
            else:
                for future, result in zip(futures, results):
                    if not future.done():
                        future.set_result(result)
        except Exception as e:
            # If batch processing fails, propagate the error to all futures
            for future in futures:
                if not future.done():
                    future.set_exception(e)
    
class BatchedDetector(BaseDetector):
    """
    A batched detector that uses a BatchAccumulator to process items in batches.

    To subclass, implement the `adetect_batch` method.
    """

    def __init__(self, max_batch_size: int = 1, max_wait_time: float = 0.1):
        # separate accumulators for any serialized args-kwargs combination
        self.accumulators = {}
        self.max_batch_size = max_batch_size
        self.max_wait_time = max_wait_time

    def get_accumulator(self, args, kwargs):
        key = (args, tuple(kwargs.items()))
        if key not in self.accumulators:

            async def batch_processor(texts):
                return await self.adetect_all_batch(texts, *args, **kwargs)

            self.accumulators[key] = BatchAccumulator(
                batch_processor=batch_processor,
                max_batch_size=self.max_batch_size,
                max_wait_time=self.max_wait_time,
            )
        return self.accumulators[key]

    async def adetect_all_batch(self, texts, *args, **kwargs):
        raise NotImplementedError("Subclasses must implement the adetect_all_batch method")

    async def adetect(self, text, *args, **kwargs):
        result = await self.adetect_all(text, *args, **kwargs)
        return len(result) > 0

    async def adetect_all(self, text, *args, **kwargs):
        accumulator = self.get_accumulator(args, kwargs)
        await accumulator.start()
        return await accumulator.add(text)

    def detect(self, text, *args, **kwargs):
        raise NotImplementedError(
            "Batched detectors do not support synchronous detect(). Please use adetect() instead"
        )

    def detect_all(self, text, *args, **kwargs):
        raise NotImplementedError(
            "Batched detectors do not support synchronous detect_all(). Please use adetect_all() instead"
        )

DEFAULT_PI_MODEL = "protectai/deberta-v3-base-prompt-injection-v2"


class PromptInjectionAnalyzer(BatchedDetector):
    """Analyzer for detecting prompt injections via classifier.

    The analyzer uses a pre-trained classifier (e.g., a model available on Huggingface) to detect prompt injections in text.
    Note that this is just a heuristic, and relying solely on the classifier is not sufficient to prevent the security vulnerabilities.
    """

    def __init__(self):
        super().__init__(max_batch_size=16, max_wait_time=0.1)
        self.pipe_store = dict()

    async def preload(self):
        # preloads the model
        await self.adetect("Testing")

    def _load_model(self, model):
        pipeline = transformers_extra.package("transformers").import_names("pipeline")
        self.pipe_store[model] = pipeline("text-classification", model=model, top_k=None)

    def _get_model(self, model):
        return self.pipe_store[model]

    def _has_model(self, model):
        return model in self.pipe_store

    async def adetect_all_batch(
        self, texts: list[str], model: str = DEFAULT_PI_MODEL, threshold: float = 0.9
    ) -> bool:
        """Detects whether text contains prompt injection.

        Args:
            text: The text to analyze.
            model: The model to use for prompt injection detection.
            threshold: The threshold for the model score above which text is considered prompt injection.

        Returns:
            A boolean indicating whether the text contains prompt injection.
        """
        if not self._has_model(model):
            self._load_model(model)

        # make sure texts is list of str
        assert type(texts) is list and all(
            type(t) is str for t in texts
        ), "texts must be a list of str"

        model = self._get_model(model)
        scores = model(texts)

        return [
            [scores[i][0]["label"] == "INJECTION" and scores[i][0]["score"] > threshold]
            for i in range(len(scores))
        ]

    async def adetect(self, text, *args, **kwargs):
        result = await self.adetect_all(text, *args, **kwargs)
        return result[0] is True


DEFAULT_PI_MODEL = "ProtectAI/deberta-v3-base-prompt-injection-v2"


class UnicodeDetector(BaseDetector):
    """Detector for detecting unicode characters based on their category (using allow or deny list).

    The detector analyzes the given string character by character and considers the following categories during the detection:

    [Cc]	Other, Control
    [Cf]	Other, Format
    [Cn]	Other, Not Assigned (no characters in the file have this property)
    [Co]	Other, Private Use
    [Cs]	Other, Surrogate
    [LC]	Letter, Cased
    [Ll]	Letter, Lowercase
    [Lm]	Letter, Modifier
    [Lo]	Letter, Other
    [Lt]	Letter, Titlecase
    [Lu]	Letter, Uppercase
    [Mc]	Mark, Spacing Combining
    [Me]	Mark, Enclosing
    [Mn]	Mark, Nonspacing
    [Nd]	Number, Decimal Digit
    [Nl]	Number, Letter
    [No]	Number, Other
    [Pc]	Punctuation, Connector
    [Pd]	Punctuation, Dash
    [Pe]	Punctuation, Close
    [Pf]	Punctuation, Final quote (may behave like Ps or Pe depending on usage)
    [Pi]	Punctuation, Initial quote (may behave like Ps or Pe depending on usage)
    [Po]	Punctuation, Other
    [Ps]	Punctuation, Open
    [Sc]	Symbol, Currency
    [Sk]	Symbol, Modifier
    [Sm]	Symbol, Math
    [So]	Symbol, Other
    [Zl]	Separator, Line
    [Zp]	Separator, Paragraph
    [Zs]	Separator, Space
    """

    def detect_all(self, text: str, categories: list[str] | None = None) -> list[DetectorResult]:
        """Detects all unicode groups that should not be allowed in the text.

        Attributes:
            allow: List of categories to allow.
            deny: List of categories to deny.

        Returns:
            A list of DetectorResult objects indicating the detected unicode groups.

        Raises:
            ValueError: If both allow and deny categories are specified.
        """
        res = []
        for index, chr in enumerate(text):
            cat = unicodedata.category(chr)
            if categories is None or cat in categories:
                res.append(DetectorResult(cat, index, index + 1))
        return res

# TODO: For now, we run everything with re.IGNORECASE, ignoring the flags below
SECRETS_PATTERNS = {
    "GITHUB_TOKEN": [
        re.compile(r'(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36}'),
    ],
    "AWS_ACCESS_KEY": [
        re.compile(r'(?:A3T[A-Z0-9]|ABIA|ACCA|AKIA|ASIA)[0-9A-Z]{16}'),
        re.compile(r'aws.{{0,20}}?{secret_keyword}.{{0,20}}?[\'\"]([0-9a-zA-Z/+]{{40}})[\'\"]'.format(
            secret_keyword=r'(?:key|pwd|pw|password|pass|token)',
        ), flags=re.IGNORECASE),
    ],
    "AZURE_STORAGE_KEY": [
        re.compile(r'AccountKey=[a-zA-Z0-9+\/=]{88}'),
    ],
    "SLACK_TOKEN": [
        re.compile(r'xox(?:a|b|p|o|s|r)-(?:\d+-)+[a-z0-9]+', flags=re.IGNORECASE),
        re.compile(r'https://hooks\.slack\.com/services/T[a-zA-Z0-9_]+/B[a-zA-Z0-9_]+/[a-zA-Z0-9_]+', flags=re.IGNORECASE | re.VERBOSE),
    ],
}

@dataclass
class SecretPattern:
    secret_name: str
    patterns: list[Pattern]


class SecretsAnalyzer(BaseDetector):
    """
    Analyzer for detecting secrets in generated text.
    """
    def __init__(self):
        super().__init__()
        self.secrets = self.get_recognizers()

    def get_recognizers(self) -> list[Pattern]:
        secrets = []
        for secret_name, regex_pattern in SECRETS_PATTERNS.items():
            secrets.append(SecretPattern(secret_name, regex_pattern))
        return secrets
    
    def detect_all(self, text: str) -> list[DetectorResult]:
        res = []
        for secret in self.secrets:
            for pattern in secret.patterns:
                for match in pattern.finditer(text):
                    res.append(DetectorResult(secret.secret_name, match.start(), match.end()))
        return res

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

    def execute_secure_request(
            self, 
            user_id, 
            agent_role, 
            method, 
            url, 
            resource_id=None,
            payload=None,          
            signature=None,        
            is_workflow_end=False  
    ):
        if not self.check_rate_limit(user_id):
            return {"error": "Rate limit exceeded"}

        if not self.validate_outbound_url(url):
            return {"error": "Invalid or Forbidden URL"}

        parsed_path = urlparse(url).path
        if not self.validate_agent_function(agent_role, method, parsed_path):
            return {"error": "Permission Denied for Agent"}

        if resource_id:
             if not self.validate_object_ownership(user_id, resource_id):
                 return {"error": "Access to this object is forbidden"}

        if method == "DELETE" or "transfer" in url.lower():
            return self.trigger_hitl_review(user_id, f"{method} {url}", "High Risk Action Detected")

        self.secure_log(f"Authorized request for User: {user_id} to URL: {url}")

        try:
            response = self.session.request(method, url, timeout=5)
            
            if payload and signature:
                tool_secret = "my_super_secret_key" 
                if not self.verify_tool_signature(payload, signature, tool_secret):
                    return {"error": "Data Integrity Check Failed: Signature Mismatch"}

            clean_text = re.sub(r'<script.*?>.*?</script>', '', response.text, flags=re.DOTALL)
            
            result = {"status": response.status_code, "data": clean_text}

            if is_workflow_end:
                current_session_id = f"sess_{user_id}_{int(time.time())}" 
                self.flush_session_context(user_id, current_session_id)
            
            return result
            
        except requests.RequestException as e:
            return {"error": "Upstream service failure"}



# import asyncio
# from mcpconn import MCPClient
# from mcpconn.guardrails import PIIGuardrail, WordMaskGuardrail

# async def main():
#     client = MCPClient(llm_provider="anthropic",model="claude-3-5-sonnet-20241022")
#     client.add_guardrail(PIIGuardrail(name="pii_detector"))
#     client.add_guardrail(WordMaskGuardrail(name="word_mask", words_to_mask=["secret"], replacement="[CENSORED]"))

#     await client.connect("examples/simple_server/weather_stdio.py", transport="stdio") # add your stdio server

#     user_input = "what is the weather alert in texas."
#     # Send to LLM (no guardrails applied automatically)
#     response = await client.query(user_input)

#     # If you want to apply guardrails to the LLM output, do it manually:
#     guardrail_results = await client.guardrails.check_all(response)
#     for result in guardrail_results:
#         if not result.passed and result.masked_content:
#             response = result.masked_content

#     print("Sanitized response:", response)
#     await client.disconnect()

# if __name__ == "__main__":
#     asyncio.run(main())
    