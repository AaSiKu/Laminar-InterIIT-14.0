from fastapi import APIRouter, Depends, HTTPException, Request, status, Response
from bson.objectid import ObjectId
from backend.api.routers.auth.routes import get_current_user
from backend.api.routers.auth.models import User
from datetime import datetime
from .schema import Version
import logging
from .schema import Version, Graph,Notification, save_graph_payload, _retrieve_payload, _retrieve_version_payload
from motor.motor_asyncio import AsyncIOMotorClient
import os
from .crud import create_pipeline as _create_pipeline
from typing import Any

logger = logging.getLogger(__name__)
router = APIRouter()

mongo_client = AsyncIOMotorClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = mongo_client[os.getenv("MONGO_DB", "pathway_db")]
version_collection = db[os.getenv("VERSION_COLLECTION", "versions")]
workflow_collection = db[os.getenv("WORKFLOW_COLLECTION", "workflows")]

@router.post("/save")
async def save_graph(
    payload: save_graph_payload,
    current_user: User = Depends(get_current_user)
):
    """
    Saves a version to the database
    """
    data=payload.data
    current_version_id=payload.current_version_id
    pipeline_id=payload.pipeline_id
    try:
        user_identifier = str(current_user.id)
        existing = await version_collection.find_one({
            '_id': ObjectId(current_version_id)
        })
        print(f"user_identifier: {user_identifier}", flush=True)
        print(f"Existing version found: {existing is not None}", flush=True)

        if existing:
            # Pipeline exists - update it
            try:
                result = await version_collection.update_one(
                    {'_id': ObjectId(current_version_id)},
                    {
                        '$set': {
                             
                            "version_description": data.version_description,
                            "version_updated_at": datetime.now(),
                            "pipeline": data.pipeline,
                        }
                    }
                )
            except Exception as e:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating version: {e}")
            
            try:
                new_version = await version_collection.insert_one(
                    {
                        "user_id": user_identifier,
                         
                        "version_description": data.version_description,
                        "version_created_at": datetime.now(),
                        "version_updated_at": datetime.now(),
                        "pipeline": data.pipeline,
                    }
                )
            except Exception as e:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error making new version: {e}")
            try:
                workflow_collection.update_one(
                    {'_id': ObjectId(pipeline_id)},
                    {
                        '$set': {
                            "version_id": str(new_version.inserted_id),
                        },
                        "$push": {
                            "versions": str(new_version.inserted_id)
                        }
                    }
                ),

            except Exception as e:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating pipeline: {e}")
            
            print(f"Updated pipeline: {pipeline_id}, matched: {result.matched_count}, modified: {result.modified_count}", flush=True)
            
            return {
                "message": "Updated successfully",
                "id": str(new_version.inserted_id),
                "user_id": user_identifier
            }
        else:
            raise HTTPException(status_code=404, detail="Version not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/create_pipeline")
async def create_pipeline(
    current_user: User = Depends(get_current_user)
):
    """
    Create a new pipeline
    """
    try:
        print(f"current_user: {current_user}", flush=True)
        user_identifier = str(current_user.id)
        print(f"user_identifier: {user_identifier}", flush=True)
        new_pipeline_id = await _create_pipeline(user_identifier,version_collection,workflow_collection)
        print(f"new_pipeline_id: {new_pipeline_id}", flush=True)
        return {
            "message": "Pipeline created successfully",
            "id": str(new_pipeline_id["_id"]),
            "user_id": user_identifier,
            "version_id": new_pipeline_id["version_id"]
        }
    except Exception as e:
        logger.error(f"Create pipeline error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/retrieve_pipeline")
async def retrieve(
    payload: _retrieve_payload,
    current_user: User = Depends(get_current_user)
):
    
    """
    
    Retrieve a pipeline from the database
    """
    pipeline_id = payload.pipeline_id
    try:
        user_identifier = str(current_user.id)

        result = await workflow_collection.find_one({
            '_id': ObjectId(pipeline_id),
            'user_id': user_identifier
        })
        if not result:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        version_id = result['version_id']  # <-- FIXED

        version = await version_collection.find_one({'_id': ObjectId(version_id)})
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        result['pipeline'] = version['pipeline']

        return {
            "message": "Pipeline data retrieved successfully",
            "pipeline": str(result),
            "version": str(version)
        }

    except Exception as e:
        logger.error(f"Retrieve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save_draft")
