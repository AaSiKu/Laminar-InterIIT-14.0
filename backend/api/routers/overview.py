from typing import List, Optional
from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel, Field
from datetime import datetime
from backend.api.routers.auth.models import User
from backend.api.routers.auth.routes import get_current_user

router = APIRouter()

class Alert(BaseModel):
    actions: List[str]
    action_taken: Optional[str] = None
    taken_at: Optional[datetime] = None

class Notification(BaseModel):
    title: str
    desc: str
    action: str
    alert: Optional[Alert] = None
    type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: str

@router.get("/kpi")
async def fetch_kpi(request: Request, current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    workflow_collection = request.app.state.workflow_collection
    notification_collection = request.app.state.notification_collection

    # Workflow stats
    workflows = await workflow_collection.find({"user_id": user_id}).to_list(length=None)
    total_workflows = len(workflows)
    running_workflows = sum(1 for w in workflows if w["status"] == "Running")
    stopped_workflows = sum(1 for w in workflows if w["status"] == "Stopped")
    broken_workflows = total_workflows - running_workflows - stopped_workflows

    # Notification and Alert stats
    notifications = await notification_collection.find({"user_id": user_id}).to_list(length=None)
    total_notifications = len(notifications)
    
    alerts = [n for n in notifications if n.get("type") == "alert"]
    total_alerts = len(alerts)
    
    pending_alerts = sum(1 for a in alerts if a.get("alert") and not a["alert"].get("action_taken"))

    # TODO: Implement a real metric for total_runtime
    total_runtime_dummy = 128  # Using a dummy value for now

    return {
        "pie_chart": {
            "total": total_workflows,
            "running": running_workflows,
            "stopped": stopped_workflows,
            "broken": broken_workflows
        },
        "kpi": [
            {
                "id": "total_runtime",
                "title": "Total Runtime",
                "value": f"{total_runtime_dummy}h",
                "subtitle": "Across all pipelines",
                "iconType": "speed",
                "iconColor": "#86C8BC"
            },
            {
                "id": "total_alerts",
                "title": "Total Alerts",
                "value": total_alerts,
                "subtitle": "In the last 24h",
                "iconType": "error-outline",
                "iconColor": "#F0B4C4"
            },
            {
                "id": "pending_alerts",
                "title": "Pending Alerts",
                "value": pending_alerts,
                "subtitle": "Require attention",
                "iconType": "access-time",
                "iconColor": "#F4D4A2"
            },
            {
                "id": "notifications",
                "title": "Notifications",
                "value": total_notifications,
                "subtitle": "Total notifications",
                "iconType": "timeline",
                "iconColor": "#A2B8F4"
            }
        ]
    }

@router.post("/add_notification")
async def add_notification(data: Notification, request: Request):
    '''
    Route to add a notification 
    Would be called by an agent
    '''
    notification_collection = request.app.state.notification_collection
    result = await notification_collection.insert_one(data.model_dump())

    return {
        "status": "success",
        "inserted_id": str(result.inserted_id),
        "inserted_data": data.model_dump()
    }
    
@router.get("/workflows/")
async def workflow_data(request: Request, skip: int = 0, limit: int = 10, current_user: User = Depends(get_current_user)):
    cursor = request.app.state.workflow_collection.find({"user": str(current_user.id)}).sort("last_updated", -1).skip(skip).limit(limit)
    recent_pipelines = await cursor.to_list(length=limit)
    data = []
    for pipeline in recent_pipelines:
        data.append({
            "id": str(pipeline["_id"]), "lastModified": str(pipeline["last_updated"])
        })
    return data

@router.get("/total_runtime")
async def total_runtime(request: Request, skip: int = 0, limit: int = 10, current_user: User = Depends(get_current_user)):
    cursor = request.app.state.workflow_collection.find({"user_id": str(current_user.id)})
    total_runtime = 0
    print(str(current_user.id))
    async for doc in cursor:
        print(doc)
        try:
            total_runtime += doc["runtime"]
        except:
            pass
    return total_runtime


# async def total_runtime(request: Request, skip: int = 0, limit: int = 10):
#     cursor = request.app.state.workflow_collection.find({"user_id": ""})
#     total_runtime = 0
#     async for doc in cursor:
#         print(doc)
#         try:
#             total_runtime += doc["runtime"]
#         except:
#             pass
#     return total_runtime//3600