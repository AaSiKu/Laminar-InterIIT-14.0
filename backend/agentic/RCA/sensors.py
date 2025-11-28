from typing import Any, Dict, List, Optional
import re
from utils.logging import get_logger

logger = get_logger(__name__)

async def parse_tracebacks(text: str) -> List[str]:
    """Return found traceback snippets (very lightweight)."""
    if not text:
        return []
    parts = re.split(r"(Traceback.*?)(?=(?:\nTraceback|\Z))", text, flags=re.S)
    results = [p.strip() for p in parts if p and "Traceback" in p]
    return results

async def get_mongo_events(mongo_client, db_name: str, collection: str, pipeline_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch recent workflow events from MongoDB. Returns list (may be empty)."""
    if mongo_client is None:
        logger.debug("No mongo_client provided to get_mongo_events")
        return []
    try:
        db = mongo_client[db_name]
        coll = db[collection]
        cursor = coll.find({"pipeline_id": pipeline_id}).sort("ts", -1).limit(limit)
        result = await cursor.to_list(length=limit)
        return result
    except Exception as e:
        logger.exception("get_mongo_events failed")
        return []

async def get_docker_containers(client, pipeline_id: str) -> List[Dict[str, Any]]:
    """Return simple container summaries for containers that match pipeline_id in their name."""
    if client is None:
        logger.debug("No docker client provided to get_docker_containers")
        return []
    try:
        containers = client.containers.list(all=True, filters={"name": pipeline_id})
        out = []
        for c in containers:
            try:
                out.append({
                    "id": c.id,
                    "name": c.name,
                    "status": c.status,
                    "image": getattr(c, "image", None).tags if getattr(c, "image", None) else None,
                    "logs": c.logs(tail=200).decode(errors="ignore") if hasattr(c, "logs") else "",
                })
            except Exception:
                logger.exception("error reading container info")
        return out
    except Exception:
        logger.exception("get_docker_containers failed")
        return []
