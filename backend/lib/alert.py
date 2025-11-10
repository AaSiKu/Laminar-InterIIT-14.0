from .node import Node
from typing import Literal
from pydantic import BaseModel


class AlertResponse(BaseModel):
    type: Literal["warning","error","info"]
    message: str

class AlertNode:
    node_id : Literal["alert"]
    category: Literal["action"]
    alert_prompt: str
