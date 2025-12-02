from fastapi import APIRouter, Depends, HTTPException, Request, status
from bson.objectid import ObjectId
from backend.api.routers.auth.routes import get_current_user
from backend.api.routers.auth.models import User
from datetime import datetime
import logging
from .schema import save_workflow_payload, retrieve_payload,save_draft_payload
from .crud import create_workflow as _create_workflow


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


#----------------------------------Create workflow------------------------------------#


@router.post("/create_pipeline")
async def create_workflow(
    request:Request,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new workflow
    """

    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client
    try:            
        user_identifier = str(current_user.id)
        new_workflow = await _create_workflow(user_identifier,version_collection,workflow_collection,mongo_client)
        return {
            "message": "Workflow created successfully",
            "id": str(new_workflow["_id"]),
            "user_id": user_identifier,
            "current_version_id": new_workflow["current_version_id"]
        }
    except Exception as e:
        logger.error(f"Create Workflow error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))



#-----------------------------------   Save workflow and Drafts     ----------------------------------------#


@router.post("/save")
async def save_workflow(
    request:Request,
    payload: save_workflow_payload,
    current_user: User = Depends(get_current_user)
):
    """
    Saves a version to the database
    """

    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client

    try:
        user_identifier = str(current_user.id)
        workflow_query = {"_id": ObjectId(payload.workflow_id)}
        version_query = {"_id": ObjectId(payload.current_version_id)}

        try:
            (ObjectId(payload.workflow_id) is None)
            (ObjectId(payload.current_version_id) is None)
        except:
            raise HTTPException(status_code=404, detail="Workflow or Version not found")

        if current_user.role != "admin":
            workflow_query["owner_ids"] = {"$in": [user_identifier]}

        existing_version = await version_collection.find_one({"_id": ObjectId(payload.current_version_id)})
        existing_workflow = await workflow_collection.find_one({"_id": ObjectId(payload.workflow_id)})

        if not existing_version or not existing_workflow:
            raise HTTPException(status_code=404, detail="Version or workflow not found")

        async with mongo_client.start_session() as session:
            async with session.start_transaction():
                update_result = await version_collection.update_one(
                    version_query,
                    {
                        '$set': {
                            "version_description": payload.version_description,
                            "version_updated_at": payload.version_updated_at,
                            "pipeline": payload.pipeline,
                        }
                    },
                    session=session
                )

                if update_result.modified_count == 0 and update_result.matched_count == 0:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not authorzed to save the workflow."
                    )

                new_version = await version_collection.insert_one(
                    {
                        "user_id": user_identifier,
                        "version_description": payload.version_description,
                        "version_created_at": datetime.now(),
                        "version_updated_at": datetime.now(),
                        "pipeline": payload.pipeline,
                    },
                    session=session
                )

                if not new_version.inserted_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Error updating Workflow"
                    )

                workflow_update_result = await workflow_collection.update_one(
                    workflow_query,
                    {   
                        '$set': {"current_version_id": str(new_version.inserted_id)},
                        "$push": {"versions": str(new_version.inserted_id)}
                    },
                    session=session
                )

                if workflow_update_result.modified_count == 0 and workflow_update_result.matched_count == 0:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You are not authorzed to save the workflow."
                    )

        return {
            "message": "Updated successfully",
            "version_id": str(new_version.inserted_id),
            "workflow_id": str(payload.workflow_id),
            "user_id": user_identifier
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating workflow: {str(e)}"
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

    version_collection = request.app.state.version_collection

    try: 
        current_version_id = payload.version_id
        pipeline=payload.pipeline
        version_description= payload.version_description
        user_identifier = str(current_user.id)
        try:
            (ObjectId(current_version_id) is None)
        except:
            raise HTTPException(status_code=404, detail="Workflow or Version not found")

        version_query = {"_id": ObjectId(current_version_id)}
        existing_version = await version_collection.find_one({"_id": ObjectId(current_version_id)})

        if current_user.role != "admin":
            version_query["user_id"] = user_identifier
        if not existing_version:
            raise HTTPException(status_code=404, detail="Version not found")
        
        existing_version = await version_collection.find_one(version_query)
        if not existing_version:
            raise HTTPException(status_code=403, detail="You are not authorised to Edit the workfow")

        result = await version_collection.update_one(
            version_query,
            {
                '$set': {
                    "version_description": version_description,
                    "version_updated_at": datetime.now(),
                    "pipeline": pipeline,
                }
            
            })

        return {
                "message": "Draft saved successfully",
                "id": current_version_id,
                "user_id": user_identifier,
                "version": str(result)
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating version: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) 



#---------------------------------    Retrieve workflow and Drafts--------------------------------------#  


@router.post("/retrieve_pipeline")
async def retrieve_workflow(
    request:Request,
    payload: retrieve_payload,
    current_user: User = Depends(get_current_user)
):
    
    """
    
    Retrieve a workflow from the database
    """
    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    workflow_id = payload.workflow_id
    version_id = payload.version_id
    role = current_user.role

    try:
        try:
            (ObjectId(workflow_id) is None)
            (ObjectId(version_id) is None)
        except:
            raise HTTPException(status_code=404, detail="Workflow or Version not found")
        user_identifier = str(current_user.id)
        existing_version = await version_collection.find_one({"_id": ObjectId(version_id)})
        existing_workflow = await workflow_collection.find_one({"_id": ObjectId(workflow_id)})

        if not existing_version or not existing_workflow:
            raise HTTPException(status_code=404, detail="Version or workflow not found")
        
        if( role=="admin" or user_identifier in existing_workflow["owner_ids"] or user_identifier in existing_workflow["viewer_ids"]):
            return {
                "message": "Pipeline data retrieved successfully",
                "workflow": serialize_mongo(existing_workflow),
                "version": serialize_mongo(existing_version)
            }
        else:
            raise HTTPException(status_code=403, detail="You are not authorised to access the pipeline")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Retrieve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

#retrieve version was redundant as retrieve workflow uses version id and i can get the draft version from current version id and the workflow to be used form the workflow collection

@router.get("/retrieve_all")
async def retrieve_all(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all workflows and drafts for the current user
    """
    workflow_collection = request.app.state.workflow_collection

    if current_user.role == "admin":
        print("admin")
        workflows = await workflow_collection.find().to_list(length=5)
        return serialize_mongo({
            "status": "success",
            "count": len(workflows),
            "data": workflows
        })


    user_identifier = str(current_user.id)
    print(user_identifier)
    workflows = await workflow_collection.find(
        {"owner_ids": user_identifier}
    ).to_list(length=5)

    if not workflows:
        raise HTTPException(status_code=404, detail="No workflows found")

    print(workflows)
    
    return serialize_mongo({
        "status": "success",
        "count": len(workflows),
        "data": workflows
    }) 


#---------------------------- Delete workflow and Drafts--------------------------#
@router.post("/delete_pipeline")
async def delete_workflow(
    request:Request,
    workflow_id: str,
    current_user: User = Depends(get_current_user)
):
    
    """
    Delete a workflow from the database
    """
    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client

    try:
        user_identifier = str(current_user.id)
        try:
            (ObjectId(workflow_id) is None)
        except:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        workflow_query = {"_id": ObjectId(workflow_id)}

        if current_user.role != "admin":
            workflow_query["owner_ids"] = {"$in": [user_identifier]}
        existing_workflow = await workflow_collection.find_one({"_id": ObjectId(workflow_id)})

        if not existing_workflow:
            raise HTTPException(status_code=404, detail="workflow not found")
        
        if  not ((user_identifier in existing_workflow.get("owner_ids")) or (current_user.role=="admin")):
            raise HTTPException(status_code=403, detail="You are not authorised to delete the pipeline")
        
        if existing_workflow.get("container_id"):
            raise HTTPException(status_code=409, detail="workflow running, Stop and Spin down the workflow to delete the Workflow")
        
        async with mongo_client.start_session() as session:
            async with session.start_transaction(): 

                for version_id in existing_workflow.get('versions', []):
                    await version_collection.delete_one(
                        {'_id': ObjectId(version_id)},
                        session=session)

                workflow = await workflow_collection.delete_one(
                    workflow_query, 
                    session=session)
                
                if workflow.deleted_count == 0:
                    raise HTTPException(status_code=404, detail="workflow not found or not authorized")

        return {
            "message": "workflow deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete workflow error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/delete_draft")
async def delete_draft(
    request:Request,
    workflow_id: str,
    current_user: User = Depends(get_current_user)
):
    
    workflow_collection = request.app.state.workflow_collection
    version_collection = request.app.state.version_collection
    mongo_client = request.app.state.mongo_client
    try:
        
        user_identifier = str(current_user.id)
        try:
            (ObjectId(workflow_id) is None)
        except:
            raise HTTPException(status_code=404, detail="Workflow not found")
        workflow_query = {"_id": ObjectId(workflow_id)}
        existing_workflow = await workflow_collection.find_one(workflow_query)

        if not existing_workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        if not (user_identifier in existing_workflow["owner_ids"] or current_user.role == "admin"):
            raise HTTPException(status_code=403, detail="You are not authorised to Delete the Edits")

        if current_user.role != "admin":
            workflow_query["owner_ids"] = {"$in": [user_identifier]}
        
        async with mongo_client.start_session() as session:
            async with session.start_transaction():
                pipeline={
                    "edges": [],
                    "nodes": [],
                    "viewport": {
                        "x": 0,
                        "y": 0,
                        "zoom": 1
                    }
                }
                version_description = ""
                pipeline_doc = {
                    "edges": [],
                    "nodes": [],
                    "viewport": {
                        "x": 0,
                        "y": 0,
                        "zoom": 1
                    }
                }
                previous_version= {
                        "version_description": "",
                        "user_id": user_identifier,
                        "version_created_at": datetime.now(),
                        "version_updated_at": datetime.now(),
                        "pipeline": pipeline_doc
                    }
                current_version_id = existing_workflow.get("current_version_id")
                if(len(existing_workflow.get("versions"))!=1):
                    previous_version_id = existing_workflow.get("versions")[-2]
                    previous_version = await version_collection.find_one(
                        {"_id": ObjectId(previous_version_id)},
                        session=session
                    )
                    pipeline=previous_version.get("pipeline")
                    version_description=previous_version.get("version_description")
                updated_result = await version_collection.update_one(
                    {"_id": ObjectId(str(current_version_id))},
                    {
                        '$set': {
                            "version_description": version_description,
                            "version_updated_at": datetime.now(),
                            "pipeline": pipeline,
                        }
                    },
                    session=session
                )

                if updated_result.matched_count == 0:
                    raise HTTPException(404, "Version not found")

        return serialize_mongo({
            "version_id": current_version_id,
            "version": previous_version
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting draft: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
