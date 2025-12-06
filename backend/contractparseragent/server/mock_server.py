"""
Mock server for testing WebSocket flow without LLM calls.
Returns predetermined responses to simulate the agentic pipeline builder.
"""

import json
import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uuid
import shutil
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from contractparseragent.layout_utils import apply_layout

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
            "selected": False
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
            "selected": False
        }
    ],
    "edges": [
        {
            "source": "n1",
            "sourceHandle": "out",
            "target": "n2",
            "targetHandle": "in_0",
            "animated": True,
            "id": "xy-edge__n1out-n2in_0"
        }
    ]
}

MOCK_MACRO_PLAN = {
    "steps": [
        "Filter n1 to create n4: failed server spans where status_code indicates error",
        "Group n4 by service.name to count errors per service",
        "Join error counts with total spans to calculate error rate",
        "Apply time window to aggregate errors over 5-minute intervals",
        "Flatten nested error data structure",
        "Select error rate percentage from JSON metadata",
        "Filter results to show only services with error rate > 1%"
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
        "selected": False
    },
    {
        "id": "n4",
        "schema": {
            "properties": {
                "category": {"const": "table", "title": "Category", "type": "string"},
                "node_id": {"const": "group_by", "title": "Node Id", "type": "string"},
                "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                "name": {"default": "", "title": "Name", "type": "string"},
                "n_inputs": {"const": 1, "default": 1, "title": "N Inputs", "type": "integer"},
                "columns": {"title": "Columns", "type": "array", "items": {"type": "string"}},
                "reducers": {
                    "title": "Reducers",
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "col": {"type": "string"},
                            "reducer": {"type": "string"},
                            "new_col": {"type": "string"}
                        }
                    }
                }
            },
            "required": ["category", "node_id", "columns", "reducers"],
            "title": "GroupByNode",
            "type": "object"
        },
        "type": "group_by",
        "position": {"x": 50, "y": 100},
        "node_id": "group_by",
        "category": "table",
        "data": {
            "ui": {"label": "GroupByNode Node", "iconUrl": ""},
            "properties": {
                "category": "table",
                "node_id": "group_by",
                "tool_description": "",
                "trigger_description": "",
                "name": "errors_by_service",
                "n_inputs": 1,
                "columns": ["service.name"],
                "reducers": [
                    {"col": "span_id", "reducer": "count", "new_col": "error_count"}
                ]
            }
        },
        "measured": {"width": 200, "height": 249},
        "selected": False
    },
    {
        "id": "n5",
        "schema": {
            "properties": {
                "category": {"const": "table", "title": "Category", "type": "string"},
                "node_id": {"const": "join", "title": "Node Id", "type": "string"},
                "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                "name": {"default": "", "title": "Name", "type": "string"},
                "n_inputs": {"const": 2, "default": 2, "title": "N Inputs", "type": "integer"},
                "on": {
                    "title": "On",
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 2,
                        "maxItems": 2
                    }
                },
                "how": {
                    "title": "How",
                    "enum": ["left", "right", "inner", "outer"],
                    "type": "string"
                }
            },
            "required": ["category", "node_id", "on", "how"],
            "title": "JoinNode",
            "type": "object"
        },
        "type": "join",
        "position": {"x": 300, "y": 100},
        "node_id": "join",
        "category": "table",
        "data": {
            "ui": {"label": "JoinNode Node", "iconUrl": ""},
            "properties": {
                "category": "table",
                "node_id": "join",
                "tool_description": "",
                "trigger_description": "",
                "name": "error_rate_join",
                "n_inputs": 2,
                "on": [["service.name", "service.name"]],
                "how": "left"
            }
        },
        "measured": {"width": 200, "height": 249},
        "selected": False
    },
    {
        "id": "n6",
        "schema": {
            "properties": {
                "category": {"const": "temporal", "title": "Category", "type": "string"},
                "node_id": {"const": "window_by", "title": "Node Id", "type": "string"},
                "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                "name": {"default": "", "title": "Name", "type": "string"},
                "n_inputs": {"const": 1, "default": 1, "title": "N Inputs", "type": "integer"},
                "time_col": {"title": "Time Col", "type": "string"},
                "window": {
                    "title": "Window",
                    "type": "object",
                    "properties": {
                        "duration": {"type": "integer"},
                        "window_type": {"enum": ["tumbling", "sliding", "session"], "type": "string"}
                    }
                },
                "reducers": {
                    "title": "Reducers",
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "col": {"type": "string"},
                            "reducer": {"type": "string"},
                            "new_col": {"type": "string"}
                        }
                    }
                }
            },
            "required": ["category", "node_id", "time_col", "window", "reducers"],
            "title": "WindowByNode",
            "type": "object"
        },
        "type": "window_by",
        "position": {"x": 550, "y": 100},
        "node_id": "window_by",
        "category": "temporal",
        "data": {
            "ui": {"label": "WindowByNode Node", "iconUrl": ""},
            "properties": {
                "category": "temporal",
                "node_id": "window_by",
                "tool_description": "",
                "trigger_description": "",
                "name": "error_rate_window",
                "n_inputs": 1,
                "time_col": "_open_tel_start_time",
                "window": {
                    "duration": 300000000000,
                    "window_type": "tumbling"
                },
                "reducers": [
                    {"col": "error_count", "reducer": "sum", "new_col": "total_errors"}
                ]
            }
        },
        "measured": {"width": 200, "height": 249},
        "selected": False
    },
    {
        "id": "n7",
        "schema": {
            "properties": {
                "category": {"const": "table", "title": "Category", "type": "string"},
                "node_id": {"const": "flatten", "title": "Node Id", "type": "string"},
                "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                "name": {"default": "", "title": "Name", "type": "string"},
                "n_inputs": {"const": 1, "default": 1, "title": "N Inputs", "type": "integer"},
                "column": {"title": "Column", "type": "string"}
            },
            "required": ["category", "node_id", "column"],
            "title": "FlattenNode",
            "type": "object"
        },
        "type": "flatten",
        "position": {"x": 800, "y": 100},
        "node_id": "flatten",
        "category": "table",
        "data": {
            "ui": {"label": "FlattenNode Node", "iconUrl": ""},
            "properties": {
                "category": "table",
                "node_id": "flatten",
                "tool_description": "",
                "trigger_description": "",
                "name": "flatten_error_data",
                "n_inputs": 1,
                "column": "error_metadata"
            }
        },
        "measured": {"width": 200, "height": 249},
        "selected": False
    },
    {
        "id": "n8",
        "schema": {
            "properties": {
                "category": {"const": "table", "title": "Category", "type": "string"},
                "node_id": {"const": "json_select", "title": "Node Id", "type": "string"},
                "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                "name": {"default": "", "title": "Name", "type": "string"},
                "n_inputs": {"const": 1, "default": 1, "title": "N Inputs", "type": "integer"},
                "json_column": {"title": "Json Column", "type": "string"},
                "property": {"title": "Property", "type": ["string", "integer"]},
                "property_type": {"enum": ["json", "str", "int", "float", "bool"], "title": "Property Type", "type": "string"},
                "new_column_name": {"title": "New Column Name", "type": "string"}
            },
            "required": ["category", "node_id", "json_column", "property", "property_type"],
            "title": "JSONSelectNode",
            "type": "object"
        },
        "type": "json_select",
        "position": {"x": 1050, "y": 100},
        "node_id": "json_select",
        "category": "table",
        "data": {
            "ui": {"label": "JSONSelectNode Node", "iconUrl": ""},
            "properties": {
                "category": "table",
                "node_id": "json_select",
                "tool_description": "",
                "trigger_description": "",
                "name": "extract_error_rate",
                "n_inputs": 1,
                "json_column": "metadata",
                "property": "error_rate",
                "property_type": "float",
                "new_column_name": "error_rate_percentage"
            }
        },
        "measured": {"width": 200, "height": 249},
        "selected": False
    },
    {
        "id": "n9",
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
        "position": {"x": 1300, "y": 100},
        "node_id": "filter",
        "category": "table",
        "data": {
            "ui": {"label": "FilterNode Node", "iconUrl": ""},
            "properties": {
                "category": "table",
                "node_id": "filter",
                "tool_description": "",
                "trigger_description": "",
                "name": "high_error_rate_filter",
                "n_inputs": 1,
                "filters": [
                    {"col": "error_rate_percentage", "op": ">", "value": 1.0}
                ]
            }
        },
        "measured": {"width": 200, "height": 249},
        "selected": False
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
        print("\n" + "="*60)
        print("[MOCK] STEP 1: Starting session")
        print(f"[MOCK] → Processing {len(self.metrics_list)} metric(s)")
        for i, metric in enumerate(self.metrics_list):
            print(f"[MOCK]   - Metric {i+1}: {metric.get('metric_name', 'Unknown')}")
        print("="*60)
        
        await ws.send_json({
            "type": "session_start",
            "metrics": self.metrics_list,
            "message": f"[MOCK] Starting session for {len(self.metrics_list)} SLA metrics"
        })

        # Phase 1: Return mock flowchart after one interaction
        print("\n[MOCK] STEP 2: Starting Phase 1 (Input & Filter Builder)")
        print("[MOCK] → This phase will create input nodes and filter nodes")
        print("[MOCK] → Waiting for user input to proceed...")
        phase1_success = await self._run_mock_phase1(ws)
        if not phase1_success:
            print("\n[MOCK] ❌ Phase 1 failed or user quit")
            await ws.send_json({"type": "done", "reason": "phase1_failed"})
            return

        # Save phase 1 flowchart
        print("\n[MOCK] STEP 3: Saving Phase 1 flowchart")
        print("[MOCK] → Saving initial flowchart with input and filter nodes")
        self._save_flowchart()
        print(f"[MOCK] ✓ Saved to: {self.output_dir / 'flowchart.json'}")

        # Phase 2: Iterate through mock nodes
        print("\n[MOCK] STEP 4: Starting Phase 2 (Metric Calculation Builder)")
        print("[MOCK] → This phase will propose calculation nodes one by one")
        print("[MOCK] → Each node requires user approval (y/n/q)")
        phase2_success = await self._run_mock_phase2(ws)
        if not phase2_success:
            print("\n[MOCK] ❌ Phase 2 failed or user quit")
            await ws.send_json({"type": "done", "reason": "phase2_failed"})
            return

        # Save final
        print("\n[MOCK] STEP 5: Saving final flowchart")
        print("[MOCK] → Merging Phase 1 and Phase 2 nodes into final flowchart")
        await self._save_final(ws)
        print("[MOCK] ✓ Final flowchart saved and sent to client")
        
        print("\n[MOCK] STEP 6: Session complete")
        print("[MOCK] → Sending 'done' message to client")
        await ws.send_json({"type": "done", "reason": "complete"})
        print("[MOCK] ✓ Session completed successfully")
        print("="*60 + "\n")

    async def _run_mock_phase1(self, ws: WebSocket) -> bool:
        """Mock Phase 1: return flowchart after user says 'ok' or similar."""
        print("\n[MOCK] Phase 1.1: Sending phase announcement")
        print("[MOCK] → Informing client that Phase 1 is starting")
        await ws.send_json({
            "type": "phase",
            "phase": 1,
            "message": "[MOCK] Starting Phase 1: Input & Filter Builder"
        })

        print("\n[MOCK] Phase 1.2: Sending metrics summary")
        print(f"[MOCK] → Sending summary of {len(self.metrics_list)} metric(s) to client")
        await ws.send_json({
            "type": "metrics_summary",
            "metrics": self.metrics_list,
            "message": f"[MOCK] Loaded {len(self.metrics_list)} metrics"
        })

        # Send initial agent response
        print("\n[MOCK] Phase 1.3: Sending initial agent response")
        print("[MOCK] → AI agent is asking user for filter configuration")
        print("[MOCK] → User can type 'ok' to accept defaults or describe requirements")
        await ws.send_json({
            "type": "agent_response",
            "phase": 1,
            "message": "[MOCK] I understand you want to track these metrics. Type 'ok' to accept the default filter configuration, or describe your filter requirements."
        })

        # Wait for user input
        print("\n[MOCK] Phase 1.4: Waiting for user input...")
        print("[MOCK] → Server is now waiting for client to send a message")
        await ws.send_json({"type": "await_input", "phase": 1})

        try:
            print("[MOCK] ⏳ Blocking on ws.receive_text() - waiting for user message...")
            msg = await ws.receive_text()
            print(f"[MOCK] ✓ Received message from client: {msg[:100]}...")
            
            user_data = json.loads(msg)
            user_input = user_data.get("message", "").strip().lower()
            print(f"[MOCK] → Parsed user input: '{user_input}'")

            if user_input in ('quit', 'exit'):
                print("[MOCK] ❌ User requested to quit")
                await ws.send_json({"type": "done", "reason": "quit"})
                return False

            # Accept any input and return mock flowchart
            print("\n[MOCK] Phase 1.5: Generating Phase 1 flowchart")
            print("[MOCK] → Creating mock flowchart with:")
            print(f"[MOCK]   - {len(MOCK_PHASE1_FLOWCHART['nodes'])} nodes (input + filter)")
            print(f"[MOCK]   - {len(MOCK_PHASE1_FLOWCHART['edges'])} edges")
            self.phase1_flowchart = MOCK_PHASE1_FLOWCHART
            
            print("\n[MOCK] Phase 1.6: Sending Phase 1 completion message")
            print("[MOCK] → Sending flowchart to client with phase1_complete message")
            await ws.send_json({
                "type": "phase1_complete",
                "flowchart": self.phase1_flowchart,
                "message": "[MOCK] Phase 1 completed with mock flowchart"
            })
            print("[MOCK] ✓ Phase 1 completed successfully")
            return True

        except Exception as e:
            print(f"\n[MOCK] ❌ Error in Phase 1: {str(e)}")
            import traceback
            traceback.print_exc()
            await ws.send_json({
                "type": "error",
                "message": f"[MOCK] Error: {str(e)}"
            })
            return False

    async def _run_mock_phase2(self, ws: WebSocket) -> bool:
        """Mock Phase 2: iterate through mock nodes with user approval."""
        print("\n[MOCK] Phase 2.1: Sending Phase 2 announcement")
        print("[MOCK] → Informing client that Phase 2 (Metric Calculation Builder) is starting")
        await ws.send_json({
            "type": "phase",
            "phase": 2,
            "message": "[MOCK] Starting Phase 2: Metric Calculation Builder"
        })

        for metric_index, metric in enumerate(self.metrics_list):
            metric_name = metric.get("metric_name", f"metric_{metric_index}")
            print(f"\n[MOCK] Phase 2.2.{metric_index + 1}: Processing metric '{metric_name}'")
            print(f"[MOCK] → Starting calculation builder for metric {metric_index + 1}/{len(self.metrics_list)}")

            print(f"\n[MOCK] Phase 2.3.{metric_index + 1}: Sending metric start message")
            print(f"[MOCK] → Informing client which metric we're building nodes for")
            await ws.send_json({
                "type": "metric_start",
                "metric_index": metric_index,
                "metric_name": metric_name,
                "filters": ["n2"],
                "filter_context": "[MOCK] Using server_spans_filter",
            })

            print(f"\n[MOCK] Phase 2.4.{metric_index + 1}: Sending macro plan")
            print(f"[MOCK] → Sending {len(MOCK_MACRO_PLAN['steps'])} step plan to client:")
            for i, step in enumerate(MOCK_MACRO_PLAN["steps"], 1):
                print(f"[MOCK]   Step {i}: {step}")
            await ws.send_json({
                "type": "macro_plan",
                "metric_index": metric_index,
                "steps": MOCK_MACRO_PLAN["steps"],
                "metric_description": MOCK_MACRO_PLAN["metric_description"],
                "total_steps": len(MOCK_MACRO_PLAN["steps"]),
            })

            # Iterate through mock nodes
            last_node_id = "n2"  # Start from the filter node
            print(f"\n[MOCK] Phase 2.5.{metric_index + 1}: Starting node proposal loop")
            print(f"[MOCK] → Will propose {len(MOCK_NODES)} nodes, one by one")
            
            for step_index, mock_node in enumerate(MOCK_NODES):
                if step_index >= len(MOCK_MACRO_PLAN["steps"]):
                    print(f"[MOCK] → Skipping node {step_index + 1} (beyond plan steps)")
                    break

                print(f"\n[MOCK] --- Node {step_index + 1}/{len(MOCK_NODES)} ---")
                print(f"[MOCK] Phase 2.6.{metric_index + 1}.{step_index + 1}: Sending step start")
                print(f"[MOCK] → Informing client about step: {MOCK_MACRO_PLAN['steps'][step_index]}")
                await ws.send_json({
                    "type": "step_start",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "total_steps": len(MOCK_MACRO_PLAN["steps"]),
                    "step": MOCK_MACRO_PLAN["steps"][step_index],
                })

                print(f"\n[MOCK] Phase 2.7.{metric_index + 1}.{step_index + 1}: Preparing node proposal")
                print(f"[MOCK] → Node ID: {mock_node['id']}, Type: {mock_node.get('type', 'unknown')}")
                print(f"[MOCK] → Creating edge from {last_node_id} to {mock_node['id']}")
                mock_edges = [{
                    "source": last_node_id,
                    "sourceHandle": "out",
                    "target": mock_node["id"],
                    "targetHandle": "in_0",
                    "animated": True,
                    "id": f"xy-edge__{last_node_id}out-{mock_node['id']}in_0"
                }]

                print(f"\n[MOCK] Phase 2.8.{metric_index + 1}.{step_index + 1}: Sending node proposal")
                print(f"[MOCK] → Sending proposed node and edges to client for approval")
                await ws.send_json({
                    "type": "node_proposed",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "node": mock_node,
                    "edges": mock_edges,
                })

                print(f"\n[MOCK] Phase 2.9.{metric_index + 1}.{step_index + 1}: Requesting approval")
                print(f"[MOCK] → Waiting for user to approve (y), reject (n), or quit (q)")
                await ws.send_json({
                    "type": "await_approval",
                    "metric_index": metric_index,
                    "step_index": step_index,
                })

                try:
                    print(f"[MOCK] ⏳ Blocking on ws.receive_text() - waiting for approval...")
                    msg = await ws.receive_text()
                    print(f"[MOCK] ✓ Received approval response: {msg[:100]}...")
                    
                    approval_data = json.loads(msg)
                    action = approval_data.get("action")
                    print(f"[MOCK] → Parsed action: '{action}'")

                    if action == "quit":
                        print(f"[MOCK] ❌ User requested to quit")
                        await ws.send_json({"type": "done", "reason": "quit"})
                        return False
                    if action == "reject":
                        feedback = approval_data.get("feedback", "")
                        print(f"[MOCK] ⚠️  User rejected node (feedback: '{feedback}')")
                        print(f"[MOCK] → In mock mode, continuing with same node anyway")
                        await ws.send_json({
                            "type": "status",
                            "message": f"[MOCK] Would regenerate step {step_index + 1}, but using same mock node",
                        })
                        # In mock, we just continue with same node
                    
                    # Add to phase2 graph
                    print(f"\n[MOCK] Phase 2.10.{metric_index + 1}.{step_index + 1}: Adding node to graph")
                    print(f"[MOCK] → Adding node {mock_node['id']} to Phase 2 graph")
                    self.phase2_graph["nodes"].append(mock_node)
                    self.phase2_graph["edges"].extend(mock_edges)
                    print(f"[MOCK] → Phase 2 graph now has {len(self.phase2_graph['nodes'])} nodes, {len(self.phase2_graph['edges'])} edges")

                    print(f"\n[MOCK] Phase 2.11.{metric_index + 1}.{step_index + 1}: Sending approval confirmation")
                    await ws.send_json({
                        "type": "node_approved",
                        "metric_index": metric_index,
                        "step_index": step_index,
                        "message": f"[MOCK] Step {step_index + 1} approved",
                    })

                    # Update last_node_id for chaining
                    last_node_id = mock_node["id"]
                    print(f"[MOCK] → Updated last_node_id to {last_node_id} for next node connection")

                    # Save incremental flowchart
                    print(f"\n[MOCK] Phase 2.12.{metric_index + 1}.{step_index + 1}: Saving incremental flowchart")
                    print(f"[MOCK] → Saving flowchart state after step {step_index + 1}")
                    self._save_flowchart(step_index + 1)
                    print(f"[MOCK] ✓ Saved incremental flowchart")

                except Exception as e:
                    print(f"\n[MOCK] ❌ Error processing node approval: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    await ws.send_json({
                        "type": "error",
                        "message": f"[MOCK] Error: {str(e)}",
                    })
                    return False

        print(f"\n[MOCK] Phase 2.13: All metrics processed")
        print(f"[MOCK] → Sending Phase 2 completion message")
        await ws.send_json({
            "type": "phase2_complete",
            "message": "[MOCK] Phase 2 completed successfully",
        })
        print(f"[MOCK] ✓ Phase 2 completed successfully")
        return True

    def _save_flowchart(self, step_index: Optional[int] = None):
        """Save current flowchart state."""
        print(f"\n[MOCK] Saving flowchart (step_index={step_index})")
        print(f"[MOCK] → Merging Phase 1 ({len(self.phase1_flowchart.get('nodes', []))} nodes) + Phase 2 ({len(self.phase2_graph['nodes'])} nodes)")
        merged = {
            "nodes": self.phase1_flowchart.get("nodes", []) + self.phase2_graph["nodes"],
            "edges": self.phase1_flowchart.get("edges", []) + self.phase2_graph["edges"],
            "agents": []
        }
        print(f"[MOCK] → Total: {len(merged['nodes'])} nodes, {len(merged['edges'])} edges")

        apply_layout(merged)

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
        print(f"[MOCK] → Writing to {out_file}")
        with out_file.open("w", encoding="utf-8") as f:
            json.dump(wrapped_output, f, indent=2)
        print(f"[MOCK] ✓ Saved flowchart.json")

        # Also save step file if step_index provided
        if step_index is not None:
            step_file = self.output_dir / f"flowchart_node_{step_index:02d}.json"
            print(f"[MOCK] → Also saving step file: {step_file}")
            with step_file.open("w", encoding="utf-8") as f:
                json.dump(merged, f, indent=2)
            print(f"[MOCK] ✓ Saved step file")

    async def _save_final(self, ws: WebSocket):
        """Save final flowchart."""
        print("\n[MOCK] Saving final flowchart")
        print("[MOCK] → This is the complete flowchart with all approved nodes")
        self._save_flowchart()
        merged = {
            "nodes": self.phase1_flowchart.get("nodes", []) + self.phase2_graph["nodes"],
            "edges": self.phase1_flowchart.get("edges", []) + self.phase2_graph["edges"],
            "agents": []
        }

        print(f"\n[MOCK] Sending final flowchart to client")
        print(f"[MOCK] → Final flowchart contains:")
        print(f"[MOCK]   - {len(merged['nodes'])} total nodes")
        print(f"[MOCK]   - {len(merged['edges'])} total edges")
        print(f"[MOCK]   - Saved at: {self.output_dir / 'flowchart.json'}")
        await ws.send_json({
            "type": "final",
            "flowchart": merged,
            "path": str(self.output_dir / "flowchart.json"),
            "message": "[MOCK] Final flowchart saved"
        })
        print(f"[MOCK] ✓ Final flowchart sent to client")


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
        print(f"[MOCK] Session ID: {session_id}")
        print(f"[MOCK] Output dir: {session_output_dir}")
        print(f"[MOCK] Metrics received: {len(metrics_list)}")
        for i, metric in enumerate(metrics_list):
            print(f"[MOCK]   Metric {i+1}: {metric.get('metric_name', 'Unknown')} - {metric.get('description', 'No description')[:50]}...")
        print(f"[MOCK] → Session created, starting workflow generation process...")

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
    import os
    # Use a different port to avoid conflict with main API server
    port = int(os.getenv("CONTRACT_PARSER_PORT", "8001"))
    uvicorn.run(
        "mock_server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        ws_ping_interval=None,
        ws_ping_timeout=None,
    )
