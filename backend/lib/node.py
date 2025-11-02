from pydantic import BaseModel

# Base Node Class
class Node(BaseModel):
    category: str
    node_id: str
    n_inputs : int