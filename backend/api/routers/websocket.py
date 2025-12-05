import os
import json
import time
import asyncio
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from aiokafka import AIOKafkaConsumer
from dotenv import load_dotenv
from .auth.routes import get_current_user_ws, WebSocketAuthException
from bson.objectid import ObjectId
from .auth.database import get_db
from bson.json_util import dumps
from bson import ObjectId
from starlette.websockets import WebSocketDisconnect
import logging
#TODO: Add role and status to the notification
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
            
            # active_connections set contains: (websocket, current_user, last_activity)
            for conn in list(active_connections):
                if len(conn) == 3:
                    websocket, current_user, last_activity = conn
                    if current_time - last_activity > WS_INACTIVITY_TIMEOUT:
                        inactive_duration = current_time - last_activity
                        connections_to_close.append((conn, current_user, inactive_duration))
            
            for conn, current_user, inactive_duration in connections_to_close:
                try:
                    logger.info(f"Closing inactive connection for user {current_user.id} (inactive for {inactive_duration:.0f}s)")
                    await conn[0].close(code=1000, reason="Connection inactive")
                except Exception as e:
                    logger.warning(f"Error closing inactive connection: {e}")
                finally:
                    # Remove from set using the exact tuple
                    active_connections.discard(conn)
                    
        except Exception as e:
            logger.error(f"Error in close_inactive_connections: {e}")


async def watch_notifications(notification_collection, workflow_collection):
    """
    Watch notification collection for inserts/updates and broadcast via WebSocket
    """
    condition = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
    try:
        async with notification_collection.watch(
            condition,
            full_document="updateLookup"
        ) as stream:
            logger.info("Notification change stream listener started")
            async for change in stream:
                doc = change.get("fullDocument")
                if not doc:
                    continue

                # Fetch workflow details
                pipeline_id = doc.get("pipeline_id")
                if pipeline_id:
                    try:
                        workflow = await workflow_collection.find_one(
                            {"_id": ObjectId(pipeline_id)}
                        )
                        # Attach workflow to message
                        doc["workflow"] = workflow or {}
                    except Exception as e:
                        logger.warning(f"Error fetching workflow for notification: {e}")
                        doc["workflow"] = {}
                
                # Broadcast notification/alert
                await broadcast(doc, message_type="notification")
    except Exception as e:
        logger.error(f"⚠ Notification ChangeStream NOT running: {e}")

async def watch_workflows(workflow_collection):
    """
    Watch workflow collection for inserts, updates, and replacements - broadcast via WebSocket
    """
    condition = [{"$match": {"operationType": {"$in": ["insert", "update", "replace"]}}}]
    try:
        async with workflow_collection.watch(
            condition,
            full_document="updateLookup"
        ) as stream:
            logger.info("Workflow change stream listener started")
            async for change in stream:
                doc = change.get("fullDocument")
                if not doc:
                    # For updates, get the document
                    doc_id = change.get("documentKey", {}).get("_id")
                    if doc_id:
                        try:
                            doc = await workflow_collection.find_one({"_id": doc_id})
                        except Exception as e:
                            logger.warning(f"Error fetching workflow document: {e}")
                            continue
                
                if doc:
                    # Broadcast workflow update/insert
                    await broadcast(doc, message_type="workflow")
    except Exception as e:
        logger.error(f"⚠ Workflow ChangeStream NOT running: {e}")

async def watch_logs(log_collection, workflow_collection):
    """
    Watch log collection for inserts and broadcast via WebSocket
    Logs are similar to notifications but for different purposes (debugging, system events, etc.)
    """
    condition = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
    try:
        async with log_collection.watch(
            condition,
            full_document="updateLookup"
        ) as stream:
            logger.info("Log change stream listener started")
            async for change in stream:
                print("Log change detected")
                doc = change.get("fullDocument")
                if not doc:
                    continue

                # Fetch workflow details
                pipeline_id = doc.get("pipeline_id")
                if pipeline_id:
                    try:
                        workflow = await workflow_collection.find_one(
                            {"_id": ObjectId(pipeline_id)}
                        )
                        # Attach workflow to message
                        doc["workflow"] = workflow or {}
                    except Exception as e:
                        logger.warning(f"Error fetching workflow for log: {e}")
                        doc["workflow"] = {}
                
                # Broadcast log
                print(doc)
                await broadcast(doc, message_type="log")
    except Exception as e:
        logger.error(f"⚠ Log ChangeStream NOT running: {e}")

