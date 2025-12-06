from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException, status
from pydantic import BaseModel, Field
from datetime import datetime
from backend.api.routers.auth.models import User
from backend.api.routers.auth.routes import get_current_user
from bson.objectid import ObjectId
import docker
import httpx


router = APIRouter()
class ManualActionRequest(BaseModel):
    """Request to add action manually"""
    action_id: str = Field(..., description="Unique action identifier")
    service: str = Field(..., description="Service name")
    method: str = Field(..., description="Execution method (rpc, script, api, k8s, command)")
    definition: str = Field(..., description="Action description")
    risk_level: str = Field(..., description="Risk level (high, medium, low)")
    requires_approval: bool = Field(False, description="Whether action requires approval")
    execution: Dict[str, Any] = Field(default_factory=dict, description="Execution configuration")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action parameters")
    secrets: List[str] = Field(default_factory=list, description="Secret parameter names")


@router.post("/{pipelineId}/{path:path}")
async def run_pipeline_endpoint(request_obj: Request, path: str, pipelineId: str, current_user: User= Depends(get_current_user), data: ManualActionRequest = None):

    client = request_obj.app.state.docker_client
    workflow_collection = request_obj.app.state.workflow_collection
    current_user_id= current_user.id
    workflow = await workflow_collection.find_one({'_id': ObjectId(pipelineId)})

    if not workflow or not workflow.get('pipeline_host_port') or not workflow.get("host_ip"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found or not spinned up")
    if current_user_id not in workflow.get('owner_ids', []) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to run this workflow")

    port = workflow['pipeline_host_port']
    ip = workflow['host_ip']
    url = f"http://{ip}:{port}/{path}"
    print(url)
    print("data:---------------")
    print(data.model_dump())

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=data.model_dump())
            print("Response:", response)
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to trigger pipeline: {exc}")




@router.delete("/{pipelineId}/{path:path}")
async def run_pipeline_endpoint(request_obj: Request, path: str, pipelineId: str, current_user: User= Depends(get_current_user), data: ManualActionRequest = None):

    client = request_obj.app.state.docker_client
    workflow_collection = request_obj.app.state.workflow_collection
    current_user_id= current_user.id
    workflow = await workflow_collection.find_one({'_id': ObjectId(pipelineId)})

    if not workflow or not workflow.get('pipeline_host_port') or not workflow.get("host_ip"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found or not spinned up")
    if current_user_id not in workflow.get('owner_ids', []) and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to run this workflow")

    port = workflow['pipeline_host_port']
    ip = workflow['host_ip']
    url = f"http://{ip}:{port}/{path}"
    print(url)
    print("data:---------------")
    print(data.model_dump())

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=data.model_dump())
            print("Response:", response)
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to trigger pipeline: {exc}")