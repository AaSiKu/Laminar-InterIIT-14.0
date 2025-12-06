from datetime import datetime
import random
from fastapi import APIRouter, Request
from .version_manager.routes import serialize_mongo
from .version_manager.schema import Notification, Log
from lib.notifications import add_notification as add_notification_util


router = APIRouter()


@router.post("/test_rca_event")
async def test_rca_event(
    request: Request,
    pipeline_id: str = None
):
    '''
    Test endpoint to create a sample RCA event for testing purposes.
    If pipeline_id is not provided, creates a test event with a dummy pipeline_id.
    '''
    rca_collection = request.app.state.rca_collection
    workflow_collection = request.app.state.workflow_collection

    # If no pipeline_id provided, try to get the first available workflow
    if not pipeline_id:
        first_workflow = await workflow_collection.find_one()
        if first_workflow:
            pipeline_id = str(first_workflow["_id"])
        else:
            pipeline_id = "test_pipeline_id"

    # Create a test RCA event
    test_rca_data = {
        "pipeline_id": pipeline_id,
        "title": f"Test RCA Event - {random.randint(1000, 9999)}",
        "description": "This is a test RCA event created for testing purposes.",
        "triggered_at": datetime.now(),
        "trace_ids": [f"trace_{random.randint(100, 999)}", f"trace_{random.randint(100, 999)}"],
        "metadata": {
            "test": True,
            "source": "test_endpoint",
            "severity": random.choice(["low", "medium", "high", "critical"]),
            "status": "in_progress"
        }
    }

    result = await rca_collection.insert_one(test_rca_data)

    return serialize_mongo({
        "status": "success",
        "message": "Test RCA event created successfully",
        "inserted_id": str(result.inserted_id),
        "inserted_data": test_rca_data,
        "note": "Slack notification will be sent via change stream watcher"
    })


@router.post("/test_notification")
async def test_notification(
    request: Request,
    pipeline_id: str = None,
    notification_type: str = None
):
    '''
    Test endpoint to create a sample notification for WebSocket testing.
    
    Parameters:
    - pipeline_id: Optional. If not provided, uses first available workflow.
    - notification_type: Optional. One of: success, error, warning, info, alert
    
    This will:
    1. Insert notification into MongoDB
    2. Trigger change stream
    3. Broadcast via WebSocket to all connected clients
    '''
    notification_collection = request.app.state.notification_collection
    workflow_collection = request.app.state.workflow_collection
    
    # Get pipeline_id
    if not pipeline_id:
        first_workflow = await workflow_collection.find_one()
        if first_workflow:
            pipeline_id = str(first_workflow["_id"])
        else:
            pipeline_id = "test_pipeline_id"
    
    # Random notification types and messages
    types = ["success", "error", "warning", "info"]
    selected_type = notification_type if notification_type in types else random.choice(types)
    
    messages = {
        "success": [
            "Pipeline completed successfully",
            "Data sync completed",
            "Backup created successfully",
            "Node configuration saved"
        ],
        "error": [
            "Pipeline execution failed",
            "Connection timeout",
            "Data validation error",
            "Node crashed unexpectedly"
        ],
        "warning": [
            "High memory usage detected",
            "Slow query performance",
            "Rate limit approaching",
            "Disk space running low"
        ],
        "info": [
            "New data received",
            "Processing started",
            "Scheduled maintenance upcoming",
            "System update available"
        ]
    }
    
    title = random.choice(messages[selected_type])
    
    notification_data = {
        "pipeline_id": pipeline_id,
        "title": title,
        "desc": f"Test notification: {title}. Random ID: {random.randint(1000, 9999)}",
        "type": selected_type,
        "timestamp": datetime.now()
    }
    
    result = await notification_collection.insert_one(notification_data)
    
    return serialize_mongo({
        "status": "success",
        "message": f"Test {selected_type} notification created",
        "inserted_id": str(result.inserted_id),
        "inserted_data": notification_data,
        "websocket_broadcast": "Change stream will broadcast automatically"
    })