async def watch_changes(notification_collection, log_collection, workflow_collection):
    """
    Watch changes in notification, log (commented out), and workflow collections
    All changes are broadcast via the single global WebSocket connection at /ws
    Sends everything to all connections - frontend filters what it needs
    Starts watchers as background tasks that run concurrently
    """
    # Start notification and workflow watchers as background tasks
    # They will run indefinitely until the application shuts down
    # All changes go through the same global WebSocket connection
    asyncio.create_task(
        watch_notifications(notification_collection, workflow_collection)
    )
    asyncio.create_task(
        watch_workflows(workflow_collection)
    )
    
    # Logs watcher is commented out - logs not implemented yet
    asyncio.create_task(
        watch_logs(log_collection, workflow_collection)
    )
    
    logger.info("Started notification and workflow change stream watchers (all via global WebSocket)")
    # logger.info("Started notification, log, and workflow change stream watchers")

async def broadcast(message: dict, message_type: str = "notification"):
    """
    Centralized function to broadcast messages to all active WebSocket connections
    Handles notifications, alerts, workflow updates, and logs (logs commented out)
    Sends everything to all connections - frontend will filter what it needs
    """
    current_time = time.time()

    if not active_connections:
        logger.debug("No websocket connections to broadcast to")
        return

    # Track dropped connections
    connections_to_remove = []
    
    # Send to all connections - frontend filters what it needs
    for websocket, ws_current_user, last_activity in list(active_connections):
        try:
            # Add message type to the message
            message_with_type = {**message, "message_type": message_type}
            print(f"Broadcasting {message_type} to user {ws_current_user.id}")
            await websocket.send_text(dumps(message_with_type))
                
            # Update last activity
            active_connections.discard((websocket, ws_current_user, last_activity))
            active_connections.add((websocket, ws_current_user, current_time))

        except Exception as e:
            logger.warning(f"Failed to send message to user {ws_current_user.id}, closing connection: {e}")
            try:
                await websocket.close(code=1000, reason="Connection error")
            except:
                pass
            connections_to_remove.append((websocket, ws_current_user, last_activity))

    # Remove broken connections
    for conn in connections_to_remove:
        active_connections.discard(conn)

    logger.debug(f"Broadcasted {message_type} message to {len(active_connections) - len(connections_to_remove)} connections")
    return "message broadcasted"


@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    """
    Global WebSocket endpoint for all real-time updates
    Sends all notifications, alerts, workflow updates, and logs (logs commented out) to all connections
    Frontend will filter what it needs based on the user's access
    """
    await websocket.accept()
    
    try:
        async for db in get_db():
            current_user = await get_current_user_ws(websocket, db)
            current_activity_time = time.time()
            active_connections.add((websocket, current_user, current_activity_time))
            logger.info(f"WebSocket connection established for user {current_user.id}")

            try:
                # Keep connection alive and update activity on any message
                while True:
                    try:
                        # Wait for any message (ping/pong or data)
                        data = await websocket.receive_text()
                        
                        # Handle ping messages
                        try:
                            message_data = json.loads(data)
                            if message_data.get("type") == "ping":
                                # Send pong response
                                await websocket.send_text(json.dumps({"type": "pong"}))
                        except:
                            # Not JSON, just update activity
                            pass
                        
                        # Update last activity time
                        for conn in list(active_connections):
                                if len(conn) == 3 and conn[0] == websocket and conn[1] == current_user:
                                    active_connections.discard(conn)
                                    active_connections.add((websocket, current_user, time.time()))
                                    break
                    except WebSocketDisconnect:
                            break
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for user {current_user.id}")
            except Exception as e:
                logger.error(f"Error in websocket connection: {e}")
                try:
                    await websocket.close(code=1011, reason="Internal error")
                except:
                    pass
            finally:
                # Remove connection from active set
                for conn in list(active_connections):
                    if len(conn) == 3 and conn[0] == websocket and conn[1] == current_user:
                        active_connections.discard(conn)
                        break
            break
                
    except WebSocketAuthException as e:
        logger.warning(f"WebSocket auth failed: {e.reason}")
        await websocket.close(code=e.code, reason=e.reason)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass
