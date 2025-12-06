# Initialize RCA logger with mongo_level=INFO to send user-facing events to MongoDB

from lib.logger import setup_logging
import logging

rca_logger = setup_logging(
    level=logging.INFO,
    mongo_level=logging.INFO,
    fallback_file="rca_logs.log",
    mongo_collection="rca_events",
    fallback_file="fallback_rca_events.logs"
)
