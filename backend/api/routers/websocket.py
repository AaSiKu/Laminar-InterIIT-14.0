import os
import json
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from aiokafka import AIOKafkaConsumer
from dotenv import load_dotenv
from backend.api.routers.overview import active_connections
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
    print(pipeline_id)
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