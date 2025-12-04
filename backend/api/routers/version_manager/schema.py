from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel

# ------- User Actions on Workflow --------- #

class Alert(BaseModel):
    actions: List[str]
    action_taken: Optional[str] = None
    taken_at: Optional[datetime] = None
    action_executed_by : Optional[str] = None
    action_executed_by_user:Optional[Any]
    status:Optional[str] #status of notification (pending, resolved, ignored)

class Notification(BaseModel):
    pipeline_id:str
    title: str
    desc: str
    alert: Optional[Alert] = None
    type:str  #type of notification (success, error, warning, info, alert)
    timestamp: Optional[datetime] = datetime.now()
    #status only exist in alerts

# class Log(BaseModel):
#     pipeline_id: str
#     level: str  # log level (debug, info, warning, error, critical)
#     message: str
#     details: Optional[dict] = None  # additional log details/metadata
#     timestamp: Optional[datetime] = datetime.now()
#     source: Optional[str] = None  # source of the log (e.g., "agent", "pipeline", "system")


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
    last_updated: datetime
    last_started: datetime
    runtime: int
    name:str


class Version(BaseModel):
    user_id: str
    version_description: str
    version_created_at: datetime
    version_updated_at: datetime
    pipeline: Any
    pipeline_id: str

class save_workflow_payload(BaseModel):
    version_updated_at: datetime
    version_description: str
    current_version_id: str
    workflow_id: str
    pipeline: Any

class save_draft_payload(BaseModel):
    version_id:str
    pipeline_id:str
    pipeline:Any
    version_description:Optional[str]

class retrieve_payload(BaseModel):
    workflow_id: str
    version_id: str

class UpdateNotificationAction(BaseModel):
    action_taken: str
    taken_at: str