async def save_draft(
    payload: Version,
    current_user: User = Depends(get_current_user)
):
    """
    save the draft to the database
    """
    try: 
        current_version_id = payload.version_id
        user_identifier = str(current_user.id)
        result = await version_collection.update_one(
            {'_id': ObjectId(current_version_id),
            'user_id': user_identifier},
            {
                '$set': {
                    "version_description": payload.version_description,
                    "version_updated_at": datetime.now(),
                    "pipeline": payload.pipeline,
                }
            })

        return {
                "message": "Draft saved successfully",
                "id": current_version_id,
                "user_id": user_identifier,
                "version": str(result)
            }
    except Exception as e:
        logger.error(f"Error updating version: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) 
    
@router.post("/delete_pipeline")
async def delete_pipeline(


    payload: _retrieve_payload,
    current_user: User = Depends(get_current_user)
):
    
    """
    Delete a pipeline from the database
    """
    pipeline_id = payload.pipeline_id
    try:
        user_identifier = str(current_user.id)

        pipeline=await workflow_collection.find_one({
            '_id': ObjectId(pipeline_id),
            'user_id': user_identifier
        })
        if not pipeline:
            raise HTTPException(status_code=404, detail="Pipeline not found or not authorized")
         
        for version_id in pipeline.get('versions', []):
            await version_collection.delete_one({'_id': ObjectId(version_id)})

        result = await workflow_collection.delete_one({
            '_id': ObjectId(pipeline_id),
            'user_id': user_identifier
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Pipeline not found or not authorized")

        return {
            "message": "Pipeline deleted successfully",
            "pipeline_id": pipeline_id
        }

    except Exception as e:
        logger.error(f"Delete pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/delete_draft")
async def delete_draft(
    payload: _retrieve_payload,
    current_user: User = Depends(get_current_user)
):
    
    """
    returns the previous version of the pipeline before the draft and saves it to the new draft"""
    try:
        user_identifier =str(current_user["_id"])
        pipeline_id = payload.pipeline_id

        pipeline=await workflow_collection.find_one({
            '_id': ObjectId(pipeline_id),
            'user_id': user_identifier
        })
        if not pipeline:
            raise HTTPException(status_code=404, detail="Pipeline not found or not authorized") 
        current_version_id = pipeline['version_id'] 
        previous_version_id= pipeline["versions"][1]
        previous_version = await version_collection.find_one({
            '_id': ObjectId(previous_version_id)
        })
        if not previous_version:
            raise HTTPException(status_code=404, detail="Previous version not found")
        version = await version_collection.update_one({
            '_id': ObjectId(current_version_id)},
            {
                '$set': {
                    "version_description": "",
                    "version_updated_at": datetime.now(),
                    "pipeline": previous_version["pipeline"],
                }
            }
            )
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")    
    
    except Exception as e:
        logger.error(f"Error deleting draft: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    

@router.post("/retrieve_version_pipeline")
async def retrieve_version_pipeline(
    payload: _retrieve_version_payload,
    current_user: User = Depends(get_current_user)):
    
    """
    Retrieve a specific version of a pipeline from the database
    """
    pipeline_id = payload.pipeline_id
    version_id=payload.version_id
    try:
        user_identifier = str(current_user.id)

        result = await workflow_collection.find_one({
            '_id': ObjectId(pipeline_id),
            'user_id': user_identifier
        })
        if not result:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        version = await version_collection.find_one({'_id': ObjectId(version_id)})
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        result['pipeline'] = version['pipeline']

        return {
            "message": "Pipeline data retrieved successfully",
            "pipeline": str(result)
        }

    except Exception as e:
        logger.error(f"Retrieve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))