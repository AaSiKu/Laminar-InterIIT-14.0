import os
import json
import subprocess
from fastapi import FastAPI, Request, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
from bson import ObjectId
from pydantic import BaseModel
import csv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB", "db")
WORKFLOW_COLLECTION = os.getenv("WORKFLOW_COLLECTION", "workflows")
VERSION_COLLECTION = os.getenv("VERSION_COLLECTION", "versions")

mongo_client = None
db = None
workflow_collection = None
version_collection = None

PROMPTS_FILE = "prompts.csv"
FLOWCHART_FILE = os.getenv("FLOWCHART_FILE", "flowchart.json")

def create_prompts_file():
    with open(PROMPTS_FILE, "w") as f:
        f.write("")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client, db, workflow_collection, version_collection

    # ---- STARTUP ----
    if not MONGO_URI:
        raise RuntimeError("MONGO_URI not set in environment")

    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[MONGO_DB]
    workflow_collection = db[WORKFLOW_COLLECTION]
    version_collection = db[VERSION_COLLECTION]
    print(f"Connected to MongoDB at {MONGO_URI}, DB: {MONGO_DB}", flush=True)

    # Hand over control to FastAPI runtime
    yield

    # ---- SHUTDOWN ----
    if mongo_client:
        mongo_client.close()
        print("MongoDB connection closed.")

app = FastAPI(title="Pipeline API", lifespan=lifespan)


# ============ Pipeline Process Handling ============
pipeline_process: subprocess.Popen | None = None


def stop_pipeline():
    global pipeline_process
    if pipeline_process and pipeline_process.poll() is None:
        print("Stopping running pipeline...")
        pipeline_process.terminate()
        try:
            pipeline_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pipeline_process.kill()
        print("Pipeline stopped.")
        pipeline_process = None


def run_pipeline():
    global pipeline_process
    stop_pipeline()
    print("Starting new pipeline...")
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
    saves it as FLOWCHART_FILE, and runs `python3 -m pipeline`.
    """
    pipeline_id = os.getenv("PIPELINE_ID")
    create_prompts_file()
    if not pipeline_id:
        raise HTTPException(status_code=400, detail="PIPELINE_ID not set in environment")
    
    # Fetch workflow and version
    workflow = await workflow_collection.find_one({"_id": ObjectId(pipeline_id)})
    if not workflow:
        raise HTTPException(status_code=404, detail=f"No workflow found with id={pipeline_id}")
    
    if "current_version_id" not in workflow:
        raise HTTPException(status_code=404, detail=f"Workflow {pipeline_id} has no current_version_id")
    
    version = await version_collection.find_one({"_id": ObjectId(workflow["current_version_id"])})
    if not version:
        raise HTTPException(status_code=404, detail=f"No version found with id={workflow['current_version_id']}")


    # Write FLOWCHART_FILE
    with open(FLOWCHART_FILE, "w") as f:
        json.dump(version["pipeline"], f, indent=2)

    # Run pipeline
    run_pipeline()

    return {"status": "started", "id": pipeline_id}

class PromptIn(BaseModel):
    prompt: str

@app.post("/prompt")
def prompt(body: PromptIn):
    file_path = PROMPTS_FILE

    # Append prompt to CSV (single column "prompts")
    with open(file_path, "a", newline="") as f:
        writer = csv.writer(f)
        if f.tell() == 0:
            writer.writerow(["prompt"])  # header only if file does not exist
        writer.writerow([body.prompt])

    return {"status": "ok", "saved": body.prompt}


@app.post("/stop")
def stop_endpoint():
    """
    Manually stop the running pipeline.
    """
    stop_pipeline()
    return {"status": "stopped"}