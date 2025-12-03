from typing import List, Optional
from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel, Field
from datetime import datetime
from backend.api.routers.auth.models import User
from backend.api.routers.auth.routes import get_current_user

router = APIRouter()

class Action(BaseModel):
    apiKey: str
    apiValue: str
    correctiveMeasureMode: str
    correctiveMeasures: str
    errorDescription: str
    name: str
    userConfirmation: bool

@router.post("/add_action")
async def add_action(data: Action, request: Request, current_user: User = Depends(get_current_user)):
    print(data)
    data_dict = data.model_dump()
    data_dict["user_id"] = current_user.id
    action_collection = request.app.state.action_collection
    await action_collection.insert_one(data_dict)
    return {
        "status": "success",
        "message": "action added successfully"
    }
@router.get("/get_actions")
async def get_action(request: Request, current_user: User = Depends(get_current_user)):
    print(current_user.id)
    action_collection = request.app.state.action_collection
    actions = await action_collection.find({"user_id": current_user.id}).to_list(length=None)
    print(actions)
    return {
        "status": "success",
        "actions": actions
    }


    