@router.post("/test_alert")
async def test_alert(
    request: Request,
    pipeline_id: str = None
):
    '''
    Test endpoint to create a sample ALERT (actionable notification) for WebSocket testing.
    
    Alerts are special notifications with:
    - type = "alert"
    - alert object containing actions and status
    
    This will trigger WebSocket broadcast and show in the pending actions panel.
    '''
    notification_collection = request.app.state.notification_collection
    workflow_collection = request.app.state.workflow_collection
    
    # Get pipeline_id
    if not pipeline_id:
        first_workflow = await workflow_collection.find_one()
        if first_workflow:
            pipeline_id = str(first_workflow["_id"])
        else:
            pipeline_id = "test_pipeline_id"
    
    # Random alert scenarios
    alert_scenarios = [
        {
            "title": "High Latency Detected",
            "desc": "Pipeline processing time exceeded threshold",
            "actions": ["Scale Up Resources", "Ignore", "Investigate"]
        },
        {
            "title": "Data Quality Issue",
            "desc": "Missing values detected in incoming data stream",
            "actions": ["Retry", "Skip Bad Records", "Pause Pipeline"]
        },
        {
            "title": "Memory Threshold Exceeded",
            "desc": "Container memory usage at 90%",
            "actions": ["Restart Container", "Scale Horizontally", "Ignore"]
        },
        {
            "title": "Failed Authentication",
            "desc": "External API authentication failed",
            "actions": ["Refresh Token", "Use Backup Credentials", "Alert Admin"]
        },
        {
            "title": "SLA Breach Warning",
            "desc": "Pipeline may breach SLA in 15 minutes",
            "actions": ["Prioritize", "Notify Stakeholders", "Escalate"]
        }
    ]
    
    scenario = random.choice(alert_scenarios)
    
    alert_data = {
        "pipeline_id": pipeline_id,
        "title": scenario["title"],
        "desc": f"{scenario['desc']}. Test ID: {random.randint(1000, 9999)}",
        "type": "alert",
        "timestamp": datetime.now(),
        "alert": {
            "actions": scenario["actions"],
            "action_taken": None,
            "taken_at": None,
            "action_executed_by": None,
            "action_executed_by_user": None,
            "status": "pending"
        }
    }
    
    result = await notification_collection.insert_one(alert_data)
    
    return serialize_mongo({
        "status": "success",
        "message": "Test alert created",
        "inserted_id": str(result.inserted_id),
        "inserted_data": alert_data,
        "websocket_broadcast": "Change stream will broadcast automatically",
        "note": "Check 'Pending Actions' section in UI"
    })


@router.post("/test_log")
async def test_log(
    request: Request,
    pipeline_id: str = None,
    level: str = None
):
    '''
    Test endpoint to create a sample log entry for WebSocket testing.
    
    Parameters:
    - pipeline_id: Optional. If not provided, uses first available workflow.
    - level: Optional. One of: debug, info, warning, error, critical
    
    This will:
    1. Insert log into MongoDB logs collection
    2. Trigger change stream
    3. Broadcast via WebSocket with message_type="log"
    4. If level is "critical", send Slack notification
    '''
    log_collection = request.app.state.log_collection
    workflow_collection = request.app.state.workflow_collection
    
    # Get pipeline_id
    if not pipeline_id:
        first_workflow = await workflow_collection.find_one()
        if first_workflow:
            pipeline_id = str(first_workflow["_id"])
        else:
            pipeline_id = "test_pipeline_id"
    
    # Log levels and messages
    levels = ["debug", "info", "warning", "error", "critical"]
    selected_level = level if level in levels else random.choice(levels)
    
    log_messages = {
        "debug": [
            "Processing batch of 1000 records",
            "Cache hit ratio: 95%",
            "Query execution time: 45ms",
            "Connection pool status: 8/10 active"
        ],
        "info": [
            "Pipeline started successfully",
            "Data ingestion completed",
            "New node added to workflow",
            "Configuration reloaded"
        ],
        "warning": [
            "Retrying failed operation (attempt 2/3)",
            "Response time degraded",
            "Queue depth increasing",
            "Token expires in 1 hour"
        ],
        "error": [
            "Failed to connect to database",
            "Invalid data format received",
            "Node execution timeout",
            "API rate limit exceeded"
        ],
        "critical": [
            "System out of memory",
            "Database connection lost",
            "Pipeline crash detected",
            "Data corruption detected"
        ]
    }
    
    sources = ["pipeline", "agent", "system", "node", "scheduler"]
    
    message = random.choice(log_messages[selected_level])
    
    log_data = {
        "pipeline_id": pipeline_id,
        "level": selected_level,
        "message": f"{message} [Test ID: {random.randint(1000, 9999)}]",
        "details": {
            "test": True,
            "random_metric": random.randint(1, 100),
            "node_id": f"node_{random.randint(1, 10)}"
        },
        "timestamp": datetime.now(),
        "source": random.choice(sources)
    }
    
    result = await log_collection.insert_one(log_data)
    
    return serialize_mongo({
        "status": "success",
        "message": f"Test {selected_level} log created",
        "inserted_id": str(result.inserted_id),
        "inserted_data": log_data,
        "websocket_broadcast": "Change stream will broadcast with message_type='log'",
        "slack_notification": "Will be sent if level is 'critical'"
    })


