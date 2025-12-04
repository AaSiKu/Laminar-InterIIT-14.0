"""
Mock RCA Input Data - Simplified Version
Only contains: Pipeline Topology + RCA Output
Used for testing and as example schema for API integration
"""

from datetime import datetime, timedelta


def get_pipeline_topology():
    """
    Pipeline topology showing the data flow architecture.
    This represents the system structure that processes transactions.
    """
    return {
        "pipeline_name": "Laminar Financial Data Pipeline",
        "version": "2.1.0",
        "nodes": [
            {
                "node_id": "ingress-kafka-001",
                "type": "Ingress",
                "name": "Kafka Consumer",
                "description": "Ingests transaction data from Kafka topics",
                "throughput_expected": "5000 msgs/sec",
                "dependencies": []
            },
            {
                "node_id": "parser-001",
                "type": "Parser",
                "name": "JSON Parser",
                "description": "Validates and parses incoming JSON payloads",
                "throughput_expected": "4800 msgs/sec",
                "dependencies": ["ingress-kafka-001"]
            },
            {
                "node_id": "transform-001",
                "type": "Transformation",
                "name": "Transformation Node",
                "description": "Normalizes data, applies business rules, enriches with reference data",
                "throughput_expected": "4500 msgs/sec",
                "dependencies": ["parser-001"],
                "current_version": "v1.3",
                "container_specs": {
                    "memory": "2GB",
                    "cpu": "2 cores",
                    "replicas": 3
                }
            },
            {
                "node_id": "ml-tide-001",
                "type": "ML Model",
                "name": "TiDE Forecasting Model",
                "description": "Time-series forecasting for fraud detection",
                "throughput_expected": "4000 msgs/sec",
                "dependencies": ["transform-001"],
                "model_version": "tide-v2.3"
            },
            {
                "node_id": "egress-api-001",
                "type": "Egress",
                "name": "REST API Gateway",
                "description": "Exposes processed data via REST endpoints",
                "throughput_expected": "3800 requests/sec",
                "dependencies": ["ml-tide-001"]
            }
        ],
        "edges": [
            {"from": "ingress-kafka-001", "to": "parser-001"},
            {"from": "parser-001", "to": "transform-001"},
            {"from": "transform-001", "to": "ml-tide-001"},
            {"from": "ml-tide-001", "to": "egress-api-001"}
        ]
    }


def get_rca_output_critical():
    """
    RCA Output for a CRITICAL incident: Memory leak in transformation node.
    This is the actual incident analysis that comes from your RCA system.
    """
    base_time = datetime.now()
    
    return {
        "incident_id": "INC-2025-12-03-0847",
        "severity": "Critical",
        "detected_at": (base_time - timedelta(minutes=24)).isoformat(),
        "narrative": """Critical SLA breach detected on Transformation Node following deployment v1.3. 
        P99 latency spiked from 85ms to 342ms (71% above 200ms threshold). Root cause identified as 
        insufficient container memory (2GB) combined with garbage collection overhead from new 
        memory-intensive data enrichment operations. Deployment introduced 23% larger payload sizes, 
        triggering frequent GC pauses averaging 2.3 seconds with 89% heap usage. Incident caused 
        timeout errors and downstream backpressure, affecting 12,487 transactions. Three customer 
        complaints received. System showed warning signs 10 minutes prior with latency at 145ms.""",
        
        "error_citations": [
            {
                "log_file": "transform-001-pod-7f8g9h.log",
                "trace_id": "7a8f3b2c-1d4e-4f9a-8c2b-3e5f6a7b8c9d",
                "timestamp": (base_time - timedelta(minutes=39)).isoformat(),
                "error_message": "Deployment v1.3 initiated",
                "node_id": "transform-001"
            },
            {
                "log_file": "transform-001-pod-7f8g9h.log",
                "trace_id": "8b9f4c3d-2e5f-5g0b-9d3c-4f6g7a8c9d0e",
                "timestamp": (base_time - timedelta(minutes=29)).isoformat(),
                "error_message": "Processing latency increased: 145ms (baseline: 85ms)",
                "node_id": "transform-001"
            },
            {
                "log_file": "transform-001-pod-7f8g9h.log",
                "trace_id": "9c0g5d4e-3f6g-6h1c-0e4d-5g7h8b9d0f1g",
                "timestamp": (base_time - timedelta(minutes=27)).isoformat(),
                "error_message": "GC overhead detected: Old Gen collection took 2.3s, heap 89%",
                "node_id": "transform-001"
            },
            {
                "log_file": "transform-001-pod-7f8g9h.log",
                "trace_id": "1e2i7f6g-5h8i-8j3e-2g6f-7i9j0d1f2h3i",
                "timestamp": (base_time - timedelta(minutes=24)).isoformat(),
                "error_message": "SLA breach: P99 latency 342ms exceeds threshold 200ms",
                "node_id": "transform-001"
            },
            {
                "log_file": "transform-001-pod-7f8g9h.log",
                "trace_id": "0d1h6e5f-4g7h-7i2d-1f5e-6h8i9c0e1g2h",
                "timestamp": (base_time - timedelta(minutes=26)).isoformat(),
                "error_message": "Timeout processing transaction batch: exceeded 5s threshold",
                "node_id": "transform-001"
            }
        ],
        
        "affected_node": "transform-001",
        
        "root_cause": """Bad deployment v1.3 introduced memory-intensive data enrichment operations 
        without sufficient container memory allocation. Combined with 23% larger payload sizes, this 
        triggered frequent garbage collection pauses (2.3s average, 89% heap usage), causing latency 
        spikes and timeout errors.""",
        
        "financial_impact": {
            "estimated_loss_usd": 4200.0,
            "affected_transactions": 12487,
            "customer_complaints": 3
        },
        
        "corrective_measures": [
            "Immediate rollback to v1.2 to restore service",
            "Increase container memory allocation from 2GB to 4GB",
            "Add memory profiling to pre-deployment testing",
            "Implement gradual rollout (canary deployment) for future releases",
            "Add heap usage monitoring with alerts at 70% threshold",
            "Review and optimize data enrichment operations for memory efficiency",
            "Implement circuit breaker to prevent cascading failures"
        ]
    }


def get_diagnostic_data():
    """
    Get complete diagnostic data with just pipeline topology and RCA output.
    This is the main function that returns the input structure for report generation.
    """
    return {
        "pipeline_topology": get_pipeline_topology(),
        "rca_output": get_rca_output_critical()
    }
