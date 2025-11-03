import os
import json
import subprocess
from fastapi import FastAPI, Request, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "db")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "pipelines")

mongo_client = None
db = None
collection = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db, collection

    # ---- STARTUP ----
    if not MONGO_URI:
        raise RuntimeError("❌ MONGO_URI not set in environment")

    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[MONGO_DB]
    collection = db[MONGO_COLLECTION]
    print(f"✅ Connected to MongoDB at {MONGO_URI}, DB: {MONGO_DB}", flush=True)

    yield  # Hand over control to FastAPI runtime

    # ---- SHUTDOWN ----
    if mongo_client:
        mongo_client.close()
        print("🛑 MongoDB connection closed.")

app = FastAPI(title="Pipeline API", lifespan=lifespan)


# ============ Pipeline Process Handling ============
pipeline_process: subprocess.Popen | None = None


def stop_pipeline():
    global pipeline_process
    if pipeline_process and pipeline_process.poll() is None:
        print("🛑 Stopping running pipeline...")
        pipeline_process.terminate()
        try:
            pipeline_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pipeline_process.kill()
        print("✅ Pipeline stopped.")
        pipeline_process = None


def run_pipeline():
    global pipeline_process
    stop_pipeline()
    print("🚀 Starting new pipeline...")
    pipeline_process = subprocess.Popen(["python3", "-m", "pipeline"], stdout=open("pipeline.log", "w"), stderr=subprocess.STDOUT)


# ============ API Endpoints ============

@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "message": "Pipeline API is running"}


@app.post("/trigger")
async def trigger_pipeline(request: Request):
    """
    Webhook trigger endpoint.
    Reads the pipeline record with _id = PIPELINE_ID from MongoDB,
    saves it as flowchart.json, and runs `python3 -m pipeline`.
    """
    pipeline_id = os.getenv("PIPELINE_ID")
    if not pipeline_id:
        raise HTTPException(status_code=400, detail="PIPELINE_ID not set in environment")

    # Fetch record
    record = await collection.find_one({"_id": ObjectId(pipeline_id)})
    if not record:
        raise HTTPException(status_code=404, detail=f"No pipeline found with id={pipeline_id}")

    # Write flowchart.json
    with open("flowchart.json", "w") as f:
        json.dump(record["pipeline"], f, indent=2)

    # Run pipeline
    run_pipeline()

    return {"status": "started", "id": pipeline_id}


@app.post("/stop")
def stop_endpoint():
    """
    Manually stop the running pipeline.
    """
    stop_pipeline()
    return {"status": "stopped"}

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)