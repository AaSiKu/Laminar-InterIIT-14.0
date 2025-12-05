"""
Core weekly report generation logic.
Handles the workflow for generating weekly summary reports.
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

# Add parent directories to path to import from agentic module
backend_path = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_path))
sys.path.insert(0, str(backend_path / "agentic"))

# Import from agentic module using absolute imports
import llm_factory

from document_store_manager import get_incident_store
from agents.weekly_summarizer_agent import WeeklySummarizerAgent
from mock_rca_input import get_pipeline_topology

logger = logging.getLogger(__name__)


def parse_incident_report(report_content: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse a markdown incident report and extract structured data.
    
    Args:
        report_content: Full markdown content of the incident report
        metadata: Basic metadata (incident_id, severity, timestamp, etc.)
        
    Returns:
        Dictionary with structured incident data including root cause, 
        affected components, resolution steps, and impact
    """
    incident_data = {
        "incident_id": metadata.get("incident_id", "UNKNOWN"),
        "timestamp": metadata.get("timestamp"),
        "severity": metadata.get("severity", "unknown"),
        "affected_node": metadata.get("affected_node", "unknown"),
        "root_cause": "Not specified",
        "affected_components": [],
        "resolution_steps": [],
        "impact_summary": "Not specified"
    }
    
    lines = report_content.split('\n')
    current_section = None
    
    for i, line in enumerate(lines):
        line_lower = line.lower().strip()
        
        # Extract Root Cause
        if '## root cause analysis' in line_lower or '## incident summary' in line_lower:
            current_section = 'root_cause'
            # Look ahead for the actual root cause content
            for j in range(i+1, min(i+10, len(lines))):
                next_line = lines[j].strip()
                if next_line and not next_line.startswith('#') and not next_line.startswith('**'):
                    if len(next_line) > 20:  # Meaningful content
                        incident_data['root_cause'] = next_line
                        break
        
        # Extract Impact Summary
        elif '## impact assessment' in line_lower or '## incident impact' in line_lower:
            current_section = 'impact'
            for j in range(i+1, min(i+10, len(lines))):
                next_line = lines[j].strip()
                if next_line and not next_line.startswith('#') and not next_line.startswith('**'):
                    if len(next_line) > 20:
                        incident_data['impact_summary'] = next_line
                        break
        
        # Extract Resolution Steps
        elif '## resolution steps' in line_lower or '## remediation' in line_lower:
            current_section = 'resolution'
            resolution_steps = []
            for j in range(i+1, min(i+20, len(lines))):
                next_line = lines[j].strip()
                if next_line.startswith('#'):  # New section
                    break
                if next_line.startswith('-') or next_line.startswith('*') or next_line[0:1].isdigit():
                    # Clean up list markers
                    step = next_line.lstrip('-*0123456789. ').strip()
                    if len(step) > 10:
                        resolution_steps.append(step)
            incident_data['resolution_steps'] = resolution_steps[:5]  # Top 5
        
        # Extract Affected Components from tables or lists
        elif 'affected component' in line_lower or 'impacted system' in line_lower:
            current_section = 'components'
            components = []
            for j in range(i+1, min(i+15, len(lines))):
                next_line = lines[j].strip()
                if next_line.startswith('#'):  # New section
                    break
                # Look for component names (usually after | or -)
                if '|' in next_line and not next_line.startswith('|---'):
                    parts = [p.strip() for p in next_line.split('|')]
                    if len(parts) >= 2:
                        comp_name = parts[1] if parts[1] else parts[0]
                        if comp_name and len(comp_name) > 2 and comp_name not in ['Component', 'Name', '']:
                            components.append({"component_name": comp_name, "impact_level": metadata.get("severity", "unknown")})
            incident_data['affected_components'] = components[:3]  # Top 3
    
    return incident_data


