import asyncio
from fastapi import APIRouter, Request
from pydantic import BaseModel
from bson.json_util import dumps

router = APIRouter()

active_connections = set()
@router.get("/kpi")
async def fetch_kpi(request: Request):
    # send a request to mongodb pipelines collection and get all pipelines associated with userid
    # total: display all pipelines
    # running: those with status=true
    # broken: those with status=false
    
    workflow_collection = request.app.state.workflow_collection
    cursor = workflow_collection.find({"user":"TODO: later save from the auth token extraction"})
    all_pipelines = await cursor.to_list(length=None)
    running = []
    for pipeline in all_pipelines:
        if pipeline["status"] is True:
            running.append(pipeline["_id"])
    KPI = {
        "total": [str(item["_id"]) for item in all_pipelines],
        "running": [str(item["_id"]) for item in all_pipelines if item.get("status") is True],
        "broken": [str(item["_id"]) for item in all_pipelines if item.get("status") is False],
    }

    KPI_stats= {
        "total": len(KPI["total"]),
        "running": len(KPI["running"]),
        "broken": len(KPI["broken"])
    }
    return KPI_stats
   

class Notification(BaseModel):
  title: str
  desc: str
  action: str

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