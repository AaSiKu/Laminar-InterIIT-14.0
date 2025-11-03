import os
import uuid
import asyncio
import time
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from rag.rag_pipeline import PathwayRAGSystem
from rag.constant import UPLOADS_DIR

load_dotenv()

app = FastAPI(
    title="Pathway RAG API",
    description="A RAG system using FastAPI and Pathway",
)

rag_system: PathwayRAGSystem | None = None

# TODO: Lookinto https://fastapi.tiangolo.com/advanced/events/#async-context-manager
@app.on_event("startup")
async def startup_event():
    global rag_system
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    
    print("Initializing RAG system...")
    rag_system = PathwayRAGSystem(data_dir=UPLOADS_DIR, results_store=results_store)
    rag_system.run_aside()
    print("RAG system initialized and running.")


# --- Pydantic Models ---
class QueryRequest(BaseModel):
    query: str
class RetrieveRequest(BaseModel):
    query: str
    k: int = 5
class UploadResponse(BaseModel):
    filename: str
    status: str
class RetrieveResponse(BaseModel):
    results: List[Dict[str, Any]]
class RAGResponse(BaseModel):
    response: str

# --- Helper Function for Polling ---
# Store results in memory
results_store = {}

def store_results():
    """Background function to capture results from Pathway tables."""
    # This will be called by Pathway's output connector
    pass

async def poll_for_result(
    request_id: str, 
    timeout: int = 30
) -> Dict:
    """Poll for a result matching the request_id from our results store."""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if request_id in results_store:
            result = results_store.pop(request_id)
            return result
        
        await asyncio.sleep(0.1)
        
    raise HTTPException(status_code=408, detail="Request timed out")


# --- API Endpoints ---

@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOADS_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        return {"filename": file.filename, "status": "file saved and processing"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@app.put("/retrieve", response_model=RetrieveResponse)
async def get_retrieval(request: RetrieveRequest):
    if not rag_system:
        raise HTTPException(status_code=503, detail="RAG system not initialized")

    request_id = str(uuid.uuid4())
    
    # Push query to connector
    rag_system.retrieve_connector.push({
        "request_id": request_id,
        "query": request.query,
        "k": request.k
    })
    
    try:
        result = await poll_for_result(request_id, timeout=30)
        
        # Parse the result JSON from DocumentStore
        result_json = result.get('result', []) if isinstance(result, dict) else result
        if hasattr(result_json, 'as_list'):
            result_list = result_json.as_list()
        elif isinstance(result_json, list):
            result_list = result_json
        else:
            result_list = []
        
        formatted_results = []
        for doc in result_list[:request.k]:
            if hasattr(doc, 'get'):
                formatted_results.append({
                    "text": doc.get("text", ""),
                    "metadata": doc.get("metadata", {}), 
                    "score": doc.get("dist", 0.0)
                })
            elif isinstance(doc, str):
                formatted_results.append({
                    "text": doc,
                    "metadata": {},
                    "score": 0.0
                })
            else:
                formatted_results.append({
                    "text": str(doc),
                    "metadata": {},
                    "score": 0.0
                })
        
        return {"results": formatted_results}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during retrieval: {str(e)}")


@app.put("/response", response_model=RAGResponse)
async def get_response(request: QueryRequest):
    if not rag_system:
        raise HTTPException(status_code=503, detail="RAG system not initialized")

    request_id = str(uuid.uuid4())
    
    # Push query to connector
    rag_system.response_connector.push({
        "request_id": request_id,
        "query": request.query
    })
    
    try:
        result = await poll_for_result(request_id, timeout=30)
        
        # Handle result safely
        if isinstance(result, dict):
            response_text = result.get('response', 'No response generated.')
        elif isinstance(result, str):
            response_text = result
        else:
            response_text = str(result)
            
        return {"response": response_text}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during RAG response: {str(e)}")