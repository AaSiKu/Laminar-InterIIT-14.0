from typing import List
import pathway as pw
import httpx
import os
from lib.agents import AlertNode

agentic_url = os.getenv("AGENTIC_URL")

class AlertResponseSchema(pw.Schema):
    type: str
    message: str

class GenerateAlert(pw.AsyncTransformer, output_schema=AlertResponseSchema):
    alert_node: AlertNode
    
    def __init__(self, alert_node: AlertNode, *args, **kwargs):
        self.alert_node = alert_node
        super().__init__(*args, **kwargs)
    
    async def invoke(self, **kwargs) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{agentic_url.rstrip('/')}/generate-alert",
                json=dict(
                    alert_prompt=self.alert_node.alert_prompt,
                    trigger_description=self.alert_node.input_trigger_description,
                    trigger_data=kwargs,
                ),
            )
            resp.raise_for_status()
            data = resp.json()
            return data["alert"]

SASL_USERNAME = os.getenv("KAFKA_SASL_USERNAME", None)
SASL_PASSWORD = os.getenv("KAFKA_SASL_PASSWORD", None)
SASL_MECHANISM = os.getenv("KAFKA_SASL_MECHANISM", None)
SECURITY_PROTOCOL = os.getenv("KAFKA_SECURITY_PROTOCOL", None)

def alert_node_fn(inputs: List[pw.Table], alert_node: AlertNode):
    trigger_table = inputs[0]
    alerts = GenerateAlert(alert_node, input_table=trigger_table).successful

    pipeline_id = os.getenv("PIPELINE_ID")
    config = {
        "bootstrap.servers": os.getenv("KAFKA_BOOTSTRAP_SERVER", "host.docker.internal:9092"),
        "client.id": os.getenv("KAFKA_CLIENT_ID", pipeline_id),
        "linger.ms": "5",
        "batch.num.messages": "10000",
        "compression.type": "lz4",
    }
    if SASL_USERNAME:
        config = {
            **config,
            "security.protocol": SECURITY_PROTOCOL,
            "sasl.mechanisms": SASL_MECHANISM,
            "sasl.username": SASL_USERNAME,
            "sasl.password": SASL_PASSWORD,
        }
    pw.io.kafka.write(
        alerts.select(*pw.this, pipeline_id=pipeline_id),
        rdkafka_settings=config,
        topic_name=f"alert_{pipeline_id}",
        format="json"
    )
    return alerts
