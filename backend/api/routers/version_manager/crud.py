
from datetime import datetime
async def create_pipeline(user_identifier,version_collection,workflow_collection,mongo_client):
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
        "user_id": user_identifier,
        "version_created_at": datetime.now(),
        "version_updated_at": datetime.now(),
        "pipeline": graph_doc
    }
    pipeline_doc = {
                "user_id": user_identifier,
                "status": False,
                "container_id": "",
                "agent_container_id": "",
                "agent_port": "",
                "agent_ip": "",
                "notification": [],
                "host_port": "",
                "host_ip": "",
                "versions": []
            }

    async with await mongo_client.start_session() as session:
        try:
            session.start_transaction()

            version = await version_collection.insert_one(version_doc, session=session)
            version_doc["_id"] = version.inserted_id
            pipeline_doc["versions"]=[str(version.inserted_id)]
            pipeline_doc["version_id"] = str(version.inserted_id)

            result = await workflow_collection.insert_one(pipeline_doc, session=session)
            pipeline_doc["_id"] = result.inserted_id

            await session.commit_transaction()
            return pipeline_doc

        except Exception as e:
            await session.abort_transaction()
            raise e

        
