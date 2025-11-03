import os
import uuid
import asyncio
import time
import logging
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from rag_pipeline import PathwayRAGSystem

# setting up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Suppress verbose logging from uvicorn and other libraries
logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
logging.getLogger('pathway_engine').setLevel(logging.WARNING)
logging.getLogger('pathway_engine.connectors.monitoring').setLevel(logging.ERROR)

# --- Configuration ---
UPLOADS_DIR = "./uploads"
SUPPORTED_EXTENSIONS = {
    '.pdf', '.txt', '.md', '.doc', '.docx', '.xls', '.xlsx', 
    '.ppt', '.pptx', '.csv', '.json', '.xml', '.html', '.htm'
} # NOTE: IMAGES NOT SUPPORTED FOR NOW..

app = FastAPI(
    title="Pathway RAG API",
    description="A RAG system using FastAPI and Pathway",
)

rag_system: PathwayRAGSystem | None = None

@app.on_event("startup")
async def startup_event():
    """Initialize the RAG system on startup."""
    global rag_system
    
    # validate if api key exists
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        logger.error("❌ GOOGLE_API_KEY not set in .env file!")
        raise RuntimeError("GOOGLE_API_KEY environment variable is required. Please set it in .env file.")
    
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    
    try:
        logger.info("🚀 Initializing RAG system...")
        rag_system = PathwayRAGSystem(data_dir=UPLOADS_DIR, results_store=results_store)
        rag_system.run_aside()
        logger.info("✅ RAG system ready")
    except Exception as e:
        logger.error(f"❌ Failed to initialize RAG system: {str(e)}")
        raise


# --- Pydantic Models ---
class QueryRequest(BaseModel):
    query: str
class RetrieveRequest(BaseModel):
    query: str
    k: int = 5
class UploadResponse(BaseModel):
    filename: str
    original_filename: str
    status: str
class RetrieveResponse(BaseModel):
    results: List[Dict[str, Any]]
class RAGResponse(BaseModel):
    response: str


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
    """
    Poll for a result matching the request_id from our results store.
    
    Args:
        request_id: Unique identifier for the request
        timeout: Maximum time to wait in seconds
        
    Returns:
        Result dictionary from Pathway pipeline
        
    Raises:
        HTTPException: If timeout is reached or other errors occur
    """
    start_time = time.time()
    
    try:
        while time.time() - start_time < timeout:
            if request_id in results_store:
                result = results_store.pop(request_id)
                return result
            
            await asyncio.sleep(0.1)
        
        logger.warning(f"⏱️  Request timed out after {timeout}s")
        raise HTTPException(
            status_code=408, 
            detail=f"Request timed out after {timeout} seconds. The system may be processing a large number of documents."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Polling error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving result: {str(e)}")


# --- API Endpoints ---

@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a document for indexing.
    Supports: PDF, CSV, MD, XLSX, DOC, DOCX, PPTX, TXT, JSON, XML, HTML
    Files are saved with unique IDs to prevent overwrites.
    """
    try:
        # Validate file was provided
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file extension
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in SUPPORTED_EXTENSIONS:
            logger.warning(f"⚠️  Unsupported file type: {file.filename} ({file_extension})")
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )
        
        # Generate unique filename to prevent overwrites
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOADS_DIR, unique_filename)
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"📄 Uploaded: {file.filename} ({len(content)} bytes)")
        
        return {
            "filename": unique_filename,
            "original_filename": file.filename,
            "status": "file saved and processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Upload failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to upload file: {str(e)}"
        )


@app.put("/retrieve", response_model=RetrieveResponse)
async def get_retrieval(request: RetrieveRequest):
    """
    Retrieve relevant document chunks for a query.
    Returns top-k most similar chunks with metadata and similarity scores.
    """
    if not rag_system:
        raise HTTPException(status_code=503, detail="RAG system not initialized")

    request_id = str(uuid.uuid4())
    logger.info(f"🔍 Retrieve: '{request.query[:50]}...' (k={request.k})")
    
    try:
        # Push query to connector
        rag_system.retrieve_connector.push({
            "request_id": request_id,
            "query": request.query,
            "k": request.k
        })
        
        # Wait for result
        result = await poll_for_result(request_id, timeout=30)
        
        # Parse the result JSON from DocumentStore
        result_json = result.get('result', []) if isinstance(result, dict) else result
        if hasattr(result_json, 'as_list'):
            result_list = result_json.as_list()
        elif isinstance(result_json, list):
            result_list = result_json
        else:
            result_list = []
        
        # Format results with proper error handling
        formatted_results = []
        for idx, doc in enumerate(result_list[:request.k]):
            try:
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
            except Exception as e:
                logger.warning(f"⚠️  Skipped doc {idx}: {str(e)}")
                continue
        
        logger.info(f"✅ Retrieved {len(formatted_results)} results")
        return {"results": formatted_results}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Retrieval error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error during retrieval: {str(e)}"
        )


@app.put("/response", response_model=RAGResponse)
async def get_response(request: QueryRequest):
    """
    Get an LLM-generated response using RAG.
    Retrieves relevant context and generates an answer using Gemini.
    """
    if not rag_system:
        raise HTTPException(status_code=503, detail="RAG system not initialized")

    request_id = str(uuid.uuid4())
    logger.info(f"💬 Query: '{request.query[:50]}...'")
    
    try:
        # Push query to connector
        rag_system.response_connector.push({
            "request_id": request_id,
            "query": request.query
        })
        
        # Wait for result
        result = await poll_for_result(request_id, timeout=30)
        
        # Handle result safely
        if isinstance(result, dict):
            response_text = result.get('response', 'No response generated.')
        elif isinstance(result, str):
            response_text = result
        else:
            response_text = str(result)
        
        logger.info(f"✅ Response generated ({len(response_text)} chars)")
        return {"response": response_text}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Response error: {str(e)}")
        
        # Check for specific error types
        error_msg = str(e).lower()
        if "rate" in error_msg and "limit" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please try again in a few moments."
            )
        elif "api" in error_msg and "key" in error_msg:
            raise HTTPException(
                status_code=500,
                detail="API key error. Please check your GOOGLE_API_KEY environment variable."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error during RAG response: {str(e)}"
            )