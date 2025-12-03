from fastapi import APIRouter, Request, Depends, HTTPException
from .version_manager.schema import Notification, UpdateNotificationAction
from datetime import datetime
from bson.objectid import ObjectId
from backend.api.routers.auth.models import User
from backend.api.routers.auth.routes import get_current_user
from backend.api.routers.auth.database import get_db
from backend.api.routers.auth import crud as auth_crud
from sqlalchemy.ext.asyncio import AsyncSession
from .version_manager.routes import serialize_mongo

router = APIRouter()


@router.get("/kpi")
async def fetch_kpi(request: Request, current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    workflow_collection = request.app.state.workflow_collection
    notification_collection = request.app.state.notification_collection
    query={}
    if current_user.role!="admin":
        query={"owner_ids": user_id}
    workflows = await workflow_collection.find(query).to_list(length=None)

    # Workflow stats
    total_workflows = len(workflows)
    running_workflows = sum(1 for w in workflows if w["status"] == "Running")
    stopped_workflows = sum(1 for w in workflows if w["status"] == "Stopped")
    broken_workflows = total_workflows - running_workflows - stopped_workflows

    user_role = current_user.role
    queries = [{"pipeline_id":str(pipeline["_id"])} for pipeline in workflows]

    notifications =[]
    if queries != []:
        notifications = await notification_collection.find({"$or":queries}).to_list(length=None)
    total_notifications = len(notifications)
    total_runtime = sum(w.get("runtime", 0) for w in workflows if w is not None)
    
    alerts = [n for n in notifications if n.get("type") == "alert"]
    total_alerts = len(alerts)
    
    pending_alerts = sum(1 for a in alerts if a.get("alert") and not a["alert"].get("action_taken"))
    seconds = total_runtime
    result=0

    if seconds >= 86400:
        result = f"{seconds // 86400}d"
    elif seconds >= 3600:
        result = f"{seconds // 3600}h"
    elif seconds >= 60:
        result = f"{seconds // 60}m"
    else:
        result = f"{seconds}s"

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
                "value": result,
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

    return (
        serialize_mongo({
        "status": "success",
        "inserted_id": str(result.inserted_id),
        "inserted_data": data.model_dump()})
    )
    
@router.get("/workflows/")
async def workflow_data(request: Request, skip: int = 0, limit: int = 10, current_user: User = Depends(get_current_user)):
    cursor = request.app.state.workflow_collection.find({"owner_ids": str(current_user.id)}).sort("last_updated", -1).skip(skip).limit(limit)
    recent_pipelines = await cursor.to_list(length=limit)
    data = []
    for pipeline in recent_pipelines:
        data.append({
            "id": str(pipeline["_id"]), "lastModified": str(pipeline["last_updated"])
        })
    return data

@router.get("/total_runtime")
async def total_runtime(request: Request, current_user: User = Depends(get_current_user)):
    cursor = request.app.state.workflow_collection.find({"owner_ids": str(current_user.id)})
    total_runtime = 0
    async for doc in cursor:
        try:
            total_runtime += doc["runtime"]
        except:
            pass
    return total_runtime


@router.get("/notifications")
async def notification(
    request: Request, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = str(current_user.id)
    workflow_collection = request.app.state.workflow_collection
    notification_collection = request.app.state.notification_collection
    query={}
    if current_user.role!="admin":
        query={"owner_ids": user_id}
    workflows = await workflow_collection.find(query).to_list(length=None)


    queries = [{"pipeline_id":str(pipeline["_id"])} for pipeline in workflows]
    
    notifications =[]
    if queries != []:
        notifications = await notification_collection.find({"$or":queries}).to_list(length=None)
    
    
    enriched_notifications = []
    for notif in notifications:
        enriched_notif = dict(notif)
        
        if enriched_notif.get("alert") and enriched_notif["alert"].get("action_executed_by"):#finds if someone took the action
            action_user_id = enriched_notif["alert"]["action_executed_by"]
            try:
                action_user = await auth_crud.get_user_by_id(db, int(action_user_id))
                if action_user:
                    enriched_notif["action_executed_by_user"] = {
                        "id": str(action_user.id),
                        "email": action_user.email,
                        "full_name": action_user.full_name or action_user.email
                    }
            except (ValueError, Exception):
                pass
        enriched_notifications.append(enriched_notif)

    return serialize_mongo({
        "status": "success",
        "count": len(enriched_notifications),
        "data": enriched_notifications
    })


@router.patch("/notifications/{notification_id}/action")
async def update_notification_action(
    notification_id: str,
    action_data: UpdateNotificationAction,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update notification with action taken by user.
    User must have access to the notification (owner, in viewer_ids, and role in allowed_roles)
    """
    notification_collection = request.app.state.notification_collection
    workflow_collection = request.app.state.workflow_collection
    user_role = current_user.role
    is_admin = user_role.lower() == "admin"
    
    try:
        notification_obj_id = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID format")
    
    notification = await notification_collection.find_one({"_id": notification_obj_id})
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    can_take_action = False
    if is_admin:
        can_take_action = True
    elif notification.get("pipeline_id"):
        workflow = workflow_collection.find_one({"_id":notification.get("pipeline_id")})
        can_take_action = user_role in workflow.get("owner_ids", [])
    
    if not can_take_action:
        raise HTTPException(
            status_code=403, 
            detail="You don't have permission to take actions on this notification. Only admins or users with roles in allowed_roles can take actions."
        )


    #if already taken action
    if notification.get("alert").get("action_executed_by"):
        action_user = await auth_crud.get_user_by_id(db, int(notification.get("alert").get("action_executed_by")))
        raise HTTPException(
            status_code=403,
            detail=f"Action already taken {f"{f"by{action_user.email}"} or {""}"}"
        )
    
    
    update_result = await notification_collection.update_one(
        {"_id": notification_obj_id},
        {
            "$set": {
                "alert.action_taken": action_data.action_taken,
                "alert.taken_at": datetime.now(),
                "alert.action_executed_by": str(current_user.id)
            }
        }
    )
    
    # if update_result.modified_count == 0:
    #     raise HTTPException(status_code=400, detail="Failed to update notification")
    
    #TODO: backend does whatever it needs to do to take action and update the value of notifications
    return {
        "status": "success",
        "message": "Notification action updated successfully"
    }

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
