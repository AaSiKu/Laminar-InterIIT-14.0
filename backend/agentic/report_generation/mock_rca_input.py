"""
Mock RCA Input Data - Telemetry-based RCA Output
Contains only RCA Output from telemetry data analysis
Used for testing and as example schema for API integration
"""

from datetime import datetime, timedelta


def get_rca_output_critical():
    """
    RCA Output for a CRITICAL incident: Performance degradation from telemetry analysis.
    Matches RCAAnalysisOutput structure from backend/agentic/rca/output.py
    """
    base_time = datetime.now()
    
    return {
        "severity": "CRITICAL",
        
        "affected_services": [
            "payment-service",
            "database-service",
            "api-gateway"
        ],
        
        "narrative": """Critical performance degradation detected in payment service from telemetry data. Response times increased from 100ms to 3500ms causing transaction timeouts. Analysis shows database connection pool exhaustion with all 50 connections in use, compounded by long-running queries not releasing connections. Customer transactions failed with 15% error rate affecting 2,847 transactions.""",
        
        "error_citations": [
            {
                "timestamp": (base_time - timedelta(minutes=35)).isoformat(),
                "service": "payment-service",
                "message": "Connection pool warning: 45/50 connections in use, pool utilization at 90%"
            },
            {
                "timestamp": (base_time - timedelta(minutes=30)).isoformat(),
                "service": "database-service",
                "message": "Slow query detected: SELECT FROM transactions taking 8.5s (normal: 0.2s)"
            },
            {
                "timestamp": (base_time - timedelta(minutes=25)).isoformat(),
                "service": "payment-service",
                "message": "Database connection pool exhausted: all 50/50 connections in use"
            },
            {
                "timestamp": (base_time - timedelta(minutes=20)).isoformat(),
                "service": "payment-service",
                "message": "Response time SLA breach: P99 latency 3500ms exceeds 500ms threshold"
            },
            {
                "timestamp": (base_time - timedelta(minutes=18)).isoformat(),
                "service": "api-gateway",
                "message": "Upstream timeout errors from payment-service: 15% error rate"
            }
        ],
        
        "root_cause": "Database connection pool exhaustion caused by long-running queries (8.5s average) not properly releasing connections. Missing query timeout configuration combined with increased traffic load (2x normal) led to connection starvation and cascading failures across payment service and API gateway."
    }


def get_mock_rca_data():
    """
    Get mock RCA output for testing.
    This is the main function that returns the input structure for report generation.
    """
    return get_rca_output_critical()