@router.post("/test_all")
async def test_all(
    request: Request,
    pipeline_id: str = None
):
    '''
    Test endpoint to create one of each: notification, alert, and log.
    Useful for testing the complete WebSocket flow at once.
    '''
    notification_collection = request.app.state.notification_collection
    log_collection = request.app.state.log_collection
    workflow_collection = request.app.state.workflow_collection
    
    # Get pipeline_id
    if not pipeline_id:
        first_workflow = await workflow_collection.find_one()
        if first_workflow:
            pipeline_id = str(first_workflow["_id"])
        else:
            pipeline_id = "test_pipeline_id"
    
    results = []
    
    # 1. Create a notification
    notification_data = {
        "pipeline_id": pipeline_id,
        "title": "Test Notification",
        "desc": f"Bulk test notification. ID: {random.randint(1000, 9999)}",
        "type": random.choice(["success", "info", "warning"]),
        "timestamp": datetime.now()
    }
    notif_result = await notification_collection.insert_one(notification_data)
    results.append({"type": "notification", "id": str(notif_result.inserted_id)})
    
    # 2. Create an alert
    alert_data = {
        "pipeline_id": pipeline_id,
        "title": "Test Alert - Action Required",
        "desc": f"Bulk test alert. ID: {random.randint(1000, 9999)}",
        "type": "alert",
        "timestamp": datetime.now(),
        "alert": {
            "actions": ["Approve", "Reject", "Investigate"],
            "status": "pending"
        }
    }
    alert_result = await notification_collection.insert_one(alert_data)
    results.append({"type": "alert", "id": str(alert_result.inserted_id)})
    
    # 3. Create a log
    log_data = {
        "pipeline_id": pipeline_id,
        "level": random.choice(["info", "warning", "error"]),
        "message": f"Bulk test log entry. ID: {random.randint(1000, 9999)}",
        "details": {"test": True, "bulk": True},
        "timestamp": datetime.now(),
        "source": "test"
    }
    log_result = await log_collection.insert_one(log_data)
    results.append({"type": "log", "id": str(log_result.inserted_id)})
    
    return serialize_mongo({
        "status": "success",
        "message": "Created 1 notification, 1 alert, and 1 log",
        "pipeline_id": pipeline_id,
        "results": results,
        "websocket_note": "All items will be broadcast via WebSocket change streams"
    })


@router.post("/test_critical_log")
async def test_critical_log(
    request: Request,
    pipeline_id: str = None
):
    '''
    Test endpoint to specifically test critical log with Slack notification.
    '''
    log_collection = request.app.state.log_collection
    workflow_collection = request.app.state.workflow_collection
    
    # Get pipeline_id
    if not pipeline_id:
        first_workflow = await workflow_collection.find_one()
        if first_workflow:
            pipeline_id = str(first_workflow["_id"])
        else:
            pipeline_id = "test_pipeline_id"
    
    log_data = {
        "pipeline_id": pipeline_id,
        "level": "critical",
        "message": f"CRITICAL: System failure detected [Test ID: {random.randint(1000, 9999)}]",
        "details": {
            "test": True,
            "error_code": "CRITICAL_001",
            "affected_component": "main_pipeline"
        },
        "timestamp": datetime.now(),
        "source": "test_critical"
    }
    
    result = await log_collection.insert_one(log_data)
    
    return serialize_mongo({
        "status": "success",
        "message": "Test critical log created",
        "inserted_id": str(result.inserted_id),
        "inserted_data": log_data,
        "slack_notification": "Will be sent via change stream watcher"
    })


@router.post("/add_notification")
async def add_notification(
    data: Notification, 
    request: Request
):
    '''
    Route to add a notification.
    Can be called by agents or the pipeline.
    The change stream watcher will automatically broadcast via WebSocket.
    '''
    notification_collection = request.app.state.notification_collection

    # Convert to dict and use the utility function
    notification_data = data.model_dump()
    return await add_notification_util(notification_data, notification_collection)

@router.post("/add_log")
async def add_log(
    data: Log,
    request: Request
):
    '''
    Route to add a log entry.
    Can be called by agents or the pipeline.
    The change stream watcher will automatically broadcast via WebSocket.
    Critical logs will trigger Slack notifications.
    '''
    log_collection = request.app.state.log_collection

    # Convert to dict and ensure timestamp is set
    log_data = data.model_dump()
    if "timestamp" not in log_data or not log_data["timestamp"]:
        log_data["timestamp"] = datetime.now()

    # Insert log into database
    # The watch_logs change stream will automatically broadcast it via WebSocket
    # Critical logs will trigger Slack notifications via the watcher
    result = await log_collection.insert_one(log_data)

    return serialize_mongo({
        "status": "success",
        "inserted_id": str(result.inserted_id),
        "inserted_data": log_data
    })
