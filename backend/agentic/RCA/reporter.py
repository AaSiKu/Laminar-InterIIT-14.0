from typing import Any, Dict, List, Optional
from utils.logging import get_logger
import json
logger = get_logger(__name__)

def format_report(report: Dict[str, Any], pretty: bool = True) -> str:
    if pretty:
        try:
            return json.dumps(report, indent=2, default=str)
        except Exception:
            logger.exception("format_report json failure")
            return str(report)
    return str(report)

def save_report(path: str, report: Dict[str, Any]) -> None:
    try:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(format_report(report))
        logger.info(f"Saved RCA report to {path}")
    except Exception:
        logger.exception("save_report failed")
