import asyncio
import json
import os
from typing import Any, Dict, List, Optional
import litellm
from utils.logging import get_logger
from . import sensors
from .reporter import format_report
from dotenv import load_dotenv

load_dotenv()

logger = get_logger(__name__)

class RCAAgent:
    """
      - collect artifacts (mongo events, docker logs)
      - run simple heuristics to detect likely root causes
      - use an LLM to generate a high-level hypothesis
      - return structured report
    """

    def __init__(
        self,
        mongo_client: Optional[Any] = None,
        mongo_db: str = "db",
        mongo_collection: str = "pipelines",
        docker_client: Optional[Any] = None,
    ):
        self.mongo = mongo_client
        self.mongo_db = mongo_db
        self.mongo_collection = mongo_collection
        self.docker = docker_client
        self.logger = logger
        self.llm_model = os.getenv("RCA_LLM_MODEL", "gemini/gemini-pro")
        self.llm_prompt_template = """
You are a senior engineer performing a root cause analysis on a failed data pipeline.
Based on the following evidence (container statuses and log snippets), provide a concise hypothesis.
Respond ONLY with a JSON object with the keys "hypothesis", "reasoning", and "recommendation".

Evidence:
{evidence_text}
"""

    async def collect_artifacts(self, pipeline_id: str) -> Dict[str, Any]:
        """Gather recent events, container states and logs."""
        self.logger.info("collect_artifacts %s", pipeline_id)
        tasks = [
            sensors.get_mongo_events(self.mongo, self.mongo_db, self.mongo_collection, pipeline_id, 100),
            sensors.get_docker_containers(self.docker, pipeline_id),
        ]
        events, containers = await asyncio.gather(*tasks)
        return {"events": events, "containers": containers}

    async def analyze_artifacts(self, artifacts: Dict[str, Any]) -> Dict[str, Any]:
        """
         - Look for 'error'/'exception' keywords in events or container logs
         - Extract tracebacks
         - Flag containers not running or repeatedly restarting
        Then, send evidence to an LLM for a high-level hypothesis.
        """
        events = artifacts.get("events", []) or []
        containers = artifacts.get("containers", []) or []

        probable_causes: List[Dict[str, str]] = []
        evidence: List[str] = []

        # 1. Inspect events for error keywords
        for ev in events:
            text = " ".join(str(v) for v in ev.values())
            if "exception" in text.lower() or "error" in text.lower() or "traceback" in text.lower():
                probable_causes.append({"type": "event_error", "summary": ev.get("message", str(ev))})
                evidence.append(f"event:{ev.get('_id', ev.get('ts', 'unknown'))} -> {ev.get('message', '')}")

        # 2. Inspect containers
        for c in containers:
            status = c.get("status", "")
            logs = c.get("logs", "") or ""
            if status.lower() not in ("running", "healthy", "up"):
                probable_causes.append({"type": "container_status", "summary": f"{c.get('name')} status={status}"})
                evidence.append(f"container:{c.get('name')} status={status}")
            if "error" in logs.lower() or "exception" in logs.lower() or "traceback" in logs.lower():
                tb = await sensors.parse_tracebacks(logs)
                probable_causes.append({"type": "container_log_error", "summary": f"errors in {c.get('name')}"})
                evidence.extend([f"{c.get('name')}: {t[:400]}" for t in tb[:3]])

        # 3. Get AI Hypothesis
        llm_hypothesis = None
        if evidence and os.getenv("GEMINI_API_KEY"):
            evidence_text = "\n".join(f"- {item}" for item in evidence)
            prompt = self.llm_prompt_template.format(evidence_text=evidence_text)
            try:
                self.logger.info(f"Sending evidence to LLM ({self.llm_model}) for analysis.")
                response = await litellm.acompletion(
                    model=self.llm_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    response_format={"type": "json_object"},
                )
                content = response.choices[0].message.content
                llm_hypothesis = json.loads(content)
            except Exception:
                self.logger.exception("LLM analysis failed.")
                llm_hypothesis = {"error": "Failed to get hypothesis from LLM."}
        elif not os.getenv("GEMINI_API_KEY"):
            self.logger.warning("GEMINI_API_KEY not set. Skipping LLM analysis.")

        # 4. Basic deduplication of rule-based findings
        seen = set()
        deduped_causes = []
        for p in probable_causes:
            key = (p.get("type"), p.get("summary"))
            if key in seen:
                continue
            seen.add(key)
            deduped_causes.append(p)

        return {
            "probable_causes": deduped_causes,
            "evidence": evidence,
            "ai_hypothesis": llm_hypothesis,
        }

    async def analyze_workflow(self, pipeline_id: str, timeout: int = 30) -> Dict[str, Any]:
        """Top-level entry: collect, analyze and return a report."""
        self.logger.info("Starting RCA for %s", pipeline_id)
        try:
            artifacts = await asyncio.wait_for(self.collect_artifacts(pipeline_id), timeout=timeout)
            analysis = await asyncio.wait_for(self.analyze_artifacts(artifacts), timeout=timeout)
            report = {
                "pipeline_id": pipeline_id,
                "artifacts_summary": {"events": len(artifacts.get("events", [])), "containers": len(artifacts.get("containers", []))},
                "analysis": analysis,
            }
            self.logger.info("RCA completed for %s", pipeline_id)
            return report
        except asyncio.TimeoutError:
            self.logger.warning("RCA timed out for %s", pipeline_id)
            return {"pipeline_id": pipeline_id, "error": "timeout"}
        except Exception:
            self.logger.exception("RCA failed")
            return {"pipeline_id": pipeline_id, "error": "internal_error"}
