"""
Mock server for testing WebSocket flow without LLM calls.
Returns predetermined responses to simulate the agentic pipeline builder.
"""

import json
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uuid
import shutil
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Ensure the default generated_flowcharts directory exists on startup
DEFAULT_OUTPUT_DIR = Path(__file__).parent / "generated_flowcharts"
DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# Mock responses for testing
MOCK_PHASE1_FLOWCHART = {
    "nodes": [
        {
            "id": "n1",
            "schema": {
                "properties": {
                    "category": {"const": "io", "title": "Category", "type": "string"},
                    "node_id": {"const": "open_tel_spans_input", "title": "Node Id", "type": "string"},
                    "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                    "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                    "name": {"default": "", "title": "Name", "type": "string"},
                    "n_inputs": {"const": 0, "default": 0, "title": "N Inputs", "type": "integer"},
                    "topic": {"title": "Topic", "type": "string"},
                    "rdkafka_settings": {
                        "title": "Rdkafka Settings",
                        "type": "object",
                        "properties": {
                            "bootstrap_servers": {"type": "string"},
                            "group_id": {"type": "string"},
                            "auto_offset_reset": {"enum": ["earliest", "latest"], "type": "string"}
                        }
                    }
                },
                "required": ["category", "node_id", "topic"],
                "title": "OpenTelSpansInputNode",
                "type": "object"
            },
            "type": "open_tel_spans_input",
            "position": {"x": -861, "y": 179},
            "node_id": "open_tel_spans_input",
            "category": "io",
            "data": {
                "ui": {"label": "OpenTelSpansInputNode Node", "iconUrl": ""},
                "properties": {
                    "category": "io",
                    "node_id": "open_tel_spans_input",
                    "tool_description": "",
                    "trigger_description": "",
                    "name": "",
                    "n_inputs": 0,
                    "topic": "otlp_spans",
                    "rdkafka_settings": {
                        "bootstrap_servers": "localhost:9092",
                        "group_id": "pathway-consumer",
                        "auto_offset_reset": "earliest"
                    }
                }
            },
            "measured": {"width": 200, "height": 249},
            "selected": false
        },
        {
            "id": "n2",
            "schema": {
                "properties": {
                    "category": {"const": "table", "title": "Category", "type": "string"},
                    "node_id": {"const": "filter", "title": "Node Id", "type": "string"},
                    "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                    "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                    "name": {"default": "", "title": "Name", "type": "string"},
                    "n_inputs": {"const": 1, "default": 1, "title": "N Inputs", "type": "integer"},
                    "filters": {
                        "title": "Filters",
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "col": {"type": "string"},
                                "op": {"type": "string"},
                                "value": {"type": ["string", "number", "boolean"]}
                            }
                        }
                    }
                },
                "required": ["category", "node_id", "filters"],
                "title": "FilterNode",
                "type": "object"
            },
            "type": "filter",
            "position": {"x": -480, "y": 182},
            "node_id": "filter",
            "category": "table",
            "data": {
                "ui": {"label": "FilterNode Node", "iconUrl": ""},
                "properties": {
                    "category": "table",
                    "node_id": "filter",
                    "tool_description": "",
                    "trigger_description": "",
                    "name": "server_spans_filter",
                    "n_inputs": 1,
                    "filters": [
                        {"col": "span.kind", "op": "==", "value": "SERVER"}
                    ]
                }
            },
            "measured": {"width": 200, "height": 249},
            "selected": false
        }
    ],
    "edges": [
        {
            "source": "n1",
            "sourceHandle": "out",
            "target": "n2",
            "targetHandle": "in_0",
            "animated": true,
            "id": "xy-edge__n1out-n2in_0"
        }
    ]
}

MOCK_MACRO_PLAN = {
    "steps": [
        "Filter n1 to create n4: failed server spans where status_code indicates error",
        "Group n4 by service.name to count errors per service",
        "Calculate error rate as percentage"
    ],
    "metric_description": "Error rate for server spans"
}

