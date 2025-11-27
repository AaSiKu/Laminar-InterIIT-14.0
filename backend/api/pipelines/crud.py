
from datetime import datetime


async def create_pipeline(user_identifier,version_collection,workflow_collection):
    graph_doc = {
                    "edges": [],
                    "nodes": [],
                    "viewport": {
                        "x": 0,
                        "y": 0,
                        "zoom": 1
                    }
                }
    version_doc = {
        "version_description": "",
        "version_created_at": datetime.now(),
        "version_updated_at": datetime.now(),
        "pipeline": graph_doc
    }
    version = await version_collection.insert_one(version_doc)
    version_doc["_id"] = version.inserted_id

    pipeline_doc = {
                "user_id": user_identifier,
                "status": False,
                "container_id": "",
                "agent_id": "",
                "agent_port": "",
                "agent_ip": "",
                "notification": [],
                "host_port": "",
                "host_ip": "",
                "versions": [],
                "version_id": str(version.inserted_id)
}
    result = await workflow_collection.insert_one(pipeline_doc)
    pipeline_doc["_id"] = result.inserted_id
    return pipeline_doc