def generate_weekly_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    cleanup_after_report: bool = False
) -> Tuple[str, Dict[str, Any]]:
    """
    Generate a weekly summary report from stored incident reports.
    
    Args:
        start_date: Start of report period (optional, defaults to all reports if both dates are None)
        end_date: End of report period (optional, defaults to all reports if both dates are None)
        cleanup_after_report: If True, deletes all reports from document store after generation
        
    Returns:
        Tuple of (report_content, metadata) where metadata includes:
            - start_date: Report period start (or None for all reports)
            - end_date: Report period end (or None for all reports)
            - incident_count: Number of incidents included
            - filepath: Location where report was saved
            - cleanup_performed: True if cleanup was performed, False otherwise
            - deleted_files: Number of files deleted (if cleanup_performed)
            - deleted_metadata_entries: Number of metadata entries deleted (if cleanup_performed)
            
    Raises:
        ValueError: If required environment variables are missing
        Exception: If report generation fails
    """
    # Create reasoning model using the unified factory
    try:
        reasoning_model = llm_factory.create_reasoning_model()
    except Exception as e:
        raise ValueError(
            f"Failed to create reasoning model from factory: {str(e)}. "
            "Ensure API keys are set in backend/agentic/.env"
        )
    
    # Retrieve incident reports from document store
    incident_store = get_incident_store()
    
    # If no dates provided, get ALL UNIQUE reports
    if start_date is None and end_date is None:
        reports = incident_store.get_all_reports()
        start_date = datetime.min
        end_date = datetime.now()
        logger.info(f"Generating weekly report for all {len(reports)} unique incidents")
    else:
        # Set default date range if only one date provided
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            start_date = end_date - timedelta(days=7)
        reports = incident_store.get_reports_by_date_range(start_date, end_date)
        logger.info(f"Generating weekly report for {len(reports)} incidents from {start_date.date()} to {end_date.date()}")
    
    # Load full report content and extract rich incident data
    enriched_incidents = []
    for report_metadata in reports:
        try:
            # Load the actual markdown report
            report_content = incident_store.load_report_content(report_metadata)
            
            # Parse it to extract structured data
            incident_data = parse_incident_report(report_content, report_metadata)
            enriched_incidents.append(incident_data)
            
        except Exception as e:
            logger.warning(f"Failed to load/parse report {report_metadata.get('filename', 'unknown')}: {str(e)}")
            # Fall back to basic metadata
            enriched_incidents.append({
                "incident_id": report_metadata.get("incident_id", "UNKNOWN"),
                "timestamp": report_metadata.get("timestamp"),
                "severity": report_metadata.get("severity", "unknown"),
                "affected_node": report_metadata.get("affected_node", "unknown"),
                "root_cause": "Failed to load report content",
                "affected_components": [],
                "resolution_steps": [],
                "impact_summary": "Unable to parse report"
            })
    
    # Calculate statistics from the reports
    statistics = incident_store.get_report_statistics(reports)
    
    # Initialize the weekly summarizer agent with LLM from factory
    summarizer = WeeklySummarizerAgent(llm=reasoning_model)
    
    # Get pipeline topology for context
    pipeline_topology = get_pipeline_topology()
    
    # Generate the appropriate report based on incident count
    if reports:
        # Generate incident analysis report with enriched data
        report_content = summarizer.generate_weekly_summary(
            incident_reports=enriched_incidents,  # Pass enriched data instead of raw metadata
            report_statistics=statistics,
            external_news=[],  # No external news in API version
            pipeline_topology=pipeline_topology,
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )
    else:
        # Generate all-clear report
        report_content = summarizer.generate_all_clear_report(
            external_news=[],  # No external news in API version
            pipeline_topology=pipeline_topology,
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )
    
    # Save the weekly report to file
    output_dir = Path("./weekly_reports")
    output_dir.mkdir(exist_ok=True)
    
    filename = f"weekly_report_{end_date.strftime('%Y%m%d')}.md"
    filepath = output_dir / filename
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report_content)
    
    # Prepare metadata
    metadata = {
        "start_date": start_date,
        "end_date": end_date,
        "incident_count": len(reports),
        "filepath": str(filepath),
        "generated_at": datetime.now(),
        "cleanup_performed": False
    }
    
    # Perform cleanup if requested
    if cleanup_after_report:
        logger.info("Cleanup requested - deleting all reports from document store")
        cleanup_result = incident_store.delete_all_reports()
        metadata["cleanup_performed"] = True
        metadata["deleted_files"] = cleanup_result["deleted_files"]
        metadata["deleted_metadata_entries"] = cleanup_result["deleted_metadata_entries"]
        logger.info(f"Cleanup complete: Deleted {cleanup_result['deleted_files']} files and {cleanup_result['deleted_metadata_entries']} metadata entries")
    
    return report_content, metadata
