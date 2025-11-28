from langchain_community.utilities.sql_database import SQLDatabase
import json
from langchain_community.tools import QuerySQLDataBaseTool
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from postgres_util import postgre_engine
from langchain_core.tools import tool

class TablePayload(BaseModel):
    table_name: str
    table_schema: Dict[str,Any]
    description: str


def create_sql_tool(tables: List[TablePayload], agent_name: str):
            _db_instance: Optional[SQLDatabase] = None
            _sql_tool: Optional[QuerySQLDataBaseTool] = None
            db_description = (
                f"SQL query tool. Read-only access to:\n\n"
                
                f"{chr(10).join([f'{i+1}. {table.table_name}: {table.description}{chr(10)}\nColumns: {json.dumps(table.table_schema)}' for i, table in enumerate(tables)])}\n\n"
                
                "INPUT: Valid SQL SELECT statement\n"
                "OUTPUT: Query results (interpret these into natural language)\n\n"
                
                "USAGE TIPS:\n"
                "- Verify column names against schema before querying\n"
                "- Use WHERE clauses for filtering\n"
                "- Convert Unix timestamps to readable format\n"
                "- If query fails, analyze the error and retry with corrected SQL\n"
            )
            def lazy_init():
                nonlocal _db_instance, _sql_tool
                if _sql_tool is None:
                    _db_instance = SQLDatabase(
                        postgre_engine, 
                        include_tables=[table.table_name for table in tables]
                    )
                    
                    _sql_tool = QuerySQLDataBaseTool(db=_db_instance)
                return _sql_tool
            
            @tool("query_database", description=db_description)
            def query_db(query: str) -> str:
                sql_tool = lazy_init()
                raw_result = sql_tool.invoke(query)
                # The agent's LLM will see this raw result and convert it per the guidelines above
                return raw_result
            return query_db