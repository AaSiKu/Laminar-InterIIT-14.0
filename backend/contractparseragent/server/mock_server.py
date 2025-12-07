"""
Server that simulates the agentic pipeline for local testing.

This implementation mirrors the behavior and WebSocket protocol of
`server.py`, but it does not call any external LLMs. Instead, it
returns a fixed, known-good flowchart equivalent to
`downtime_flowchart.json` as the final result of the session.
"""

import json
import os
import sys
import uuid
import shutil
import re
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from contractparseragent.layout_utils import apply_layout
from contractparseragent.agent_builder import (
    auto_assign_filters_to_metrics,
    summarize_filter_context,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Default output directory
DEFAULT_OUTPUT_DIR = Path(__file__).parent / "generated_flowcharts"
DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Temporary PDF directory
TEMP_PDF_DIR = Path(__file__).parent / "temp_pdfs"
TEMP_PDF_DIR.mkdir(parents=True, exist_ok=True)

# New workflow pipeline JSON (provided by user)
NEW_WORKFLOW_PIPELINE = {
    "nodes": [
        {
            "id": "n1",
            "schema": {
                "$defs": {
                    "RdKafkaSettings": {
                        "description": "TypedDict for rdkafka configuration settings.\n\nCommon settings:\n- bootstrap.servers: Kafka broker addresses\n- security.protocol: Security protocol (PLAINTEXT, SSL, SASL_SSL, etc.)\n- sasl.mechanism: SASL mechanism (PLAIN, SCRAM-SHA-256, etc.)\n- sasl.username: SASL username\n- sasl.password: SASL password\n- group.id: Consumer group ID\n- auto.offset.reset: Offset reset policy (earliest, latest)",
                        "properties": {
                            "bootstrap_servers": {"title": "Bootstrap Servers", "type": "string"},
                            "security_protocol": {"anyOf": [{"type": "string"}, {"type": "null"}], "title": "Security Protocol"},
                            "sasl_mechanism": {"anyOf": [{"type": "string"}, {"type": "null"}], "title": "Sasl Mechanism"},
                            "sasl_username": {"anyOf": [{"type": "string"}, {"type": "null"}], "title": "Sasl Username"},
                            "sasl_password": {"anyOf": [{"type": "string"}, {"type": "null"}], "title": "Sasl Password"},
                            "group_id": {"anyOf": [{"type": "string"}, {"type": "null"}], "title": "Group Id"},
                            "auto_offset_reset": {"anyOf": [{"type": "string"}, {"type": "null"}], "title": "Auto Offset Reset"}
                        },
                        "title": "RdKafkaSettings",
                        "type": "object"
                    }
                },
                "description": "Input node for span data from Kafka.",
                "properties": {
                    "category": {"const": "open_tel", "default": "open_tel", "title": "Category", "type": "string"},
                    "node_id": {"const": "open_tel_spans_input", "title": "Node Id", "type": "string"},
                    "tool_description": {"default": "", "title": "Tool Description", "type": "string"},
                    "trigger_description": {"default": "", "title": "Trigger Description", "type": "string"},
                    "n_inputs": {"const": 0, "default": 0, "title": "N Inputs", "type": "integer"},
                    "rdkafka_settings": {"$ref": "#/$defs/RdKafkaSettings"},
                    "topic": {"default": "otlp_spans", "title": "Topic", "type": "string"}
                },
                "required": ["node_id", "rdkafka_settings"],
                "title": "OpenTelSpansNode",
                "type": "object"
            },
            "type": "open_tel_spans_input",
            "position": {"x": 2463.0672087821904, "y": 637.852314533222},
            "node_id": "open_tel_spans_input",
            "category": "open_tel",
            "data": {
                "ui": {"label": "OpenTelSpansNode Node", "iconUrl": ""},
                "properties": {
                    "tool_description": "Input node for span data from Kafka",
                    "trigger_description": "",
                    "rdkafka_settings": {"bootstrap_servers": "host.docker.internal:9094"},
                    "topic": "otlp_spans"
                }
            },
            "measured": {"width": 307, "height": 233},
            "selected": False,
            "dragging": False
        }
    ],
    "edges": [],
    "viewport": {"x": -1159.3000351200717, "y": 31.876160688560844, "zoom": 0.5037816702442691},
    "metadata": {
        "pipelineName": "Pipeline 69345280b071ea88a0db03a7",
        "pipelineId": "69345280b071ea88a0db03a7",
        "versionId": "69345fad5d160a95eb0f23d3",
        "exportedAt": "2025-12-06T17:20:19.114Z",
        "exportedBy": "1"
    }
}

# Load the new workflow JSON
with open(Path(__file__).resolve().parent.parent / "new_workflow.json",
          "r", encoding="utf-8") as _f:
    DOWNTIME_FLOWCHART: Dict[str, Any] = json.load(_f)


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file and return the path for use in WebSocket connection."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file extension
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Create a unique filename to avoid conflicts
        file_id = str(uuid.uuid4())
        file_path = TEMP_PDF_DIR / f"{file_id}_{file.filename}"
        
        # Save the uploaded file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        print(f"[SERVER] PDF uploaded: {file_path} ({len(content)} bytes)")
        
        return {
            "pdf_path": str(file_path),
            "filename": file.filename,
            "size": len(content),
        }
    except Exception as e:
        print(f"[SERVER] Error uploading PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading PDF: {str(e)}")


class MockWSAgenticSession:
    """WebSocket-based session that mocks the behavior of WSAgenticSession."""

    def __init__(self, metrics_list: List[Dict[str, Any]], output_dir: str):
        self.metrics_list = metrics_list
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Split nodes into Phase 1 (Input/Filter) and Phase 2 (Calculation)
        self.all_nodes = DOWNTIME_FLOWCHART.get("nodes", [])
        self.all_edges = [e for e in DOWNTIME_FLOWCHART.get("edges", [])]
        
        self.phase1_nodes = []
        self.phase2_nodes = []
        
        # For the new workflow:
        # Phase 1: n1 (input), n2, n2_dup_1765039643792 (filters)
        # Phase 2: n4, n4_dup_1765039669808, n6, n7, n8, n9, n10 (in dependency order)
        
        phase1_ids = ["n1", "n2", "n2_dup_1765039643792"]
        
        for node in self.all_nodes:
            nid = node.get("id", "")
            if nid in phase1_ids:
                self.phase1_nodes.append(node)
            else:
                # Phase 2 nodes - exclude alert node from step-by-step (it's added at the end)
                if nid != "n10":
                    self.phase2_nodes.append(node)
        
        # Sort Phase 2 nodes by dependency order based on edges
        # Order: n4, n4_dup_1765039669808, n6, n7, n8, n9
        phase2_order = ["n4", "n4_dup_1765039669808", "n6", "n7", "n8", "n9"]
        self.phase2_nodes.sort(key=lambda x: phase2_order.index(x["id"]) if x["id"] in phase2_order else 999)
        
        # Add n10 (alert) at the end
        for node in self.all_nodes:
            if node.get("id") == "n10":
                self.phase2_nodes.append(node)
                break

        self.phase1_flowchart = {"nodes": [], "edges": []}
        self.phase2_graph = {"nodes": [], "edges": []}
        
        self.metric_filter_map: Dict[str, List[str]] = {}
        self.filter_index: Dict[str, Dict[str, Any]] = {}
        self.input_node_id: Optional[str] = None

    async def run(self, ws: WebSocket):
        """Run full session."""
        print("\n" + "="*60)
        print("[SERVER] STEP 1: Starting session (MOCK)")
        print(f"[SERVER] → Processing {len(self.metrics_list)} metric(s)")
        print("="*60)

        await ws.send_json({
            "type": "session_start",
            "metrics": self.metrics_list,
            "message": "Session started"
        })

        if not await self.run_phase1_interactive(ws):
            return

        if not await self.run_phase2_iterative(ws):
            return

        await self.save_final_flowchart(ws)

    async def run_phase1_interactive(self, ws: WebSocket) -> bool:
        """Run Phase 1 interactively via WebSocket (Mocked)."""
        print("\n[SERVER] Phase 1.1: Sending phase announcement")
        await ws.send_json({
            "type": "phase",
            "phase": 1,
            "message": "Starting Phase 1: Input & Filter Builder (multi-metric)"
        })

        print("\n[SERVER] Phase 1.2: Sending metrics summary")
        await ws.send_json({
            "type": "metrics_summary",
            "metrics": self.metrics_list,
            "message": f"Loaded {len(self.metrics_list)} metrics for negotiation"
        })

        # --- Scripted Conversation Start ---

        # Message 1: Initial agent introduction and question
        msg_1 = """Okay, I understand. I am the SLA Input Builder agent. My goal is to determine how to select the relevant OpenTelemetry spans for your "Maximum Downtime" metric using filter nodes and then output the necessary JSON flowchart and metric mapping.

Let's start with your metric: "Maximum Downtime."
This metric refers to both "Account Aggregator (AA)" and "Financial Information Provider (FIP)" services.

How do you identify the OpenTelemetry spans that belong to the "Account Aggregator (AA)" service? Is there a specific `_open_tel_service_name` or `resource_attributes` key/value that identifies them?
Similarly, how do you identify the OpenTelemetry spans that belong to the "Financial Information Provider (FIP)" service?"""
        if not await self._send_and_wait(ws, msg_1): return False

        # Message 2: Response to user's filter suggestion
        msg_2 = """Okay, I understand. For the "Maximum Downtime" metric, you want to identify spans with the name `payment healthcheck`.

So, for both the "Account Aggregator (AA)" and "Financial Information Provider (FIP)" aspects of the "Maximum Downtime" metric, we will filter for spans where the `name` column is exactly `payment healthcheck`.

Does this single filter (`name == "payment healthcheck"`) correctly identify the relevant health check spans for *both* the Account Aggregator and Financial Information Provider services, or do we need additional conditions to differentiate or further specify the health checks for each service?"""
        if not await self._send_and_wait(ws, msg_2): return False

        # Message 3: Confirmation and plan summary
        msg_3 = """Excellent. You've confirmed that a single filter `name == "payment healthcheck"` is sufficient for the "Maximum Downtime" metric.

Here is the confirmation of the plan:
*   **Input:** One `open_tel_spans_input` node reading from Kafka topic `otlp_spans`.
*   **Filter:** One `filter` node, let's call it "Filter for Maximum Downtime", with the condition `name == "payment healthcheck"`. This node will select the relevant health check spans for your "Maximum Downtime" metric.
*   **Edges:** An edge from the input node to this filter node.

I have sufficient information to generate the flowchart and metric mapping."""
        if not await self._send_and_wait(ws, msg_3): return False

        # --- Scripted Conversation End ---

        try:
            # Send Phase 1 nodes one at a time (like Phase 2)
            # Order: n1 (input), n2, n2_dup_1765039643792 (filters)
            print("\n[SERVER] Phase 1.5: Sending Phase 1 nodes one at a time")
            
            for node_index, next_node in enumerate(self.phase1_nodes):
                node_id = next_node.get("id", "")
                print(f"\n[SERVER] Phase 1 - Proposing node {node_index + 1}/{len(self.phase1_nodes)}: {node_id}")
                
                # Calculate edges for this node (edges where target is next_node['id'])
                relevant_edges = [
                e for e in self.all_edges 
                    if e["target"] == next_node["id"]
                ]
                
                # We need to make sure the source nodes exist in current graph (Phase 1 so far)
                current_node_ids = {n["id"] for n in self.phase1_flowchart.get("nodes", [])}
                
                # Filter edges to only include those whose source nodes exist
                valid_edges = [
                    e for e in relevant_edges 
                    if e["source"] in current_node_ids
                ]

            await ws.send_json({
                    "type": "node_proposed",
                    "metric_index": 0,
                    "step_index": node_index,
                    "node": next_node,
                    "edges": valid_edges,
                })

                # Add 1 second delay to show "Rendering node..." in frontend
                print("[SERVER] Waiting 1 second after node proposal...")
                await asyncio.sleep(1)

                await ws.send_json({
                    "type": "await_approval",
                    "metric_index": 0,
                    "step_index": node_index,
                })

                # Wait for approval
                msg = await ws.receive_text()
                approval_data = json.loads(msg)
                action = approval_data.get("action")

                if action == "quit":
                    await ws.send_json({"type": "done", "reason": "quit"})
                    return False
                
                if action == "approve":
                    # Add node to phase1_flowchart
                    self.phase1_flowchart["nodes"].append(next_node)
                    self.phase1_flowchart["edges"].extend(valid_edges)

                    # Send flowchart update with all Phase 1 nodes accepted so far
                    await ws.send_json({
                        "type": "node_approved",
                        "metric_index": 0,
                        "step_index": node_index,
                        "message": f"Phase 1 node {node_index + 1} approved",
                    })
                    
                    # Add 1 second delay to show "Rendering node..." in frontend
                    print("[SERVER] Waiting 1 second after node approval...")
                    await asyncio.sleep(1)
                    
                    await ws.send_json({
                        "type": "flowchart_update",
                        "flowchart": {
                            "nodes": self.phase1_flowchart.get("nodes", []),
                            "edges": self.phase1_flowchart.get("edges", []),
                        },
                        "message": f"Phase 1 node {node_index + 1} approved and added to flowchart",
                    })
                else:
                    # Reject or other - for mock, we just continue
                    pass

            # All Phase 1 nodes approved - prepare metadata and complete Phase 1
            self._prepare_filter_metadata()
            # Don't apply layout - preserve original positions from JSON
            # apply_layout(self.phase1_flowchart)

            print("\n[SERVER] Phase 1.6: All Phase 1 nodes approved - Sending Phase 1 completion message")
            await ws.send_json({
                "type": "phase1_complete",
                "flowchart": self.phase1_flowchart,
                "message": "Phase 1 completed successfully"
            })
            return True

        except Exception as e:
            print(f"Error in Phase 1: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def _send_and_wait(self, ws: WebSocket, message: str) -> bool:
        """Helper to send an agent message and wait for user input."""
        print(f"\n[SERVER] Sending agent message: {message[:50]}...")
        await ws.send_json({
            "type": "agent_response",
            "phase": 1,
            "message": message
        })

        # Add 1 second delay to show "Generating workflow..." in frontend
        print("[SERVER] Waiting 1 second before enabling input...")
        await asyncio.sleep(1)

        print("[SERVER] Waiting for user input...")
        await ws.send_json({
            "type": "await_input",
            "phase": 1
        })

        try:
            msg = await ws.receive_text()
            user_data = json.loads(msg)
            user_input = user_data.get("message", "").strip()
            print(f"[SERVER] User said: {user_input}")
            
            if user_input.lower() in ('quit', 'exit'):
                await ws.send_json({"type": "done", "reason": "quit"})
                return False
            return True
        except Exception as e:
            print(f"[SERVER] Error receiving input: {e}")
            return False

    async def run_phase2_iterative(self, ws: WebSocket) -> bool:
        """Run Phase 2 iteratively via WebSocket (Mocked)."""
        print("\n[SERVER] Phase 2.1: Sending Phase 2 announcement")
        await ws.send_json({
            "type": "phase",
            "phase": 2,
            "message": "Starting Phase 2: Metric Calculation Builder"
        })

        print("\n[SERVER] Phase 2.2: Sending filter assignments")
        await ws.send_json({
            "type": "filter_assignments",
            "assignments": self.metric_filter_map,
        })

        # We assume one metric flow for the demo
        for metric_index, metric in enumerate(self.metrics_list):
            metric_name = metric.get("metric_name") or f"metric_{metric_index}"
            filter_ids = self.metric_filter_map.get(metric_name, [])
            filter_context = summarize_filter_context(filter_ids, self.filter_index, self.input_node_id)

            await ws.send_json({
                "type": "metric_start",
                "metric_index": metric_index,
                "metric_name": metric_name,
                "filters": filter_ids,
                "filter_context": filter_context,
            })

            # Mock Macro Plan - matches the new workflow structure
            macro_plan = [
                "Window failed healthchecks (30s)",      # n4
                "Window total healthchecks (30s)",       # n4_dup_1765039669808
                "Join streams",                           # n6
                "Calculate downtime percentage",          # n7
                "Filter downtime < 1%",                   # n8
                "Trigger RCA",                            # n9
                "Alert"                                   # n10
            ]
            
            # The phase2_nodes list should map to these steps
            # n4, n4_dup_1765039669808, n6, n7, n8, n9, n10 -> 7 nodes

            await ws.send_json({
                "type": "macro_plan",
                "metric_index": metric_index,
                "steps": macro_plan,
                "metric_description": metric.get("description", ""),
                "total_steps": len(macro_plan),
            })

            step_index = 0
            while step_index < len(macro_plan) and step_index < len(self.phase2_nodes):
                step_desc = macro_plan[step_index]
                next_node = self.phase2_nodes[step_index]
                
                await ws.send_json({
                    "type": "step_start",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "total_steps": len(macro_plan),
                    "step": step_desc,
                })

                # Calculate edges for this node
                # Edges where target is next_node['id']
                relevant_edges = [
                    e for e in self.all_edges 
                    if e["target"] == next_node["id"]
                ]
                
                # We need to make sure the source nodes exist in current graph (Phase 1 + Phase 2 so far)
                # In the mock, they should, because we are following the order.
                # Build current graph to check
                current_node_ids = {n["id"] for n in self.phase1_flowchart.get("nodes", [])}
                current_node_ids.update({n["id"] for n in self.phase2_graph.get("nodes", [])})
                
                # Filter edges to only include those whose source nodes exist
                valid_edges = [
                    e for e in relevant_edges 
                    if e["source"] in current_node_ids
                ]
                
                await ws.send_json({
                    "type": "node_proposed",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "node": next_node,
                    "edges": valid_edges,
                })

                # Add 1 second delay to show "Rendering node..." in frontend
                print("[SERVER] Waiting 1 second after node proposal...")
                await asyncio.sleep(1)

                await ws.send_json({
                    "type": "await_approval",
                    "metric_index": metric_index,
                    "step_index": step_index,
                })

                # Wait for approval
                msg = await ws.receive_text()
                approval_data = json.loads(msg)
                action = approval_data.get("action")

                if action == "quit":
                    await ws.send_json({"type": "done", "reason": "quit"})
                    return False
                
                if action == "approve":
                    self._finalize_node(next_node, valid_edges, step_index)
                    
                    # Send flowchart update with all nodes (Phase 1 + Phase 2 so far)
                    # Don't apply layout here - preserve original positions from JSON
                    # Layout will be applied only at the final step
                    merged_flowchart = {
                        "nodes": self.phase1_flowchart.get("nodes", []) + self.phase2_graph.get("nodes", []),
                        "edges": self.phase1_flowchart.get("edges", []) + self.phase2_graph.get("edges", []),
                    }
                    # Preserve positions from original nodes - don't apply layout yet
                    # This ensures nodes appear at the correct positions from the start
                    
                    phase1_nodes = self.phase1_flowchart.get("nodes", [])
                    phase2_nodes = self.phase2_graph.get("nodes", [])
                    
                    print(f"[SERVER] Sending flowchart_update after step {step_index + 1}:")
                    print(f"  - Phase 1 nodes: {len(phase1_nodes)} (IDs: {[n.get('id', '?') for n in phase1_nodes]})")
                    print(f"  - Phase 2 nodes so far: {len(phase2_nodes)} (IDs: {[n.get('id', '?') for n in phase2_nodes]})")
                    print(f"  - Total nodes: {len(merged_flowchart['nodes'])}")
                    print(f"  - All Node IDs: {[n.get('id', '?') for n in merged_flowchart['nodes']]}")
                    print(f"  - Newly approved node: {next_node.get('id', '?')} at position: {next_node.get('position', {})}")
                    
                    # Send node_approved first, then flowchart_update
                    # This ensures the frontend knows the node is approved before merging
                    await ws.send_json({
                        "type": "node_approved",
                        "metric_index": metric_index,
                        "step_index": step_index,
                        "message": f"Step {step_index + 1} approved",
                    })
                    
                    # Add 1 second delay to show "Rendering node..." in frontend
                    print("[SERVER] Waiting 1 second after node approval...")
                    await asyncio.sleep(1)
                    
                    # Then send flowchart_update with all nodes (this will merge and keep all previous nodes)
                    await ws.send_json({
                        "type": "flowchart_update",
                        "flowchart": merged_flowchart,
                        "message": f"Step {step_index + 1} approved and added to flowchart",
                    })
                    step_index += 1
                else:
                    # Reject or other - for mock, we just loop or error
                    # But let's assume happy path for demo
                    pass

        await ws.send_json({
            "type": "phase2_complete",
            "message": "Phase 2 completed successfully for all metrics",
        })
        return True

    def _prepare_filter_metadata(self) -> None:
        filter_nodes: List[Dict[str, Any]] = []
        self.input_node_id = None

        for node in self.phase1_flowchart.get("nodes", []):
            node_type = node.get("node_id") or node.get("type")
            if node_type == "open_tel_spans_input":
                self.input_node_id = node.get("id")
            elif node_type == "filter":
                filter_nodes.append(node)

        self.filter_index = {node.get("id"): node for node in filter_nodes}

        # Auto assign (mocked or real logic)
        # Since we have one metric and some filters, we can just assign all filters to the metric
        # or use the real logic if imported.
        
        # For the mock, let's just assign all filters to the first metric
        if self.metrics_list:
            metric_name = self.metrics_list[0].get("metric_name")
            self.metric_filter_map = {
                metric_name: [n["id"] for n in filter_nodes]
            }
            # If there are no filters, assign input node
            if not self.metric_filter_map[metric_name]:
                self.metric_filter_map[metric_name] = [self.input_node_id] if self.input_node_id else []

    def _finalize_node(self, node: Dict[str, Any], edges: List[Dict[str, Any]], step_index: int):
        self.phase2_graph["nodes"].append(node)
        self.phase2_graph["edges"].extend(edges)
        self._save_flowchart(step_index)

    def _save_flowchart(self, step_index: Optional[int] = None):
        # Merge Phase 1 and Phase 2 nodes/edges, keeping all previous nodes
        merged = {
            "nodes": self.phase1_flowchart.get("nodes", []) + self.phase2_graph.get("nodes", []),
            "edges": self.phase1_flowchart.get("edges", []) + self.phase2_graph.get("edges", []),
            "agents": []
        }
        apply_layout(merged)
        
        # Save to session directory
        out_file = self.output_dir / "flowchart.json"
        with out_file.open("w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2)
            
        # Also save to default directory so frontend can pick it up immediately
        default_out_file = DEFAULT_OUTPUT_DIR / "flowchart.json"
        with default_out_file.open("w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2)
            
        if step_index is not None:
            step_file = self.output_dir / f"flowchart_node_{step_index:02d}.json"
            with step_file.open("w", encoding="utf-8") as f:
                json.dump(merged, f, indent=2)
            
            # Also save step file to default directory
            default_step_file = DEFAULT_OUTPUT_DIR / f"flowchart_node_{step_index:02d}.json"
            with default_step_file.open("w", encoding="utf-8") as f:
                json.dump(merged, f, indent=2)

    async def save_final_flowchart(self, ws: WebSocket):
        self._save_flowchart()
        merged = {
            "nodes": self.phase1_flowchart.get("nodes", []) + self.phase2_graph.get("nodes", []),
            "edges": self.phase1_flowchart.get("edges", []) + self.phase2_graph.get("edges", []),
            "agents": []
        }
        apply_layout(merged)
        
        await ws.send_json({
            "type": "final",
            "flowchart": merged,
            "path": str(self.output_dir / "flowchart.json"),
            "message": "Final flowchart saved successfully"
        })


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    session_output_dir = None

    try:
        init_msg = await ws.receive_text()
        init_data = json.loads(init_msg)

        output_dir = str(DEFAULT_OUTPUT_DIR)
        session_id = str(uuid.uuid4())
        session_output_dir = str(Path(output_dir) / session_id)

        metrics_list = init_data.get("metrics")
        
        # Handle PDF upload case
        if init_data.get("pdf_path"):
            pdf_path = init_data["pdf_path"]
            additional_description = init_data.get("description", "").strip() if init_data.get("description") else None
            print(f"\n[SERVER] Processing PDF: {pdf_path}")
            if additional_description:
                print(f"[SERVER] → Combining PDF with description for metric extraction")
                print(f"[SERVER] → Description provided: {additional_description[:100]}...")
            else:
                print(f"[SERVER] → Extracting metrics from PDF only")
            
            # For mock server, just create a default metric from PDF
            # In real server, this would use LLM to extract metrics
            if not metrics_list:
                metrics_list = [{
                    "metric_name": "Downtime",
                    "description": additional_description or "Downtime percentage of payment service over 30 seconds must be < 1%",
                    "category": "availability",
                }]
                print(f"[SERVER] ✓ Created default metric from PDF")
                await ws.send_json({
                    "type": "metrics_loaded",
                    "message": f"Extracted metrics from PDF. Using default downtime metric.",
                })
        
        if not metrics_list:
            metrics_list = [{
                "metric_name": init_data.get("metric", "Payment Latency"),
                "description": init_data.get("description", "Latency between charge and webhook"),
                "category": init_data.get("category", "unspecified"),
            }]

        print(f"[SERVER] New mock session: {session_id}")
        await ws.send_json({"type": "session_id", "session_id": session_id})

        session = MockWSAgenticSession(metrics_list, output_dir=session_output_dir)
        try:
            await session.run(ws)
        finally:
            if session_output_dir and Path(session_output_dir).exists():
                # shutil.rmtree(session_output_dir) # Keep for debugging if needed
                pass

    except WebSocketDisconnect:
        print("[SERVER] Client disconnected")
    except Exception as e:
        print(f"[SERVER] WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except:
            pass

if __name__ == "__main__":
    print("=" * 60)
    print(" AGENTIC SERVER (Mock, deterministic flowchart) ")
    print("=" * 60)
    port = int(os.getenv("CONTRACT_PARSER_PORT", "8001"))

    uvicorn.run(
        "mock_server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        ws_ping_interval=None,
        ws_ping_timeout=None,
    )