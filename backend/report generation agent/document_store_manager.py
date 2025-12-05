"""
Document Store Manager: Stores and retrieves incident reports using Pathway
Implements proper Pathway DocumentStore with vector search and constant monitoring
"""

import os
import json
import pathway as pw
import threading
import time
import queue
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
import logging

try:
    # Try newer pathway API first (0.26.4+)
    from pathway.xpacks.llm import embedders, parsers, splitters
    from pathway.xpacks.llm.document_store import DocumentStore
    from pathway.stdlib.indexing import BruteForceKnnFactory
    PATHWAY_NEW_API = True
except (ImportError, ModuleNotFoundError):
    # Fallback for older pathway versions (0.10.1)
    from pathway.xpacks.llm import embedders, parsers, splitters
    from pathway.xpacks.llm.vector_store import VectorStoreServer as DocumentStore
    BruteForceKnnFactory = None  # Not used in old API
    PATHWAY_NEW_API = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress verbose Pathway logging
logging.getLogger('pathway_engine').setLevel(logging.WARNING)
logging.getLogger('pathway_engine.connectors.monitoring').setLevel(logging.ERROR)


class PushableConnectorSubject(pw.io.python.ConnectorSubject):
    """
    Custom connector for pushing data into Pathway pipeline.
    Used for vector search queries.
    """
    def __init__(self):
        super().__init__()
        self._data_queue = queue.Queue()
        self._running = True

    def run(self):
        while self._running:
            try:
                data = self._data_queue.get(timeout=0.1)
                if data:
                    self.next(**data)
            except queue.Empty:
                continue
    
    def stop(self):
        self._running = False

    def push(self, data: dict):
        self._data_queue.put(data)


class QueryInputSchema(pw.Schema):
    """Schema for vector search queries"""
    request_id: str
    query: str
    k: int


