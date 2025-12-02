from mcp.server.fastmcp import FastMCP
from gateway import MCPSecurityGateway

gateway = MCPSecurityGateway()
mcp = FastMCP("secure-invoice-server")

def _actual_db_fetch(query) -> bool:
    return True

@mcp.tool()
async def get_invoice(user_id: str, invoice_id: str) -> bool:
    decision = gateway.execute_secure_request(
        user_id=user_id,
        agent_role="invoice_reader",
        method="GET",
        url=f"https://api.internal/invoices/{invoice_id}",
        resource_id=invoice_id
    )
    
    if "error" in decision:
        raise RuntimeError(f"Security Blocked: {decision['error']}")
        
    return _actual_db_fetch(f"SELECT * FROM invoices WHERE id={invoice_id}")


if __name__ == '__main__':
    mcp.run() 