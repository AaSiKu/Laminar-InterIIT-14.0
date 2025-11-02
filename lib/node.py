from pydantic import BaseModel

# Base Node Classe
class Node(BaseModel):
    category: str
    node_id: str
