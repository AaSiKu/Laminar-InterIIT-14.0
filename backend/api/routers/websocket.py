import os
import json
import time
import asyncio
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
active_connections = set()

router = APIRouter()

WS_INACTIVITY_TIMEOUT = int(os.getenv("WS_INACTIVITY_TIMEOUT", 300))
WS_CLEANUP_INTERVAL = int(os.getenv("WS_CLEANUP_INTERVAL", 60))
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



async def close_inactive_connections():
    '''
    Background task that periodically checks for inactive connections and closes them.
    This is the function/API for handling inactivity timeouts.
    Runs continuously, checking every WS_CLEANUP_INTERVAL seconds.
    '''
    while True:
        try:
            await asyncio.sleep(WS_CLEANUP_INTERVAL)
            current_time = time.time()
            connections_to_close = []
            
            # active_connections set contains: (websocket, user_id, pipeline_id, last_activity)
            for conn in list(active_connections):
                if len(conn) == 4:
                    websocket, user_id, pipeline_id, last_activity = conn
                    if current_time - last_activity > WS_INACTIVITY_TIMEOUT:
                        inactive_duration = current_time - last_activity
                        connections_to_close.append((conn, user_id, pipeline_id, inactive_duration))
            
            for conn, user_id, pipeline_id, inactive_duration in connections_to_close:
                try:
                    logger.info(f"Closing inactive connection for user {user_id}, pipeline {pipeline_id} (inactive for {inactive_duration:.0f}s)")
                    await conn[0].close(code=1000, reason="Connection inactive")
                except Exception as e:
                    logger.warning(f"Error closing inactive connection: {e}")
                finally:
                    # Remove from set using the exact tuple
                    active_connections.discard(conn)
                    
        except Exception as e:
            logger.error(f"Error in close_inactive_connections: {e}")


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
    current_time = time.time()

    connections_to_remove = []
    
    # active_connections set contains: (websocket, user_id, pipeline_id, last_activity)
    for websocket, ws_user_id, ws_pipeline_id, last_activity in list(active_connections):
        if ws_user_id == target_user:
            if ws_pipeline_id == "All":
                try:
                    await websocket.send_text(dumps(message))
                    active_connections.discard((websocket, ws_user_id, ws_pipeline_id, last_activity))
                    active_connections.add((websocket, ws_user_id, ws_pipeline_id, current_time))
                    return "message sent"
                except Exception as e:
                    logger.warning(f"Failed to send message, closing connection: {e}")
                    try:
                        await websocket.close(code=1000, reason="Connection error")
                    except:
                        pass
                    connections_to_remove.append((websocket, ws_user_id, ws_pipeline_id, last_activity))
                continue
            if ws_pipeline_id == target_pipeline:
                try:
                    await websocket.send_text(dumps(message))
                    active_connections.discard((websocket, ws_user_id, ws_pipeline_id, last_activity))
                    active_connections.add((websocket, ws_user_id, ws_pipeline_id, current_time))
                    return "message sent"
                except Exception as e:
                    logger.warning(f"Failed to send message, closing connection: {e}")
                    try:
                        await websocket.close(code=1000, reason="Connection error")
                    except:
                        pass
                    connections_to_remove.append((websocket, ws_user_id, ws_pipeline_id, last_activity))
    
    # Remove failed connections
    for conn in connections_to_remove:
        active_connections.discard(conn)


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
                    "owner_ids": {"$in":user_identifier},
                    "_id": ObjectId(pipeline_id),
                    "status": "Running"
                })
                if not pipeline:
                    await websocket.close(code=1008, reason="Pipeline not found")
                    return

            current_activity_time = time.time()
            active_connections.add((websocket, user_identifier, pipeline_id, current_activity_time))

            try:
                while True:
                    await websocket.receive_text()
                    for conn in list(active_connections):
                        if len(conn) == 4 and conn[0] == websocket and conn[1] == user_identifier and conn[2] == pipeline_id:
                            active_connections.discard(conn)
                            active_connections.add((websocket, user_identifier, pipeline_id, time.time()))
                            break
            except WebSocketDisconnect:
                connection_closed = True
            except Exception as e:
                logger.error(f"Error in websocket connection: {e}")
                try:
                    await websocket.close(code=1011, reason="Internal error")
                    connection_closed = True
                except:
                    pass
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
