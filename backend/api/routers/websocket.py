import os
import json
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from aiokafka import AIOKafkaConsumer
from dotenv import load_dotenv
from backend.api.routers.overview import active_connections
from backend.api.routers.auth.routes import get_current_user_ws, WebSocketAuthException
from bson.objectid import ObjectId
from backend.api.routers.auth.database import get_db
from bson.json_util import dumps
from starlette.websockets import WebSocketDisconnect
import logging

logger = logging.getLogger(__name__)

load_dotenv()

router = APIRouter()

KAFKA_BOOTSTRAP_SERVER = os.getenv("KAFKA_BOOTSTRAP_SERVER", "localhost:9092")
SASL_USERNAME = os.getenv("KAFKA_SASL_USERNAME", None)
SASL_PASSWORD = os.getenv("KAFKA_SASL_PASSWORD", None)
SASL_MECHANISM = os.getenv("KAFKA_SASL_MECHANISM", None)
SECURITY_PROTOCOL = os.getenv("KAFKA_SECURITY_PROTOCOL",None)

@router.websocket("/alerts/{pipeline_id}")
async def alerts_ws(websocket: WebSocket, pipeline_id: str):
    await websocket.accept()
    topic = f"alert_{pipeline_id}"

    kwargs = {}
    if SASL_USERNAME:
        kwargs = {
            "security_protocol": SECURITY_PROTOCOL,
            "sasl_mechanisms": SASL_MECHANISM,
            "sasl_plain_username": SASL_USERNAME,
            "sasl_password": SASL_PASSWORD,
        }
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVER,
    )

    await consumer.start()
    try:
        async for msg in consumer:
            try:
                payload = json.loads(msg.value.decode())
            except:
                payload = {"raw": msg.value.decode()}

            await websocket.send_json(payload)

    except WebSocketDisconnect:
        pass
    finally:
        await consumer.stop()



async def watch_changes(notification_collection):
    condition = [{"$match": {"operationType": "insert"}}]
    try:
        async with notification_collection.watch(condition) as stream:
            print("Change stream listener started")
            async for change in stream:
                doc = change["fullDocument"]
                await broadcast(doc)
    except Exception as e:
        print("⚠ ChangeStream NOT running:", e)


async def broadcast(message: dict):
    '''
    Sends/Broadcasts the notification to all connections
    '''
    target_user = message["user_id"]
    target_pipeline = message["pipeline_id"]

    for websocket, ws_user_id, ws_pipeline_id in list(active_connections):
        if ws_user_id == target_user:
            if ws_pipeline_id == "All":
                try:
                    await websocket.send_text(dumps(message))
                    return "message sent"
                except:
                    active_connections.remove((websocket, ws_user_id, ws_pipeline_id))
                continue
            if ws_pipeline_id == target_pipeline:
                try:
                    await websocket.send_text(dumps(message))
                    return "message sent"
                except:
                    active_connections.remove((websocket, ws_user_id, ws_pipeline_id))


@router.websocket("/pipeline/{pipeline_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    pipeline_id: str,
):
    await websocket.accept()
    
    try:
        async for db in get_db():
            current_user = await get_current_user_ws(websocket, db)
            user_identifier = str(current_user.id)
            workflow_collection = websocket.app.state.workflow_collection

            if pipeline_id != "All":
                pipeline = await workflow_collection.find_one({
                    "user_id": user_identifier,
                    "_id": ObjectId(pipeline_id),
                    "status": "Running"
                })
                if not pipeline:
                    await websocket.close(code=1008, reason="Pipeline not found")
                    return

            active_connections.add((websocket, user_identifier, pipeline_id))

            try:
                while True:
                    await websocket.receive_text()
            except WebSocketDisconnect:
                active_connections.remove((websocket, user_identifier, pipeline_id))
            break
                
    except WebSocketAuthException as e:
        print(f"Auth failed: {e.reason}")
        await websocket.close(code=e.code, reason=e.reason)
    except Exception as e:
        print(f"WebSocket error: {e}")
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass
