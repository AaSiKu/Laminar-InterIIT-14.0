from fastapi import APIRouter, Depends, HTTPException, Request, status, Response
from bson.objectid import ObjectId
from backend.api.routers.auth.routes import get_current_user
from backend.api.routers.auth.models import User
from datetime import datetime
import logging
from .schema import save_graph_payload, retrieve_payload,save_draft_payload
import os 
from .crud import create_pipeline as _create_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()

def serialize_mongo(doc):
    if isinstance(doc, ObjectId):
        return str(doc)

    if isinstance(doc, list):
        return [serialize_mongo(x) for x in doc]

    if isinstance(doc, dict):
        return {k: serialize_mongo(v) for k, v in doc.items()}

    return doc


#----------------------------------Create Pipeline------------------------------------#


@router.post("/create_pipeline")
async def create_pipeline(
    request:Request,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new pipeline
    """

    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client
    try:            
        user_identifier = str(current_user.id)
        new_pipeline_id = await _create_pipeline(user_identifier,version_collection,workflow_collection,mongo_client)
        return {
            "message": "Pipeline created successfully",
            "id": str(new_pipeline_id["_id"]),
            "user_id": user_identifier,
            "version_id": new_pipeline_id["version_id"]
        }
    except Exception as e:
        logger.error(f"Create pipeline error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))



#-----------------------------------   Save pipeline and Drafts     ----------------------------------------#


@router.post("/save")
async def save_graph(
    request:Request,
    payload: save_graph_payload,
    current_user: User = Depends(get_current_user)
):
    """
    Saves a version to the database
    """

    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client
    version_description=payload.version_description
    version_updated_at=payload.version_updated_at
    pipeline=payload.pipeline
    current_version_id=payload.current_version_id
    pipeline_id=payload.pipeline_id
    try:
        user_identifier = str(current_user.id)
        existing = await version_collection.find_one({
            '_id': ObjectId(current_version_id),
            "user_id":user_identifier
        })

        if existing:
            # Pipeline exists - update it
            try:
                async with await mongo_client.start_session() as session:
                    async with session.start_transaction():

                        await version_collection.update_one(
                            {'_id': ObjectId(current_version_id),
                            'user_id':user_identifier},
                            {
                                '$set': {
                                    "version_description": version_description,
                                    "version_updated_at": version_updated_at,
                                    "pipeline": pipeline,
                                }
                            },
                            session=session
                        )

                        new_version = await version_collection.insert_one(
                            {
                                "user_id": user_identifier,
                                "version_description": version_description,
                                "version_created_at": datetime.now(),
                                "version_updated_at": datetime.now(),
                                "pipeline": pipeline,
                            },
                            session=session
                        )

                        update_result = await workflow_collection.update_one(
                            {'_id': ObjectId(pipeline_id),
                            'user_id':user_identifier},
                            {   
                                '$set': {"version_id": str(new_version.inserted_id)},
                                "$push": {"versions": str(new_version.inserted_id)}
                            },
                            session=session
                        )

            except Exception as e:
                raise HTTPException(status_code=status.HTTP_404_INTERNAL_SERVER_ERROR, detail=f"Pipeline or version not found: {e}")
            
            
            return {
                "message": "Updated successfully",
                "version_id": str(new_version.inserted_id),
                "pipeline_id": str(pipeline_id),
                "user_id": user_identifier
            }
        else:
            raise HTTPException(status_code=404, detail="Version not found")
    except HTTPException as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error updating pipeline: {e}")
    except Exception as e:
        logger.error(f"Save error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating pipeline: {str(e)}"
        )

@router.post("/save_draft")
async def save_draft(
    request:Request,
    payload: save_draft_payload,
    current_user: User = Depends(get_current_user)
):
    """
    save the draft to the database
    """
    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client
    try: 
        current_version_id = payload.version_id
        pipeline=payload.pipeline
        version_description= payload.version_description
        user_identifier = str(current_user.id)

        result = await version_collection.update_one(
            {'_id': ObjectId(current_version_id),
            'user_id': user_identifier},
            {
                '$set': {
                    "version_description": version_description,
                    "version_updated_at": datetime.now(),
                    "pipeline": pipeline,
                }
            
            })
        print(result.matched_count)

        return {
                "message": "Draft saved successfully",
                "id": current_version_id,
                "user_id": user_identifier,
                "version": str(result)
            }
    except Exception as e:
        logger.error(f"Error updating version: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) 



#---------------------------------    Retrieve Pipeline and Drafts--------------------------------------#  


@router.post("/retrieve_pipeline")
async def retrieve_pipeline(
    request:Request,
    payload: retrieve_payload,
    current_user: User = Depends(get_current_user)
):
    
    """
    
    Retrieve a pipeline from the database
    """
    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client
    pipeline_id = payload.pipeline_id
    try:
        user_identifier = str(current_user.id)
        async with await mongo_client.start_session() as session:
            async with session.start_transaction():
                result = await workflow_collection.find_one(
                    {
                        '_id': ObjectId(pipeline_id),
                        'user_id': user_identifier
                    },
                session=session)
                version_id = result['version_id']

                if not result:
                    raise HTTPException(status_code=404, detail="Pipeline not found")

                version = await version_collection.find_one(
                    {'_id': ObjectId(version_id),
                    "user_id":user_identifier},
                    session=session)
                if not version:
                    raise HTTPException(status_code=404, detail="Version not found")

                result['pipeline'] = version['pipeline']

        return {
            "message": "Pipeline data retrieved successfully",
            "pipeline": serialize_mongo(result),
            "version": serialize_mongo(version)
        }

    except Exception as e:
        logger.error(f"Retrieve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

#retrieve version was redundant as retrieve pipeline uses version id and i can get the draft version from current version id and the pipeline to be used form the workflow collection



#---------------------------- Delete Pipeline and Drafts--------------------------#
@router.post("/delete_pipeline")
async def delete_pipeline(
    request:Request,
    pipeline_id: str,
    current_user: User = Depends(get_current_user)
):
    
    """
    Delete a pipeline from the database
    """
    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client

    try:
        user_identifier = str(current_user.id)

        pipeline=await workflow_collection.find_one({
            '_id': ObjectId(pipeline_id),
            'user_id': user_identifier
        })
        if not pipeline:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        if pipeline.get("container_id"):
            raise HTTPException(status_code=409, detail="Pipeline running, Stop and Spin down the pipeline to delete the pipeline")
        
        async with await mongo_client.start_session() as session:
            async with session.start_transaction(): 

                for version_id in pipeline.get('versions', []):
                    await version_collection.delete_one(    
                        {'_id': ObjectId(version_id),
                        "user_id":user_identifier},
                        session=session)

                result = await workflow_collection.delete_one({
                    '_id': ObjectId(pipeline_id),
                    'user_id': user_identifier
                }, 
                session=session)
                if result.deleted_count == 0:
                    raise HTTPException(status_code=404, detail="Pipeline not found or not authorized")

        return {
            "message": "Pipeline deleted successfully",
            "deleted pipeline_id": pipeline_id
        }

    except Exception as e:
        logger.error(f"Delete pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/delete_draft")
async def delete_draft(
    request:Request,
    pipeline_id: str,
):
    current_user: User = Depends(get_current_user)
    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client
    try:
        user_identifier = str(current_user.id)

        async with await mongo_client.start_session() as session:
            async with session.start_transaction():

                pipeline = await workflow_collection.find_one(
                    {
                        '_id': ObjectId(pipeline_id),
                        'user_id': user_identifier
                    },
                    session=session
                )
                

                if not pipeline:
                    raise HTTPException(404, "Pipeline not found")

                current_version_id = pipeline.get("version_id")
                previous_version_id = pipeline.get("versions")[-2]

                previous_version = await version_collection.find_one(
                    {'_id': ObjectId(previous_version_id),
                    'user_id':user_identifier},
                    session=session
                )

                if not previous_version:
                    raise HTTPException(404, "Previous version not found")

                update_result = await version_collection.update_one(
                    {'_id': ObjectId(str(current_version_id)),
                    'user_id':user_identifier},
                    {
                        '$set': {
                            "version_description": previous_version.get("version_description"),
                            "version_updated_at": datetime.now(),
                            "pipeline": previous_version.get("pipeline"),
                        }
                    },
                    session=session
                )

                if update_result.matched_count == 0:
                    raise HTTPException(404, "Version not found")

        return serialize_mongo({
            "version_id": previous_version_id,
            "version": previous_version
        })

    except Exception as e:
        logger.error(f"Error deleting draft: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