MOCK_NODES = [
    {
        "id": "n3",
        "schema": {
            "properties": {
                "category": {"const": "table", "title": "Category", "type": "string"},
                "node_id": {"const": "filter", "title": "Node Id", "type": "string"},
                "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                "name": {"default": "", "title": "Name", "type": "string"},
                "n_inputs": {"const": 1, "default": 1, "title": "N Inputs", "type": "integer"},
                "filters": {
                    "title": "Filters",
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "col": {"type": "string"},
                            "op": {"type": "string"},
                            "value": {"type": ["string", "number", "boolean"]}
                        }
                    }
                }
            },
            "required": ["category", "node_id", "filters"],
            "title": "FilterNode",
            "type": "object"
        },
        "type": "filter",
        "position": {"x": -200, "y": 100},
        "node_id": "filter",
        "category": "table",
        "data": {
            "ui": {"label": "FilterNode Node", "iconUrl": ""},
            "properties": {
                "category": "table",
                "node_id": "filter",
                "tool_description": "",
                "trigger_description": "",
                "name": "failed_spans_filter",
                "n_inputs": 1,
                "filters": [
                    {"col": "status.code", "op": "==", "value": 2}
                ]
            }
        },
        "measured": {"width": 200, "height": 249},
        "selected": false
    },
    {
        "id": "n4",
        "schema": {
            "properties": {
                "category": {"const": "table", "title": "Category", "type": "string"},
                "node_id": {"const": "groupby", "title": "Node Id", "type": "string"},
                "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                "name": {"default": "", "title": "Name", "type": "string"},
                "n_inputs": {"const": 1, "default": 1, "title": "N Inputs", "type": "integer"},
                "groupby_columns": {"title": "Groupby Columns", "type": "array", "items": {"type": "string"}},
                "aggregations": {
                    "title": "Aggregations",
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "column": {"type": "string"},
                            "function": {"type": "string"},
                            "alias": {"type": "string"}
                        }
                    }
                }
            },
            "required": ["category", "node_id", "groupby_columns", "aggregations"],
            "title": "GroupbyNode",
            "type": "object"
        },
        "type": "groupby",
        "position": {"x": 50, "y": 100},
        "node_id": "groupby",
        "category": "table",
        "data": {
            "ui": {"label": "GroupbyNode Node", "iconUrl": ""},
            "properties": {
                "category": "table",
                "node_id": "groupby",
                "tool_description": "",
                "trigger_description": "",
                "name": "errors_by_service",
                "n_inputs": 1,
                "groupby_columns": ["service.name"],
                "aggregations": [
                    {"column": "span_id", "function": "count", "alias": "error_count"}
                ]
            }
        },
        "measured": {"width": 200, "height": 249},
        "selected": false
    },
    {
        "id": "n5",
        "schema": {
            "properties": {
                "category": {"const": "table", "title": "Category", "type": "string"},
                "node_id": {"const": "select", "title": "Node Id", "type": "string"},
                "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                "name": {"default": "", "title": "Name", "type": "string"},
                "n_inputs": {"const": 1, "default": 1, "title": "N Inputs", "type": "integer"},
                "columns": {"title": "Columns", "type": "array", "items": {"type": "string"}}
            },
            "required": ["category", "node_id", "columns"],
            "title": "SelectNode",
            "type": "object"
        },
        "type": "select",
        "position": {"x": 300, "y": 100},
        "node_id": "select",
        "category": "table",
        "data": {
            "ui": {"label": "SelectNode Node", "iconUrl": ""},
            "properties": {
                "category": "table",
                "node_id": "select",
                "tool_description": "",
                "trigger_description": "",
                "name": "error_rate_calc",
                "n_inputs": 1,
                "columns": ["service.name", "error_count"]
            }
        },
        "measured": {"width": 200, "height": 249},
        "selected": false
    }
]


