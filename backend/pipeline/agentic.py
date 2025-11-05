from typing import List, TypedDict
from lib.agent import Agent
import pathway as pw
from pathway.xpacks.llm.mcp_server import McpServable, McpServer, PathwayMcp


class EmptyRequestSchema(pw.Schema):
    pass

class DType(TypedDict):
    type: str

class ColumnSchema(pw.Schema):
    name: str
    dtype: DType
    primary_key: bool
    description: str



class TableTools(McpServable):
    def __init__(self,_table : pw.Table,*args,**kwargs, ):
        self._table = _table
        super().__init__(self,*args,**kwargs)
    
    def sql(self,_) -> pw.Table:
        # Execute sql query on table and return result after applying ndarray reducer on the table
        pass
    
    def get_table_schema(self) -> pw.Table:
        columns = self._table.schema.columns_to_json_serializable_dict()["columns"]

        return pw.debug.table_from_rows(ColumnSchema, [(col["name"],col["dtype"], col["primary_key"], col["description"]) for col in columns])
    
    def return_single_row_table(self,_) -> pw.Table:
        # will only be called if the table has one row
        pass

    def register_mcp(self, server: McpServer):
        server.tool(
            "get_table_schema",
            request_handler=self.get_table_schema,
            schema=EmptyRequestSchema,
            output_schema=ColumnSchema
        )
def build_agentic_graph(agents: List[Agent]):
    pass