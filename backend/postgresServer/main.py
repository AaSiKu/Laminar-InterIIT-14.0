"""
PostgreSQL FastAPI Server
Fetches paginated data from PostgreSQL database for node data visualization
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

app = FastAPI(title="PostgreSQL Data Server", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "database": os.getenv("POSTGRES_DB", "pathway_db"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
    "sslmode": os.getenv("POSTGRES_SSLMODE", "prefer"),  # 'require' for Supabase, 'prefer' for local
}


def get_db_connection():
    """Create and return a database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "PostgreSQL Data Server",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/node-data/{node_id}")
async def get_node_data(
    node_id: str,
    start_row: int = Query(0, ge=0, description="Starting row index (0-based)"),
    limit: int = Query(5, ge=1, le=100, description="Number of rows to fetch (max 100)"),
    table_name: Optional[str] = Query("node_data", description="Table name to query")
):
    """
    Fetch paginated data for a specific node
    
    Args:
        node_id: The ID of the node
        start_row: Starting row index (0-based)
        limit: Number of rows to fetch (default 5, max 100)
        table_name: Name of the table to query
    
    Returns:
        {
            "node_id": str,
            "data": List[Dict],
            "total_rows": int,
            "start_row": int,
            "limit": int,
            "has_more": bool,
            "timestamp": str
        }
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # For now, we fetch from a single table regardless of node_id
        # Later, you can implement node_id-specific table mapping
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM {table_name}"
        cursor.execute(count_query)
        total_rows = cursor.fetchone()["total"]
        
        # Fetch paginated data
        data_query = f"""
            SELECT * FROM {table_name}
            ORDER BY id
            LIMIT %s OFFSET %s
        """
        cursor.execute(data_query, (limit, start_row))
        rows = cursor.fetchall()
        
        # Convert to list of dicts
        data = [dict(row) for row in rows]
        
        # Check if there are more rows
        has_more = (start_row + limit) < total_rows
        
        return {
            "node_id": node_id,
            "data": data,
            "total_rows": total_rows,
            "start_row": start_row,
            "limit": limit,
            "has_more": has_more,
            "timestamp": datetime.now().isoformat()
        }
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.get("/api/tables")
async def list_tables():
    """List all available tables in the database"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """
        cursor.execute(query)
        tables = [row["table_name"] for row in cursor.fetchall()]
        
        return {
            "tables": tables,
            "count": len(tables)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing tables: {str(e)}")
    finally:
        if conn:
            conn.close()


@app.get("/api/table-info/{table_name}")
async def get_table_info(table_name: str):
    """Get column information for a specific table"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
        """
        cursor.execute(query, (table_name,))
        columns = cursor.fetchall()
        
        if not columns:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
        
        return {
            "table_name": table_name,
            "columns": [dict(col) for col in columns]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching table info: {str(e)}")
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)


