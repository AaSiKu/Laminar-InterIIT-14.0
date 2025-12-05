import os
import json
import subprocess
from fastapi import FastAPI, Request, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional
import csv
load_dotenv()
# if load_dotenv() below the setup_logging import, then we will need to ourself provide the env variables.
from lib.logger import custom_logger
from postgres_util import postgre_engine
from sqlalchemy import text


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

    try:
        mongo_client = AsyncIOMotorClient(MONGO_URI)
        db = mongo_client[MONGO_DB]
        workflow_collection = db[WORKFLOW_COLLECTION]
        version_collection = db[VERSION_COLLECTION]
        custom_logger.info(f"Connected to Database, DB: {MONGO_DB}")
    except Exception as e:
        custom_logger.error(f"Failed to connect to database: {e}")
        raise

    # Hand over control to FastAPI runtime
    yield

    # ---- SHUTDOWN ----
    if mongo_client:
        mongo_client.close()
        print("MongoDB connection closed.")

app = FastAPI(title="Pipeline API", lifespan=lifespan)


# ============ Pipeline Process Handling ============
pipeline_process: subprocess.Popen | None = None
pipeline_log_file = None


def stop_pipeline():
    global pipeline_process, pipeline_log_file
    if pipeline_process and pipeline_process.poll() is None:
        print("Stopping running pipeline...")
        pipeline_process.terminate()
        try:
            pipeline_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pipeline_process.kill()
    if pipeline_log_file:
        try:
            pipeline_log_file.close()
        except Exception:
            pass
        pipeline_log_file = None
    custom_logger.critical("Pipeline stopped.")
    pipeline_process = None


def run_pipeline():
    global pipeline_process, pipeline_log_file
    stop_pipeline()
    custom_logger.critical("Re-starting pipeline...")
    pipeline_log_file = open("pipeline.log", "w")
    pipeline_process = subprocess.Popen(
        ["python3", "-m", "pipeline"], 
        stdout=pipeline_log_file, 
        stderr=subprocess.STDOUT
    )


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


class GetTable(BaseModel):
    table_name: str
    start: Optional[int] = 0
    limit: Optional[int] = 10

@app.post("/data")
def get_table(body: GetTable):
    """
    Get table data from (start) to (start + limit) with table_name
    """
    try:
        with postgre_engine.connect() as conn:
            # Get total count
            count_query = text(f"SELECT COUNT(*) FROM \"{body.table_name}\"")
            total = conn.execute(count_query).scalar()

            # Get paginated data - order by timestamp DESC for logs table
            if body.table_name == "logs":
                data_query = text(f"SELECT * FROM \"{body.table_name}\" ORDER BY timestamp DESC LIMIT :limit OFFSET :start")
            else:
                data_query = text(f"SELECT * FROM \"{body.table_name}\" LIMIT :limit OFFSET :start")
            result = conn.execute(data_query, {"limit": body.limit, "start": body.start})

            # Convert rows to list of dicts
            columns = result.keys()
            rows = [dict(zip(columns, row)) for row in result.fetchall()]

            custom_logger.debug(f"Fetched {len(rows)} rows from table {body.table_name}")
            return {
                "status": "ok",
                "table_name": body.table_name,
                "total": total,
                "start": body.start,
                "limit": body.limit,
                "has_more": (body.start + body.limit) < total,
                "data": rows
            }
    except Exception as e:
        custom_logger.error(f"Error fetching table data from {body.table_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching table data: {str(e)}")
