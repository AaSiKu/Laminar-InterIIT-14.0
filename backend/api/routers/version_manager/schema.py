from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel

# ------- User Actions on Workflow --------- #

class Alert(BaseModel):
    actions: List[str]
    action_taken: Optional[str] = None
    taken_at: Optional[datetime] = None
    action_executed_by:str

class Notification(BaseModel):
    user_id: str
    pipeline_id:str
    title: str
    desc: str
    action: str
    alert: Optional[Alert] = None
    type:str  #type of notification (alert, notification)
    timestamp: Optional[datetime] = datetime.now()
    notification_role: List[str] #roles of users who will receive the notification
    notification_status:str #status of notification (pending, resolved, ignored)


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
    last_started: datetime
    runtime: int


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

class add_viewer_payload(BaseModel):
    pipeline_id: str
    user_id: str

class remove_viewer_payload(BaseModel):
    pipeline_id: str
    user_id: str

class create_pipeline_with_details_payload(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = ""
    viewer_ids: List[str] = []
    pipeline: Any  # Contains nodes, edges, viewport structure