class MockWSAgenticSession:
    """Mock WebSocket session that returns predetermined responses."""

    def __init__(
        self,
        metrics_list: List[Dict[str, Any]],
        output_dir: str = "./generated_flowcharts",
    ):
        self.metrics_list = metrics_list
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)
        
        self.phase1_flowchart = None
        self.phase2_graph = {"nodes": [], "edges": []}
        self.current_step = 0
        self.current_node_idx = 0

    async def run(self, ws: WebSocket):
        """Main session flow with mock responses."""
        await ws.send_json({
            "type": "session_start",
            "metrics": self.metrics_list,
            "message": f"[MOCK] Starting session for {len(self.metrics_list)} SLA metrics"
        })

        # Phase 1: Return mock flowchart after one interaction
        phase1_success = await self._run_mock_phase1(ws)
        if not phase1_success:
            await ws.send_json({"type": "done", "reason": "phase1_failed"})
            return

        # Save phase 1 flowchart
        self._save_flowchart()

        # Phase 2: Iterate through mock nodes
        phase2_success = await self._run_mock_phase2(ws)
        if not phase2_success:
            await ws.send_json({"type": "done", "reason": "phase2_failed"})
            return

        # Save final
        await self._save_final(ws)
        await ws.send_json({"type": "done", "reason": "complete"})

    async def _run_mock_phase1(self, ws: WebSocket) -> bool:
        """Mock Phase 1: return flowchart after user says 'ok' or similar."""
        await ws.send_json({
            "type": "phase",
            "phase": 1,
            "message": "[MOCK] Starting Phase 1: Input & Filter Builder"
        })

        await ws.send_json({
            "type": "metrics_summary",
            "metrics": self.metrics_list,
            "message": f"[MOCK] Loaded {len(self.metrics_list)} metrics"
        })

        # Send initial agent response
        await ws.send_json({
            "type": "agent_response",
            "phase": 1,
            "message": "[MOCK] I understand you want to track these metrics. Type 'ok' to accept the default filter configuration, or describe your filter requirements."
        })

        # Wait for user input
        await ws.send_json({"type": "await_input", "phase": 1})

        try:
            msg = await ws.receive_text()
            user_data = json.loads(msg)
            user_input = user_data.get("message", "").strip().lower()

            if user_input in ('quit', 'exit'):
                await ws.send_json({"type": "done", "reason": "quit"})
                return False

            # Accept any input and return mock flowchart
            self.phase1_flowchart = MOCK_PHASE1_FLOWCHART
            await ws.send_json({
                "type": "phase1_complete",
                "flowchart": self.phase1_flowchart,
                "message": "[MOCK] Phase 1 completed with mock flowchart"
            })
            return True

        except Exception as e:
            await ws.send_json({
                "type": "error",
                "message": f"[MOCK] Error: {str(e)}"
            })
            return False

    async def _run_mock_phase2(self, ws: WebSocket) -> bool:
        """Mock Phase 2: iterate through mock nodes with user approval."""
        await ws.send_json({
            "type": "phase",
            "phase": 2,
            "message": "[MOCK] Starting Phase 2: Metric Calculation Builder"
        })

        for metric_index, metric in enumerate(self.metrics_list):
            metric_name = metric.get("metric_name", f"metric_{metric_index}")

            await ws.send_json({
                "type": "metric_start",
                "metric_index": metric_index,
                "metric_name": metric_name,
                "filters": ["n2"],
                "filter_context": "[MOCK] Using server_spans_filter",
            })

            await ws.send_json({
                "type": "macro_plan",
                "metric_index": metric_index,
                "steps": MOCK_MACRO_PLAN["steps"],
                "metric_description": MOCK_MACRO_PLAN["metric_description"],
                "total_steps": len(MOCK_MACRO_PLAN["steps"]),
            })

            # Iterate through mock nodes
            last_node_id = "n2"  # Start from the filter node
            for step_index, mock_node in enumerate(MOCK_NODES):
                if step_index >= len(MOCK_MACRO_PLAN["steps"]):
                    break

                await ws.send_json({
                    "type": "step_start",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "total_steps": len(MOCK_MACRO_PLAN["steps"]),
                    "step": MOCK_MACRO_PLAN["steps"][step_index],
                })

                mock_edges = [{
                    "source": last_node_id,
                    "sourceHandle": "out",
                    "target": mock_node["id"],
                    "targetHandle": "in_0",
                    "animated": True,
                    "id": f"xy-edge__{last_node_id}out-{mock_node['id']}in_0"
                }]

                await ws.send_json({
                    "type": "node_proposed",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "node": mock_node,
                    "edges": mock_edges,
                })

                await ws.send_json({
                    "type": "await_approval",
                    "metric_index": metric_index,
                    "step_index": step_index,
                })

                try:
                    msg = await ws.receive_text()
                    approval_data = json.loads(msg)
                    action = approval_data.get("action")

                    if action == "quit":
                        await ws.send_json({"type": "done", "reason": "quit"})
                        return False
                    if action == "reject":
                        await ws.send_json({
                            "type": "status",
                            "message": f"[MOCK] Would regenerate step {step_index + 1}, but using same mock node",
                        })
                        # In mock, we just continue with same node
                    
                    # Add to phase2 graph
                    self.phase2_graph["nodes"].append(mock_node)
                    self.phase2_graph["edges"].extend(mock_edges)

                    await ws.send_json({
                        "type": "node_approved",
                        "metric_index": metric_index,
                        "step_index": step_index,
                        "message": f"[MOCK] Step {step_index + 1} approved",
                    })

                    # Update last_node_id for chaining
                    last_node_id = mock_node["id"]

                    # Save incremental flowchart
                    self._save_flowchart(step_index + 1)

                except Exception as e:
                    await ws.send_json({
                        "type": "error",
                        "message": f"[MOCK] Error: {str(e)}",
                    })
                    return False

        await ws.send_json({
            "type": "phase2_complete",
            "message": "[MOCK] Phase 2 completed successfully",
        })
        return True

    def _save_flowchart(self, step_index: Optional[int] = None):
        """Save current flowchart state."""
        merged = {
            "nodes": self.phase1_flowchart.get("nodes", []) + self.phase2_graph["nodes"],
            "edges": self.phase1_flowchart.get("edges", []) + self.phase2_graph["edges"],
            "agents": []
        }

        # Wrap the output to match the format of tests/pipeline/sample_flowchart1.json
        try:
            from bson import ObjectId
            oid = str(ObjectId())
            user_id = str(ObjectId()) 
            path_id = str(ObjectId())
        except ImportError:
            import uuid
            oid = uuid.uuid4().hex[:24]
            user_id = uuid.uuid4().hex[:24]
            path_id = uuid.uuid4().hex[:24]

        full_doc = {
            "_id": { "$oid": oid },
            "user": user_id,
            "path": path_id,
            "pipeline": merged,
            "container_id": "",
            "host_port": "",
            "host_ip": "",
            "status": False
        }
        
        wrapped_output = [full_doc]

        # Always save to flowchart.json
        out_file = self.output_dir / "flowchart.json"
        with out_file.open("w", encoding="utf-8") as f:
            json.dump(wrapped_output, f, indent=2)

        # Also save step file if step_index provided
        if step_index is not None:
            step_file = self.output_dir / f"flowchart_node_{step_index:02d}.json"
            with step_file.open("w", encoding="utf-8") as f:
                json.dump(merged, f, indent=2)

    async def _save_final(self, ws: WebSocket):
        """Save final flowchart."""
        self._save_flowchart()
        merged = {
            "nodes": self.phase1_flowchart.get("nodes", []) + self.phase2_graph["nodes"],
            "edges": self.phase1_flowchart.get("edges", []) + self.phase2_graph["edges"],
            "agents": []
        }

        await ws.send_json({
            "type": "final",
            "flowchart": merged,
            "path": str(self.output_dir / "flowchart.json"),
            "message": "[MOCK] Final flowchart saved"
        })


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    session_output_dir = None

    try:
        init_msg = await ws.receive_text()
        init_data = json.loads(init_msg)
        output_dir = init_data.get("metrics_output_dir", "./generated_flowcharts")

        # Create unique session folder
        session_id = str(uuid.uuid4())
        session_output_dir = str(Path(output_dir) / session_id)

        # Get metrics from init data
        metrics_list = init_data.get("metrics")
        if not metrics_list:
            metric = init_data.get("metric", "Error Rate")
            description = init_data.get("description", "Server error rate percentage")
            metrics_list = [{
                "metric_name": metric,
                "description": description,
                "category": "reliability"
            }]

        print(f"\n=== [MOCK] Creating Session ===")
        print(f"Session ID: {session_id}")
        print(f"Output dir: {session_output_dir}")
        print(f"Metrics: {len(metrics_list)}")

        await ws.send_json({"type": "session_id", "session_id": session_id})

        session = MockWSAgenticSession(metrics_list, output_dir=session_output_dir)
        try:
            await session.run(ws)
        finally:
            # Clean up session folder
            if session_output_dir and Path(session_output_dir).exists():
                shutil.rmtree(session_output_dir)
                print(f"[MOCK] Removed session dir: {session_output_dir}")

    except WebSocketDisconnect:
        print("[MOCK] Client disconnected")
        if session_output_dir and Path(session_output_dir).exists():
            shutil.rmtree(session_output_dir)
            print(f"[MOCK] Removed session dir after disconnect: {session_output_dir}")
    except Exception as e:
        print(f"[MOCK] WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        try:
            await ws.send_json({"type": "error", "message": f"[MOCK] Server error: {str(e)}"})
        except:
            pass


if __name__ == "__main__":
    print("=" * 60)
    print("MOCK SERVER - No LLM calls, predetermined responses")
    print("=" * 60)
    uvicorn.run(
        "mock_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        ws_ping_interval=None,
        ws_ping_timeout=None,
    )
