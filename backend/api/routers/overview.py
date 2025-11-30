from fastapi import APIRouter, Request, Depends
from .version_manager.schema import Notification
from bson.json_util import dumps
from backend.api.routers.auth.routes import get_current_user
from backend.api.routers.auth.models import User
router = APIRouter()

active_connections = set()
@router.get("/kpi")
async def fetch_kpi(request: Request, current_user: User = Depends(get_current_user)):
    # send a request to mongodb pipelines collection and get all pipelines associated with userid
    # total: display all pipelines
    # running: those with status="Running"
    # broken: those with status="Broken"
    user_identifier = str(current_user.id)
    workflow_collection = request.app.state.workflow_collection
    cursor = workflow_collection.find({"user_id": user_identifier})
    all_pipelines = await cursor.to_list(length=None)
    running = []
    for pipeline in all_pipelines:
        if pipeline["status"] is "Running":
            running.append(pipeline["_id"])
    KPI = {
        "total": [str(item["_id"]) for item in all_pipelines],
        "running": [str(item["_id"]) for item in all_pipelines if item.get("status") is "Running"],
        "broken": [str(item["_id"]) for item in all_pipelines if item.get("status") is "Broken"],
    }

    KPI_stats= {
        "total": len(KPI["total"]),
        "running": len(KPI["running"]),
        "broken": len(KPI["broken"])
    }
    return KPI_stats
   

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