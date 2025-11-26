import asyncio
import json
from faker import Faker
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, HTMLResponse
import uvicorn
from datetime import datetime, timedelta
import random
import time

# Initialize FastAPI app and Faker
app = FastAPI()
fake = Faker()

async def user_generator():
    """
    Async generator to continuously create fake user data.
    It yields data in the Server-Sent Event (SSE) format.
    """
    while True:
        user_data = {
            "user_id": str(fake.uuid4()),
            "name": fake.name(),
            "email": fake.email(),
            "job": fake.job()
        }
        yield f"{json.dumps(user_data)} \n"
        await asyncio.sleep(15)


@app.get("/stream-users")
async def stream_users(request: Request):
    frontend = request.query_params.get("frontend")
    return StreamingResponse(user_generator(), media_type="text/event-stream")



async def sensor_data_generator():
    sensor_ids = ["sensor_1", "sensor_2", "sensor_3"]
    while True:
        sensor_data = {
            "sensor_id": random.choice(sensor_ids),
            "timestamp": int(time.time()),
            "temperature": round(random.uniform(20.0, 35.0), 2),
            "location": random.choice(["room_a", "room_b", "room_c"])
        }
        yield f"{json.dumps(sensor_data)} \n"
        await asyncio.sleep(2)


async def event_data_generator():
    event_types = ["click", "view", "purchase", "logout"]
    user_ids = ["user_1", "user_2", "user_3", "user_4"]
    while True:
        event_data = {
            "user_id": random.choice(user_ids),
            "timestamp": int(time.time()),
            "event_type": random.choice(event_types),
            "value": round(random.uniform(1.0, 100.0), 2)
        }
        yield f"{json.dumps(event_data)} \n"
        await asyncio.sleep(3)


async def request_generator():
    """Generate request stream data."""
    services = ["api-gateway", "auth-service", "payment-service", "user-service", "inventory-service"]
    while True:
        request_data = {
            "timestamp": int(time.time()),
            "service": random.choice(services),
            "status_code": random.choices([200, 500], weights=[0.95, 0.05])[0]
        }
        yield f"{json.dumps(request_data)} \n"
        await asyncio.sleep(0.2)


async def failure_generator():
    """Generate failure stream data."""
    services = ["api-gateway", "auth-service", "payment-service", "user-service", "inventory-service"]
    failure_id = 1
    while True:
        if random.random() < 0.05:
            failure_data = {
                "service": random.choice(services),
                "failure_timestamp": int(time.time()),
                "reference_id": f"failure_{failure_id}"
            }
            failure_id += 1
            yield f"{json.dumps(failure_data)} \n"
        await asyncio.sleep(0.2)


async def recovery_generator():
    """Generate recovery stream data."""
    services = ["api-gateway", "auth-service", "payment-service", "user-service", "inventory-service"]
    recovery_id = 1
    while True:
        if random.random() < 0.04:
            recovery_data = {
                "service": random.choice(services),
                "recovery_timestamp": int(time.time()),
                "reference_id": f"failure_{max(1, recovery_id - random.randint(0, 5))}"
            }
            recovery_id += 1
            yield f"{json.dumps(recovery_data)} \n"
        await asyncio.sleep(0.2)


@app.get("/stream-sensors")
async def stream_sensors(request: Request):
    frontend = request.query_params.get("frontend")
    return StreamingResponse(
        sensor_data_generator(), 
        media_type="text/event-stream"
    )


@app.get("/stream-events")
async def stream_events(request: Request):
    frontend = request.query_params.get("frontend")
    return StreamingResponse(
        event_data_generator(), 
        media_type="text/event-stream"
    )


@app.get("/requests")
async def stream_requests(request: Request):
    frontend = request.query_params.get("frontend")
    return StreamingResponse(
        request_generator(),
        media_type="text/event-stream"
    )


@app.get("/failures")
async def stream_failures(request: Request):
    frontend = request.query_params.get("frontend")
    return StreamingResponse(
        failure_generator(),
        media_type="text/event-stream"
    )


@app.get("/recoveries")
async def stream_recoveries(request: Request):
    frontend = request.query_params.get("frontend")
    return StreamingResponse(
        recovery_generator(),
        media_type="text/event-stream"
    )


if __name__ == "__main__":
    uvicorn.run("stream:app", host="0.0.0.0", port=5050, reload=True)