class IncidentReportStore:
    """
    Manages storage and retrieval of incident reports using Pathway's DocumentStore.
    Implements proper vector search with Cohere embeddings and constant file monitoring.
    """
    
    def __init__(self, storage_dir: str = "./reports", cohere_api_key: Optional[str] = None):
        """
        Initialize the Pathway DocumentStore for incident reports.
        
        Args:
            storage_dir: Directory to store incident report markdown files
            cohere_api_key: Cohere API key for embeddings
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        self.metadata_file = self.storage_dir / "metadata.jsonl"
        self.results_store = {}  # Shared store for query results
        
        # Initialize Cohere embedder
        self.cohere_api_key = cohere_api_key or os.getenv("COHERE_API_KEY")
        if not self.cohere_api_key:
            raise ValueError("COHERE_API_KEY not found in environment")
        
        try:
            self.embedder = embedders.LiteLLMEmbedder(
                model="cohere/embed-english-light-v3.0",
                api_key=self.cohere_api_key
            )
            logger.info("Cohere embedder initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Cohere embedder: {str(e)}")
            raise
        
        # Initialize Pathway pipeline
        self._init_pathway_pipeline()
        self.pathway_thread = None
    
    def _init_pathway_pipeline(self):
        """Initialize Pathway DocumentStore pipeline with vector search"""
        
        # Create query connector
        self.query_connector = PushableConnectorSubject()
        self.query_input = pw.io.python.read(
            subject=self.query_connector,
            schema=QueryInputSchema,
            autocommit_duration_ms=50,
        )
        
        # Read documents from storage directory with streaming mode
        # Only read .md files, exclude metadata.jsonl
        documents = pw.io.fs.read(
            str(self.storage_dir / "*.md"),
            mode="streaming",  # Constantly monitors the directory
            format="binary",
            with_metadata=True,
        )
        
        # Create DocumentStore with appropriate API
        if PATHWAY_NEW_API:
            # Newer API (0.26.4+) uses BruteForceKnnFactory and UnstructuredParser
            retriever_factory = BruteForceKnnFactory(
                embedder=self.embedder,
                dimensions=1024,  # Cohere embed-english-light-v3.0 dimension
            )
            parser = parsers.UnstructuredParser()
            text_splitter = splitters.TokenCountSplitter(max_tokens=512)
            
            self.document_store = DocumentStore(
                documents,
                retriever_factory=retriever_factory,
                parser=parser,
                splitter=text_splitter,
            )
        else:
            # Older API (0.10.1) uses ParseUnstructured and passes embedder directly
            parser = parsers.ParseUnstructured()
            text_splitter = splitters.TokenCountSplitter(max_tokens=512)
            
            self.document_store = DocumentStore(
                documents,
                embedder=self.embedder,
                parser=parser,
                splitter=text_splitter,
            )
        
        # Setup retrieval pipeline
        formatted_queries = self.query_input.select(
            query=pw.this.query,
            k=pw.this.k,
            metadata_filter=pw.cast(str | None, None),
            filepath_globpattern=pw.cast(str | None, None),
        )
        
        retrieve_results = self.document_store.retrieve_query(formatted_queries)
        
        self.retrieve_output = self.query_input.join(
            retrieve_results,
            self.query_input.id == retrieve_results.id
        ).select(
            request_id=self.query_input.request_id,
            result=retrieve_results.result,
        )
        
        # Subscribe to results
        pw.io.subscribe(
            self.retrieve_output,
            on_change=self._on_retrieve_change
        )
        
        logger.info("Pathway DocumentStore pipeline initialized")
    
    def _on_retrieve_change(self, key, row, time, is_addition):
        """Callback for retrieval results"""
        if is_addition:
            try:
                if hasattr(row, '_asdict'):
                    row_dict = row._asdict()
                elif isinstance(row, dict):
                    row_dict = row
                else:
                    row_dict = {'request_id': row[0], 'result': row[1]}
                
                request_id = row_dict.get('request_id')
                if request_id:
                    self.results_store[request_id] = row_dict
                    
            except Exception as e:
                logger.error(f"Error in retrieve callback: {str(e)}")
    
    def start(self):
        """Start the Pathway pipeline in background thread"""
        if self.pathway_thread is not None:
            logger.warning("Pathway pipeline already running")
            return
        
        logger.info("Starting Pathway pipeline...")
        
        def run_pathway():
            try:
                pw.run(monitoring_level=pw.MonitoringLevel.NONE)
            except Exception as e:
                logger.error(f"Pathway pipeline error: {str(e)}")
        
        self.pathway_thread = threading.Thread(target=run_pathway, daemon=True)
        self.pathway_thread.start()
        
        # Wait a moment for pipeline to initialize
        time.sleep(2)
        logger.info("Pathway pipeline running")
    
    def stop(self):
        """Stop the Pathway pipeline"""
        if self.query_connector:
            self.query_connector.stop()
        logger.info("Pathway pipeline stopped")
    
    def store_incident_report(
        self, 
        report_markdown: str, 
        incident_id: str,
        severity: str,
        affected_node: str,
        timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Store an incident report with metadata.
        
        Args:
            report_markdown: Full markdown content of the report
            incident_id: Unique incident identifier
            severity: Incident severity
            affected_node: Node that was affected
            timestamp: Incident timestamp (defaults to now)
            
        Returns:
            Dictionary with storage info (filepath, metadata)
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        # Generate unique filename based on timestamp and severity
        ts_str = timestamp.strftime("%Y%m%d_%H%M%S")
        filename = f"incident_{ts_str}_{severity}.md"
        filepath = self.storage_dir / filename
        
        # Save markdown file
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report_markdown)
        
        # Store metadata
        metadata = {
            "incident_id": incident_id,
            "timestamp": timestamp.isoformat(),
            "severity": severity,
            "affected_node": affected_node,
            "filepath": str(filepath),
            "filename": filename
        }
        
        # Append to metadata file
        with open(self.metadata_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(metadata) + '\n')
        
        logger.info(f"Stored incident report: {filename}")
        logger.info(f"   Incident ID: {incident_id}")
        logger.info(f"   Severity: {severity}")
        logger.info(f"   Node: {affected_node}")
        
        return metadata
    
    def vector_search_reports(self, query: str, k: int = 10, timeout: int = 10) -> List[Dict[str, Any]]:
        """
        Perform vector search on incident reports.
        
        Args:
            query: Search query
            k: Number of results to return
            timeout: Timeout in seconds
            
        Returns:
            List of search results with content and metadata
        """
        import uuid
        
        request_id = str(uuid.uuid4())
        
        # Push query to Pathway
        self.query_connector.push({
            "request_id": request_id,
            "query": query,
            "k": k
        })
        
        # Poll for results
        start_time = time.time()
        while time.time() - start_time < timeout:
            if request_id in self.results_store:
                result = self.results_store.pop(request_id)
                
                # Extract documents from result
                docs = result.get('result', [])
                if hasattr(docs, 'as_list'):
                    docs = docs.as_list()
                elif not isinstance(docs, list):
                    docs = [docs]
                
                search_results = []
                for doc in docs:
                    if isinstance(doc, dict):
                        search_results.append(doc)
                    elif hasattr(doc, '__dict__'):
                        search_results.append(vars(doc))
                    else:
                        search_results.append({'content': str(doc)})
                
                logger.info(f"Vector search returned {len(search_results)} results")
                return search_results
            
            time.sleep(0.1)
        
        logger.warning(f"Vector search timed out after {timeout}s")
        return []
    
    def get_reports_by_date_range(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        Retrieve incident reports within a date range.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            
        Returns:
            List of report metadata dictionaries
        """
        if not self.metadata_file.exists():
            logger.info("No incident reports found")
            return []
        
        matching_reports = []
        
        with open(self.metadata_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    metadata = json.loads(line.strip())
                    report_timestamp = datetime.fromisoformat(metadata['timestamp'])
                    
                    # Normalize timezones for comparison
                    # If report has tz but start_date doesn't, remove tz from report
                    # If report doesn't have tz but start_date does, add tz to report
                    if start_date.tzinfo is None and report_timestamp.tzinfo is not None:
                        report_timestamp = report_timestamp.replace(tzinfo=None)
                    elif start_date.tzinfo is not None and report_timestamp.tzinfo is None:
                        report_timestamp = report_timestamp.replace(tzinfo=start_date.tzinfo)
                    
                    if start_date <= report_timestamp <= end_date:
                        matching_reports.append(metadata)
                except (json.JSONDecodeError, KeyError, ValueError) as e:
                    logger.warning(f"Skipping invalid metadata line: {e}")
                    continue
        
        # Sort by timestamp (newest first)
        matching_reports.sort(key=lambda x: x['timestamp'], reverse=True)
        
        logger.info(f"Found {len(matching_reports)} reports between {start_date.date()} and {end_date.date()}")
        return matching_reports
    
    def get_last_week_reports(self) -> List[Dict[str, Any]]:
        """
        Retrieve all incident reports from the last 7 days.
        
        Returns:
            List of report metadata dictionaries
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        return self.get_reports_by_date_range(start_date, end_date)
    
    def get_all_reports(self) -> List[Dict[str, Any]]:
        """
        Retrieve all UNIQUE incident reports from the document store.
        Filters out duplicates by keeping only the latest version of each incident_id.
        
        Returns:
            List of unique report metadata dictionaries
        """
        if not self.metadata_file.exists():
            logger.info("No incident reports found")
            return []
        
        # Use dict to track unique reports by incident_id
        unique_reports = {}
        
        with open(self.metadata_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    metadata = json.loads(line.strip())
                    incident_id = metadata['incident_id']
                    
                    # Keep only the latest timestamp for each incident_id
                    if incident_id not in unique_reports:
                        unique_reports[incident_id] = metadata
                    else:
                        existing_ts = datetime.fromisoformat(unique_reports[incident_id]['timestamp'])
                        new_ts = datetime.fromisoformat(metadata['timestamp'])
                        if new_ts > existing_ts:
                            unique_reports[incident_id] = metadata
                            
                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning(f"Skipping invalid metadata line: {e}")
                    continue
        
        all_reports = list(unique_reports.values())
        
        # Sort by timestamp (newest first)
        all_reports.sort(key=lambda x: x['timestamp'], reverse=True)
        
        total_entries = sum(1 for _ in open(self.metadata_file))
        logger.info(f"Found {len(all_reports)} unique incident reports (filtered from {total_entries} total entries)")
        return all_reports
    
    def load_report_content(self, metadata: Dict[str, Any]) -> str:
        """
        Load the full markdown content of a report.
        
        Args:
            metadata: Report metadata dictionary (from get_reports_by_date_range)
            
        Returns:
            Full markdown content of the report
        """
        filepath = Path(metadata['filepath'])
        
        if not filepath.exists():
            logger.error(f"Report file not found: {filepath}")
            return ""
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    
    def get_report_statistics(self, reports: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate statistics from a list of reports.
        
        Args:
            reports: List of report metadata
            
        Returns:
            Dictionary with statistics
        """
        if not reports:
            return {
                "total_incidents": 0,
                "severity_breakdown": {},
                "affected_nodes": [],
                "most_affected_node": None
            }
        
        severity_counts = {}
        node_counts = {}
        
        for report in reports:
            severity = report.get('severity', 'unknown')
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            node = report.get('affected_node', 'unknown')
            node_counts[node] = node_counts.get(node, 0) + 1
        
        most_affected_node = max(node_counts.items(), key=lambda x: x[1]) if node_counts else None
        
        return {
            "total_incidents": len(reports),
            "severity_breakdown": severity_counts,
            "affected_nodes": list(node_counts.keys()),
            "most_affected_node": most_affected_node[0] if most_affected_node else None,
            "node_incident_counts": node_counts
        }
    
    def delete_all_reports(self):
        """
        Delete ALL incident reports and metadata from the document store.
        This is a destructive operation - use with caution!
        
        Returns:
            Dictionary with count of deleted files and metadata entries
        """
        deleted_files = 0
        deleted_metadata = 0
        
        # Delete all markdown files in the storage directory
        if self.storage_dir.exists():
            for filepath in self.storage_dir.glob("*.md"):
                try:
                    filepath.unlink()
                    deleted_files += 1
                    logger.info(f"Deleted report file: {filepath.name}")
                except Exception as e:
                    logger.error(f"Failed to delete {filepath}: {str(e)}")
        
        # Clear metadata file
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r') as f:
                deleted_metadata = sum(1 for _ in f)
            
            # Truncate the metadata file
            self.metadata_file.unlink()
            logger.info(f"Deleted metadata file with {deleted_metadata} entries")
        
        logger.info(f"Cleanup complete: Deleted {deleted_files} report files and {deleted_metadata} metadata entries")
        
        return {
            "deleted_files": deleted_files,
            "deleted_metadata_entries": deleted_metadata
        }
    
    def cleanup_old_reports(self, days_to_keep: int = 90):
        """
        Delete reports older than specified days (for future retention policy).
        
        Args:
            days_to_keep: Number of days to keep reports
        """
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        if not self.metadata_file.exists():
            return
        
        # Read all metadata
        all_metadata = []
        with open(self.metadata_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    metadata = json.loads(line.strip())
                    all_metadata.append(metadata)
                except json.JSONDecodeError:
                    continue
        
        # Filter and delete old reports
        kept_metadata = []
        deleted_count = 0
        
        for metadata in all_metadata:
            try:
                report_timestamp = datetime.fromisoformat(metadata['timestamp'])
                
                if report_timestamp < cutoff_date:
                    # Delete file
                    filepath = Path(metadata['filepath'])
                    if filepath.exists():
                        filepath.unlink()
                    deleted_count += 1
                else:
                    kept_metadata.append(metadata)
            except (KeyError, ValueError):
                kept_metadata.append(metadata)  # Keep if timestamp invalid
        
        # Rewrite metadata file
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            for metadata in kept_metadata:
                f.write(json.dumps(metadata) + '\n')
        
        logger.info(f"Cleaned up {deleted_count} reports older than {days_to_keep} days")


# Global instance (singleton pattern)
_incident_store = None

def get_incident_store() -> IncidentReportStore:
    """Get or create the global incident report store instance and start Pathway pipeline."""
    global _incident_store
    if _incident_store is None:
        _incident_store = IncidentReportStore()
        _incident_store.start()  # Start Pathway pipeline
    return _incident_store
