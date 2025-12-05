"""
FastAPI Server for Error-Action Registry
Provides REST API for managing error-to-action mappings with MongoDB backend
"""

import logging
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os

from Errors_table.error_action_registry import ErrorActionRegistry

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Global registry instance
registry: Optional[ErrorActionRegistry] = None


# =============================================================================
# Pydantic Models
# =============================================================================

class ErrorMapping(BaseModel):
    """Model for error-action mapping"""
    error: str = Field(..., description="Error identifier/pattern")
    actions: List[str] = Field(..., description="Ordered list of action IDs to execute")
    description: str = Field(..., description="Human-readable description of the error")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "DatabaseConnectionTimeout",
                "actions": ["check-db-health", "restart-db-connection-pool", "restart-db-service"],
                "description": "Database connection pool exhausted or database is unresponsive"
            }
        }


class ErrorMappingResponse(ErrorMapping):
    """Response model with additional metadata"""
    pass


class BulkMappingsRequest(BaseModel):
    """Request model for bulk adding mappings"""
    mappings: List[ErrorMapping] = Field(..., description="List of error mappings to add")
    
    class Config:
        json_schema_extra = {
            "example": {
                "mappings": [
                    {
                        "error": "HighMemoryUsage",
                        "actions": ["clear-cache", "restart-service", "scale-up-instances"],
                        "description": "Service memory usage exceeded 90% threshold"
                    },
                    {
                        "error": "DiskSpaceFull",
                        "actions": ["clear-temp-files", "archive-old-logs", "expand-disk-volume"],
                        "description": "Disk usage at 95%, no space left on device"
                    }
                ]
            }
        }


class BulkMappingsResponse(BaseModel):
    """Response model for bulk operations"""
    count: int = Field(..., description="Number of mappings added/updated")
    message: str = Field(..., description="Operation result message")


class DeleteResponse(BaseModel):
    """Response model for delete operations"""
    success: bool = Field(..., description="Whether deletion was successful")
    message: str = Field(..., description="Operation result message")


class SyncResponse(BaseModel):
    """Response model for sync operations"""
    success: bool = Field(..., description="Whether sync was successful")
    count: int = Field(..., description="Number of mappings synced")
    message: str = Field(..., description="Operation result message")


# =============================================================================
# FastAPI Lifespan
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Establishes MongoDB connection on startup and closes on shutdown.
    """
    global registry
    
    # Startup: Initialize registry and connect to MongoDB
    logger.info("=" * 60)
    logger.info("Starting Error Registry API Server")
    logger.info("=" * 60)
    
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    database_name = os.getenv("MONGODB_DATABASE", "runbook")
    local_file_path = os.getenv("ERRORS_JSON_PATH", "Errors.json")
    
    logger.info(f"MongoDB URI: {mongodb_uri}")
    logger.info(f"Database: {database_name}")
    logger.info(f"Local file: {local_file_path}")
    
    try:
        registry = ErrorActionRegistry(
            mongodb_uri=mongodb_uri,
            database_name=database_name,
            local_file_path=local_file_path
        )
        await registry.connect()
        logger.info("Error registry initialized and connected")
        
        # Initial sync to ensure local file is up to date
        await registry.force_sync()
        logger.info("Initial sync completed")
        
    except Exception as e:
        logger.error(f"Failed to initialize error registry: {e}")
        raise
    
    logger.info("=" * 60)
    logger.info("Server ready to accept requests")
    logger.info("=" * 60)
    
    yield
    
    # Shutdown: Close MongoDB connection
    logger.info("Shutting down Error Registry API Server...")
    if registry:
        await registry.close()
        logger.info("MongoDB connection closed")
    logger.info("Server shutdown complete")


# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="Error-Action Registry API",
    description="REST API for managing error-to-action mappings with MongoDB backend and local Errors.json sync",
    version="1.0.0",
    lifespan=lifespan
)


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "service": "Error-Action Registry API",
        "status": "running",
        "version": "1.0.0"
    }


@app.post(
    "/mappings",
    response_model=ErrorMappingResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Mappings"]
)
async def add_error_mapping(mapping: ErrorMapping):
    """
    Add or update an error-to-actions mapping.
    Automatically syncs to local Errors.json file.
    """
    try:
        result = await registry.add_error_mapping(
            error=mapping.error,
            actions=mapping.actions,
            description=mapping.description
        )
        return result
    except Exception as e:
        logger.error(f"Failed to add mapping: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add mapping: {str(e)}"
        )


@app.get(
    "/mappings/{error}",
    response_model=ErrorMappingResponse,
    tags=["Mappings"]
)
async def get_error_mapping(error: str):
    """
    Get actions for a specific error identifier.
    """
    try:
        mapping = await registry.get_error_mapping(error)
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No mapping found for error: {error}"
            )
        return mapping
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get mapping: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get mapping: {str(e)}"
        )


@app.get(
    "/mappings",
    response_model=List[ErrorMappingResponse],
    tags=["Mappings"]
)
async def list_all_mappings():
    """
    List all error-action mappings.
    Returns all mappings sorted by error identifier.
    """
    try:
        mappings = await registry.list_all_mappings()
        return mappings
    except Exception as e:
        logger.error(f"Failed to list mappings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list mappings: {str(e)}"
        )


@app.delete(
    "/mappings/{error}",
    response_model=DeleteResponse,
    tags=["Mappings"]
)
async def delete_error_mapping(error: str):
    """
    Delete an error mapping.
    Automatically syncs to local Errors.json file.
    """
    try:
        deleted = await registry.delete_error_mapping(error)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No mapping found for error: {error}"
            )
        return {
            "success": True,
            "message": f"Successfully deleted mapping for error: {error}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete mapping: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete mapping: {str(e)}"
        )


@app.post(
    "/mappings/bulk",
    response_model=BulkMappingsResponse,
    tags=["Mappings"]
)
async def bulk_add_mappings(request: BulkMappingsRequest):
    """
    Bulk add or update multiple error mappings.
    Automatically syncs to local Errors.json file after all operations.
    """
    try:
        mappings_dicts = [mapping.model_dump() for mapping in request.mappings]
        count = await registry.bulk_add_mappings(mappings_dicts)
        return {
            "count": count,
            "message": f"Successfully added/updated {count} mappings"
        }
    except Exception as e:
        logger.error(f"Failed to bulk add mappings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk add mappings: {str(e)}"
        )


@app.post(
    "/sync",
    response_model=SyncResponse,
    tags=["System"]
)
async def force_sync():
    """
    Force synchronization from MongoDB to local Errors.json file.
    Use this to manually refresh the local file.
    """
    try:
        await registry.force_sync()
        mappings = await registry.list_all_mappings()
        return {
            "success": True,
            "count": len(mappings),
            "message": f"Successfully synced {len(mappings)} mappings to Errors.json"
        }
    except Exception as e:
        logger.error(f"Failed to sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync: {str(e)}"
        )


@app.get(
    "/local",
    response_model=List[ErrorMappingResponse],
    tags=["System"]
)
async def load_from_local_file():
    """
    Load error mappings from local Errors.json file.
    Useful for checking local file contents without querying MongoDB.
    """
    try:
        mappings = registry.load_from_local_file()
        return mappings
    except Exception as e:
        logger.error(f"Failed to load from local file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load from local file: {str(e)}"
        )


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("ERROR_REGISTRY_PORT", "8001"))
    
    uvicorn.run(
        "error_registry_api:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
