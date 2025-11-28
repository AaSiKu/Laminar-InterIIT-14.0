import socket
from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from bson.objectid import ObjectId
import docker
import httpx
import logging
from fastapi import Request


logger = logging.getLogger(__name__)
from backend.api.dockerScript import (
    run_pipeline_container, stop_docker_container
)
router = APIRouter()


class PipelineIdRequest(BaseModel):
    pipeline_id: str
    
@router.post("/spinup")
async def docker_spinup(request_obj: Request,request: PipelineIdRequest):
    """
    Spins up a container from the 'pathway_pipeline' image.
    - Expects JSON: `{"pipeline_id": "..."`}
    - Returns the dynamically assigned host port.
    """
    client = request_obj.app.state.docker_client
    workflow_collection = request_obj.app.state.workflow_collection

    if not client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Docker client not available")

    try:
        result = run_pipeline_container(client, request.pipeline_id)
        # A trick to get the primary outbound IP address of the machine by connecting to a public DNS server.
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        host_ip = s.getsockname()[0]
        s.close()
        # Save the results of the container
        await workflow_collection.update_one(
            {'_id': ObjectId(request.pipeline_id)},
            {
                '$set':{
                    'container_id': result['pipeline_container_id'],
                    'pipeline_host_port': result['pipeline_host_port'],
                    'agentic_host_port': result['agentic_host_port'],
                    'db_host_port': result['db_host_port'],
                    'host_ip': host_ip,
                    'status': False, # the status is of pipeline, it will be toggled from the docker container
                }
            }
        )
        return JSONResponse(result, status_code=status.HTTP_201_CREATED)
    except docker.errors.ImageNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as exc:
        logger.error(f"Spinup failed for '{request.pipeline_id}': {exc}")
        return JSONResponse({"error": str(exc)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@router.post("/spindown")
async def docker_spindown(request_obj: Request, request: PipelineIdRequest):
    """
    Stops and removes the container identified by its name (pipeline_id).
    - Expects JSON: `{"pipeline_id": "..."}`
    """
    client = request_obj.app.state.docker_client
    workflow_collection = request_obj.app.state.workflow_collection
    if not client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Docker client not available")

    try:
        result = stop_docker_container(client, request.pipeline_id)
        await workflow_collection.update_one(
                {'_id': ObjectId(request.pipeline_id)},
                {
                    '$set':{
                        'container_id': "",
                        'host_port': "",
                        'host_ip': "",
                        'status': False,
                    }
                }
        )
        return JSONResponse(result, status_code=status.HTTP_200_OK)
    except docker.errors.NotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Container '{request.pipeline_id}' not found")
    except Exception as exc:
        logger.error(f"Spindown failed for '{request.pipeline_id}': {exc}")
        return JSONResponse({"error": str(exc)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@router.post("/run")
async def run_pipeline_endpoint(request_obj: Request, request: PipelineIdRequest):
    """
    Triggers a pipeline to run in its container.
    """

    client = request_obj.app.state.docker_client
    workflow_collection = request_obj.app.state.workflow_collection
    pipeline = await workflow_collection.find_one({'_id': ObjectId(request.pipeline_id)})
    if not pipeline or not pipeline.get('pipeline_host_port'):
        raise HTTPException(status_code=404, detail="Pipeline not found or not running")

    port = pipeline['pipeline_host_port']
    ip = pipeline['host_ip']
    url = f"http://{ip}:{port}/trigger"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url)
            response.raise_for_status()
            await workflow_collection.update_one(
                {'_id': ObjectId(request.pipeline_id)},
                {'$set': {'status': True}}
            )
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to trigger pipeline: {exc}")

@router.post("/stop")
async def stop_pipeline_endpoint(request_obj: Request, request: PipelineIdRequest):
    """
    Stops a running pipeline in its container.
    """
    client = request_obj.app.state.docker_client
    workflow_collection = request_obj.app.state.workflow_collection
    pipeline = await workflow_collection.find_one({'_id': ObjectId(request.pipeline_id)})
    if not pipeline or not pipeline.get('pipeline_host_port'):
        raise HTTPException(status_code=404, detail="Pipeline not found or not running")

    port = pipeline['pipeline_host_port']
    ip = pipeline['host_ip']
    url = f"http://{ip}:{port}/stop"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url)
            response.raise_for_status()
            await workflow_collection.update_one(
                {'_id': ObjectId(request.pipeline_id)},
                {'$set': {'status': False}}
            )
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to stop pipeline: {exc}")

