from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel

# ------- User Actions on Workflow --------- #

class Notification(BaseModel):
    notification_id: str
    notification_message: str
    notification_created_at: datetime
    notification_role: List[str]
    notification_sensitivity: str
    notification_status:str
    action_choices:List[str]
    action_chosen: str
    action_execute_time:str
    action_executed_by:str


class Graph(BaseModel):
    pipeline_id: Optional[str] = None
    user_id: str
    current_version_id: str
    versions: List[str]
    start_Date: datetime
    status: str
    container_id: str 
    agent_container_id: str
    agent_port: str
    agent_ip: str
    notification: List[Notification]
    host_port: str
    host_ip: str

class Version(BaseModel):
    version_id: str
    version_description: str
    version_created_at: datetime
    version_updated_at: datetime
    pipeline: Any

class save_graph_payload(BaseModel):
    version_updated_at: datetime
    version_description: str
    current_version_id: str
    pipeline_id: str
    pipeline: Any

class retrieve_payload(BaseModel):
    pipeline_id: str
    version_id: str
