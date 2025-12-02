from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel

# ------- User Actions on Workflow --------- #

class Notification(BaseModel):
    user_id:str
    pipeline_id:str
    notification_message: str
    notification_created_at: datetime
    notification_role: List[str]
    notification_sensitivity: str
    notification_status:str
    action_choices:List[str]
    action_chosen: str
    action_execute_time:str
    action_executed_by:str


class Workflow(BaseModel):
    owner_ids: List[str]
    last_spin_up_down_run_stop_by: Optional[str] = None
    viewer_ids: List[str]
    current_version_id: str
    versions: List[str]
    start_Date: datetime
    status: str
    container_id: str 
    agent_container_id: str
    agentic_host_port: str
    agent_ip: str
    notification: List[Notification]
    pipeline_host_port: str
    host_ip: str
    db_host_port: Optional[str] = None

class Version(BaseModel):
    user_id: str
    version_description: str
    version_created_at: datetime
    version_updated_at: datetime
    pipeline: Any

class save_workflow_payload(BaseModel):
    version_updated_at: datetime
    version_description: str
    current_version_id: str
    workflow_id: str
    pipeline: Any

class save_draft_payload(BaseModel):
    version_id:str
    pipeline:Any
    version_description:Optional[str]

class retrieve_payload(BaseModel):
    workflow_id: str
    version_id: str
