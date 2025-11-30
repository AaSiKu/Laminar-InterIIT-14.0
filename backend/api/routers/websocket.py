import os
import json
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from aiokafka import AIOKafkaConsumer
from dotenv import load_dotenv
from bson.json_util import dumps
load_dotenv()

active_connections = set()

#TODO: broadcast to only selected connections
#    : if pipeline_id is provided, broadcast to only that pipeline's connections of only that user
#    : if pipeline_id is not provided, broadcast to all connections of only that user

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
    '''
    Listens for any insertion to the notifications collection
    '''
    condition = [
    {"$match": {"operationType": "insert"}}
]
    try:
        async with notification_collection.watch(condition) as stream:
            print("Change stream listener started")
            async for change in stream:
                print("Mongo change:", dumps(change["fullDocument"]))
                await broadcast(dumps(change["fullDocument"]))
    except Exception as e:
        print("⚠ ChangeStream NOT running:", e)


async def broadcast(message: str):
    '''
    Sends/Broadcasts the notification to all connections
    '''
    for websocket in list(active_connections):
        try:
            await websocket.send_text(message)
        except:
            active_connections.remove(websocket)

@router.websocket("/ws/pipeline")
async def websocket_endpoint(websocket: WebSocket):
    '''
    Creates a websocket and keeps it alive
    Deletes when websocket is inactive
    '''
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            # Keep connection alive
            test = await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)