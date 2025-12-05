import json
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uuid
import shutil
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Add backend to path so imports work
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from contractparseragent.agent_builder import (
    AgenticPipelineBuilder,
    auto_assign_filters_to_metrics,
    summarize_filter_context,
)
from contractparseragent.ingestion import (
    generate_metrics_from_pdf,
    load_metrics_from_file,
)

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


class WSAgenticSession:
    """WebSocket-based session using the multi-metric AgenticPipelineBuilder."""

    def __init__(
        self,
        metrics_list: List[Dict[str, Any]],
        output_dir: str = "./generated_flowcharts",
        api_key: Optional[str] = None,
    ):
        self.metrics_list = metrics_list
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)

        self.builder = AgenticPipelineBuilder(api_key=api_key)
        self.phase1_flowchart: Optional[Dict[str, Any]] = None
        self.phase2_graph: Dict[str, Any] = {"nodes": [], "edges": []}
        self.snapshot_counter = 0

        self.metric_filter_map: Dict[str, List[str]] = {}
        self.filter_index: Dict[str, Dict[str, Any]] = {}
        self.input_node_id: Optional[str] = None
        self.next_node_counter: int = 0

    async def run_phase1_interactive(self, ws: WebSocket) -> bool:
        """Run Phase 1 interactively via WebSocket.
        
        Returns True if Phase 1 completed successfully, False otherwise.
        """
        print("\n[SERVER] Phase 1.1: Sending phase announcement")
        print("[SERVER] → Informing client that Phase 1 is starting")
        await ws.send_json({
            "type": "phase",
            "phase": 1,
            "message": "Starting Phase 1: Input & Filter Builder (multi-metric)"
        })

        metrics_text = json.dumps(self.metrics_list, indent=2)
        print("\n[SERVER] Phase 1.2: Sending metrics summary")
        print(f"[SERVER] → Sending summary of {len(self.metrics_list)} metric(s) to client")
        await ws.send_json({
            "type": "metrics_summary",
            "metrics": self.metrics_list,
            "message": f"Loaded {len(self.metrics_list)} metrics for negotiation"
        })

        from contractparseragent.agent_prompts import get_input_builder_prompt
        conversation_history = []
        input_builder_prompt = get_input_builder_prompt()
        initial_msg = (
            f"{input_builder_prompt}\n\nHere is the LIST OF METRICS I need to build filters for:\n"
            f"{metrics_text}\n\nLet's start negotiating the filters for these metrics."
        )

        print("\n[SERVER] Phase 1.3: Calling LLM for initial response")
        print("[SERVER] → Sending metrics to LLM to generate initial filter configuration")
        response = self.builder.client.messages.create(
            model=self.builder.model_name,
            max_tokens=4000,
            messages=[{"role": "user", "content": initial_msg}]
        )
        response_text = response.content[0].text

        conversation_history.append({"role": "user", "content": initial_msg})
        conversation_history.append({"role": "assistant", "content": response_text})

        print("\n[SERVER] Phase 1.4: Sending initial agent response")
        print("[SERVER] → AI agent is asking user for filter configuration")
        print("[SERVER] → User can type 'ok' to accept defaults or describe requirements")
        await ws.send_json({
            "type": "agent_response",
            "phase": 1,
            "message": response_text
        })
        
        # Interactive loop
        while True:
            # Check if we have a complete flowchart
            candidate = response_text
            if "```json" in response_text:
                try:
                    start = response_text.find("```json") + 7
                    end = response_text.find("```", start)
                    candidate = response_text[start:end].strip()
                except Exception:
                    pass
            
            try:
                data = json.loads(candidate)
                if "nodes" in data and "edges" in data:
                    # Post-process: ensure open_tel_spans_input has required fields
                    for node in data.get("nodes", []):
                        if node.get("node_id") == "open_tel_spans_input":
                            props = node.get("data", {}).get("properties", {})
                            if "rdkafka_settings" not in props:
                                props["rdkafka_settings"] = {
                                    "bootstrap_servers": "localhost:9092",
                                    "group_id": "pathway-consumer",
                                    "auto_offset_reset": "earliest"
                                }
                            if "topic" not in props:
                                props["topic"] = "otlp_spans"
                            node["data"]["properties"] = props
                    
                    print("\n[SERVER] Phase 1.5: LLM returned complete flowchart")
                    print(f"[SERVER] → Creating Phase 1 flowchart with:")
                    print(f"[SERVER]   - {len(data.get('nodes', []))} nodes (input + filter)")
                    print(f"[SERVER]   - {len(data.get('edges', []))} edges")
                    self.phase1_flowchart = data
                    self._prepare_filter_metadata()
                    
                    print("\n[SERVER] Phase 1.6: Sending Phase 1 completion message")
                    print("[SERVER] → Sending flowchart to client with phase1_complete message")
                    await ws.send_json({
                        "type": "phase1_complete",
                        "flowchart": data,
                        "message": "Phase 1 completed successfully"
                    })
                    print("[SERVER] ✓ Phase 1 completed successfully")
                    return True
            except Exception:
                pass
            
            # Wait for user input
            print("\n[SERVER] Phase 1.7: Waiting for user input...")
            print("[SERVER] → Server is now waiting for client to send a message")
            await ws.send_json({
                "type": "await_input",
                "phase": 1
            })
            
            try:
                print("[SERVER] ⏳ Blocking on ws.receive_text() - waiting for user message...")
                msg = await ws.receive_text()
                print(f"[SERVER] ✓ Received message from client: {msg[:100]}...")
                
                user_data = json.loads(msg)
                user_input = user_data.get("message", "").strip()
                print(f"[SERVER] → Parsed user input: '{user_input[:100]}...'")
                
                if user_input.lower() in ('quit', 'exit'):
                    print("[SERVER] ❌ User requested to quit")
                    await ws.send_json({"type": "done", "reason": "quit"})
                    return False
                
                # Add to conversation
                conversation_history.append({"role": "user", "content": user_input})
                
                # Get response
                print("[SERVER] → Calling LLM with user input...")
                response = self.builder.client.messages.create(
                    model=self.builder.model_name,
                    max_tokens=4000,
                    messages=conversation_history
                )
                response_text = response.content[0].text
                conversation_history.append({"role": "assistant", "content": response_text})
                
                print("[SERVER] → LLM response received, sending to client")
                await ws.send_json({
                    "type": "agent_response",
                    "phase": 1,
                    "message": response_text
                })
                
            except Exception as e:
                print(f"\n[SERVER] ❌ Error in Phase 1: {str(e)}")
                import traceback
                traceback.print_exc()
                await ws.send_json({
                    "type": "error",
                    "message": f"Error: {str(e)}"
                })
                return False

    async def run_phase2_iterative(self, ws: WebSocket) -> bool:
        """Run Phase 2 iteratively via WebSocket with user approval for each node."""
        print("\n[SERVER] Phase 2.1: Sending Phase 2 announcement")
        print("[SERVER] → Informing client that Phase 2 (Metric Calculation Builder) is starting")
        await ws.send_json({
            "type": "phase",
            "phase": 2,
            "message": "Starting Phase 2: Metric Calculation Builder"
        })

        from contractparseragent.graph_builder import build_macro_plan, build_next_node

        print("\n[SERVER] Phase 2.2: Sending filter assignments")
        print(f"[SERVER] → Sending filter assignments for {len(self.metric_filter_map)} metric(s)")
        await ws.send_json({
            "type": "filter_assignments",
            "assignments": self.metric_filter_map,
        })

        for metric_index, metric in enumerate(self.metrics_list):
            metric_name = metric.get("metric_name") or f"metric_{metric_index}"
            metric_desc = metric.get("description", "")
            filter_ids = self.metric_filter_map.get(metric_name, [])
            primary_filter_id = (filter_ids or [self.input_node_id])[0]
            filter_context = summarize_filter_context(filter_ids, self.filter_index, self.input_node_id)

            print(f"\n[SERVER] Phase 2.3.{metric_index + 1}: Processing metric '{metric_name}'")
            print(f"[SERVER] → Starting calculation builder for metric {metric_index + 1}/{len(self.metrics_list)}")
            
            print(f"\n[SERVER] Phase 2.4.{metric_index + 1}: Sending metric start message")
            print(f"[SERVER] → Informing client which metric we're building nodes for")
            await ws.send_json({
                "type": "metric_start",
                "metric_index": metric_index,
                "metric_name": metric_name,
                "filters": filter_ids,
                "filter_context": filter_context,
            })

            print(f"\n[SERVER] Phase 2.5.{metric_index + 1}: Calling LLM to build macro plan")
            print(f"[SERVER] → Requesting LLM to create a step-by-step plan for metric '{metric_name}'")
            plan_data = build_macro_plan(metric_name, metric_desc, self.phase1_flowchart, filter_context)
            macro_plan = plan_data.get("steps", [])
            metric_desc_refined = plan_data.get("metric_description", metric_desc)

            print(f"\n[SERVER] Phase 2.6.{metric_index + 1}: Sending macro plan")
            print(f"[SERVER] → Sending {len(macro_plan)} step plan to client:")
            for i, step in enumerate(macro_plan, 1):
                print(f"[SERVER]   Step {i}: {step}")
            await ws.send_json({
                "type": "macro_plan",
                "metric_index": metric_index,
                "steps": macro_plan,
                "metric_description": metric_desc_refined,
                "total_steps": len(macro_plan),
            })

            step_index = 0
            while step_index < len(macro_plan):
                print(f"\n[SERVER] --- Node {step_index + 1}/{len(macro_plan)} ---")
                print(f"[SERVER] Phase 2.7.{metric_index + 1}.{step_index + 1}: Sending step start")
                print(f"[SERVER] → Informing client about step: {macro_plan[step_index]}")
                await ws.send_json({
                    "type": "step_start",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "total_steps": len(macro_plan),
                    "step": macro_plan[step_index],
                })

                print(f"\n[SERVER] Phase 2.8.{metric_index + 1}.{step_index + 1}: Calling LLM to build next node")
                print(f"[SERVER] → Requesting LLM to generate node for step {step_index + 1}")
                current_graph = self._current_graph_snapshot()
                llm_result = build_next_node(
                    current_graph,
                    macro_plan,
                    step_index,
                    filter_context,
                )
                macro_plan = llm_result.get("macro_plan", macro_plan)
                next_node = llm_result.get("next_node")
                next_edges = llm_result.get("next_edges", [])

                if not next_node:
                    print(f"[SERVER] ❌ LLM did not return a node for step {step_index + 1}")
                    await ws.send_json({
                        "type": "error",
                        "message": "LLM did not return a node for this step",
                    })
                    return False

                print(f"\n[SERVER] Phase 2.9.{metric_index + 1}.{step_index + 1}: Preparing node proposal")
                print(f"[SERVER] → Node ID: {next_node.get('id', 'unknown')}, Type: {next_node.get('type', 'unknown')}")
                rewritten_edges = self._rewrite_edges_for_filter(
                    next_edges,
                    primary_filter_id,
                    next_node.get("id"),
                )
                print(f"[SERVER] → Created {len(rewritten_edges)} edge(s) for this node")

                print(f"\n[SERVER] Phase 2.10.{metric_index + 1}.{step_index + 1}: Sending node proposal")
                print(f"[SERVER] → Sending proposed node and edges to client for approval")
                await ws.send_json({
                    "type": "node_proposed",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "node": next_node,
                    "edges": rewritten_edges,
                })

                print(f"\n[SERVER] Phase 2.11.{metric_index + 1}.{step_index + 1}: Requesting approval")
                print(f"[SERVER] → Waiting for user to approve, reject, or quit")
                await ws.send_json({
                    "type": "await_approval",
                    "metric_index": metric_index,
                    "step_index": step_index,
                })

                try:
                    print(f"[SERVER] ⏳ Blocking on ws.receive_text() - waiting for approval...")
                    msg = await ws.receive_text()
                    print(f"[SERVER] ✓ Received approval response: {msg[:100]}...")
                    
                    approval_data = json.loads(msg)
                    action = approval_data.get("action")
                    print(f"[SERVER] → Parsed action: '{action}'")

                    if action == "quit":
                        print(f"[SERVER] ❌ User requested to quit")
                        await ws.send_json({"type": "done", "reason": "quit"})
                        return False
                    if action == "reject":
                        feedback = approval_data.get("feedback", "")
                        print(f"[SERVER] ⚠️  User rejected node (feedback: '{feedback}')")
                        print(f"[SERVER] → Regenerating step {step_index + 1} with feedback")
                        await ws.send_json({
                            "type": "status",
                            "message": f"Regenerating step {step_index + 1} for metric {metric_name}...",
                        })
                        # TODO: Use feedback to improve next node generation
                        continue
                    if action != "approve":
                        print(f"[SERVER] ⚠️  Invalid action: '{action}'")
                        await ws.send_json({
                            "type": "error",
                            "message": "Invalid action. Use 'approve', 'reject', or 'quit'",
                        })
                        continue

                    print(f"\n[SERVER] Phase 2.12.{metric_index + 1}.{step_index + 1}: Adding node to graph")
                    print(f"[SERVER] → Adding approved node to Phase 2 graph")
                    self._finalize_node(next_node, rewritten_edges, step_index)
                    print(f"[SERVER] → Phase 2 graph now has {len(self.phase2_graph['nodes'])} nodes, {len(self.phase2_graph['edges'])} edges")

                    print(f"\n[SERVER] Phase 2.13.{metric_index + 1}.{step_index + 1}: Sending approval confirmation")
                    await ws.send_json({
                        "type": "node_approved",
                        "metric_index": metric_index,
                        "step_index": step_index,
                        "message": f"Metric {metric_name}: Step {step_index + 1} approved",
                    })

                    step_index += 1

                except Exception as e:
                    print(f"\n[SERVER] ❌ Error processing node approval: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    await ws.send_json({
                        "type": "error",
                        "message": f"Error: {str(e)}",
                    })
                    return False

        print(f"\n[SERVER] Phase 2.14: All metrics processed")
        print(f"[SERVER] → Sending Phase 2 completion message")
        await ws.send_json({
            "type": "phase2_complete",
            "message": "Phase 2 completed successfully for all metrics",
        })
        print(f"[SERVER] ✓ Phase 2 completed successfully")
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

        def _node_sort_key(node: Dict[str, Any]) -> int:
            node_id = str(node.get("id", ""))
            if node_id.startswith("n") and node_id[1:].isdigit():
                return int(node_id[1:])
            return sys.maxsize

        filter_nodes.sort(key=_node_sort_key)
        self.filter_index = {node.get("id"): node for node in filter_nodes}
        self.metric_filter_map = auto_assign_filters_to_metrics(
            self.metrics_list,
            filter_nodes,
            self.input_node_id,
        )

        max_idx = 0
        for node in self.phase1_flowchart.get("nodes", []):
            node_id = node.get("id", "")
            if node_id.startswith("n") and node_id[1:].isdigit():
                max_idx = max(max_idx, int(node_id[1:]))
        self.next_node_counter = max_idx

    def _next_node_id(self) -> str:
        self.next_node_counter += 1
        return f"n{self.next_node_counter}"

    def _current_graph_snapshot(self) -> Dict[str, Any]:
        return {
            "nodes": list(self.phase1_flowchart.get("nodes", [])) + list(self.phase2_graph["nodes"]),
            "edges": list(self.phase1_flowchart.get("edges", [])) + list(self.phase2_graph["edges"]),
        }

    def _rewrite_edges_for_filter(
        self,
        edges: List[Dict[str, Any]],
        primary_filter_id: Optional[str],
        proposed_node_id: str,
    ) -> List[Dict[str, Any]]:
        rewritten: List[Dict[str, Any]] = []
        for edge in edges:
            new_edge = {
                "source": edge.get("source"),
                "target": edge.get("target"),
            }
            if primary_filter_id and new_edge["source"] == self.input_node_id:
                new_edge["source"] = primary_filter_id
            rewritten.append(new_edge)

        if primary_filter_id:
            connected = any(
                edge.get("source") == primary_filter_id and edge.get("target") == proposed_node_id
                for edge in rewritten
            )
            if not connected:
                rewritten.append({"source": primary_filter_id, "target": proposed_node_id})

        return rewritten

    def _finalize_node(
        self,
        node: Dict[str, Any],
        edges: List[Dict[str, Any]],
        step_index: Optional[int] = None,
    ) -> None:
        new_id = self._next_node_id()
        old_id = node.get("id")

        committed_node = json.loads(json.dumps(node))  # deep copy via json for safety
        committed_node["id"] = new_id
        self.phase2_graph["nodes"].append(committed_node)

        for edge in edges:
            new_edge = dict(edge)
            if new_edge.get("source") == old_id:
                new_edge["source"] = new_id
            if new_edge.get("target") == old_id:
                new_edge["target"] = new_id
            self.phase2_graph["edges"].append(new_edge)

        self.snapshot_counter += 1
        
        # Save incremental flowchart after each node approval
        self._save_flowchart(step_index)

    def _save_flowchart(self, step_index: Optional[int] = None):
        """Save current flowchart state incrementally."""
        print(f"\n[SERVER] Saving flowchart (step_index={step_index})")
        print(f"[SERVER] → Merging Phase 1 ({len(self.phase1_flowchart.get('nodes', []))} nodes) + Phase 2 ({len(self.phase2_graph['nodes'])} nodes)")
        
        # Use builder's merge_and_save to get properly formatted output and save to file
        merged = self.builder.merge_and_save(
            self.phase1_flowchart,
            self.phase2_graph,
            output_dir=str(self.output_dir),
        )
        
        # merged is a dict with nodes, edges, agents, viewport
        node_count = len(merged.get("nodes", []))
        edge_count = len(merged.get("edges", []))
        
        print(f"[SERVER] → Total: {node_count} nodes, {edge_count} edges")
        print(f"[SERVER] ✓ Saved flowchart.json")

        # Also save step file if step_index provided
        if step_index is not None:
            step_file = self.output_dir / f"flowchart_node_{step_index:02d}.json"
            print(f"[SERVER] → Also saving step file: {step_file}")
            with step_file.open("w", encoding="utf-8") as f:
                json.dump(merged, f, indent=2)
            print(f"[SERVER] ✓ Saved step file")

    async def save_final_flowchart(self, ws: WebSocket):
        """Merge Phase 1 and Phase 2 and save final flowchart."""
        print("\n[SERVER] Saving final flowchart")
        print("[SERVER] → This is the complete flowchart with all approved nodes")
        self._save_flowchart()
        
        # merge_and_save already saved the file, just get the merged data
        merged = self.builder.merge_and_save(self.phase1_flowchart, self.phase2_graph, str(self.output_dir))
        
        # merged is a dict with nodes, edges, agents, viewport - send this to client
        print(f"\n[SERVER] Sending final flowchart to client")
        print(f"[SERVER] → Final flowchart contains:")
        print(f"[SERVER]   - {len(merged.get('nodes', []))} total nodes")
        print(f"[SERVER]   - {len(merged.get('edges', []))} total edges")
        print(f"[SERVER]   - Saved at: {self.output_dir / 'flowchart.json'}")
        await ws.send_json({
            "type": "final",
            "flowchart": merged,
            "path": str(self.output_dir / "flowchart.json"),
            "message": "Final flowchart saved successfully"
        })
        print(f"[SERVER] ✓ Final flowchart sent to client")

    async def run(self, ws: WebSocket):
        """Main session flow: Phase 1 → Phase 2 → Save."""
        print("\n" + "="*60)
        print("[SERVER] STEP 1: Starting session")
        print(f"[SERVER] → Processing {len(self.metrics_list)} metric(s)")
        for i, metric in enumerate(self.metrics_list):
            print(f"[SERVER]   - Metric {i+1}: {metric.get('metric_name', 'Unknown')}")
        print("="*60)
        
        await ws.send_json({
            "type": "session_start",
            "metrics": self.metrics_list,
            "message": f"Starting session for {len(self.metrics_list)} SLA metrics"
        })
        
        # Phase 1
        print("\n[SERVER] STEP 2: Starting Phase 1 (Input & Filter Builder)")
        print("[SERVER] → This phase will create input nodes and filter nodes using LLM")
        print("[SERVER] → Waiting for user input to proceed...")
        phase1_success = await self.run_phase1_interactive(ws)
        if not phase1_success:
            print("\n[SERVER] ❌ Phase 1 failed or user quit")
            await ws.send_json({"type": "done", "reason": "phase1_failed"})
            return

        # Save phase 1 flowchart
        print("\n[SERVER] STEP 3: Saving Phase 1 flowchart")
        print("[SERVER] → Saving initial flowchart with input and filter nodes")
        try:
            # Use an empty Phase 2 graph so the merged result is exactly
            # the Phase 1 flowchart (modulo id normalization in merge).
            self.builder.merge_and_save(
                self.phase1_flowchart,
                {"nodes": [], "edges": []},
                output_dir=str(self.output_dir),
            )
            print(f"[SERVER] ✓ Saved to: {self.output_dir / 'flowchart.json'}")
        except Exception as e:
            print(f"[SERVER] ❌ Error saving Phase 1 flowchart: {str(e)}")
            await ws.send_json({
                "type": "error",
                "message": f"Error saving Phase 1 flowchart snapshot: {str(e)}",
            })
        
        # Phase 2
        print("\n[SERVER] STEP 4: Starting Phase 2 (Metric Calculation Builder)")
        print("[SERVER] → This phase will propose calculation nodes one by one using LLM")
        print("[SERVER] → Each node requires user approval (approve/reject/quit)")
        phase2_success = await self.run_phase2_iterative(ws)
        if not phase2_success:
            print("\n[SERVER] ❌ Phase 2 failed or user quit")
            await ws.send_json({"type": "done", "reason": "phase2_failed"})
            return
        
        # Save final
        print("\n[SERVER] STEP 5: Saving final flowchart")
        print("[SERVER] → Merging Phase 1 and Phase 2 nodes into final flowchart")
        await self.save_final_flowchart(ws)
        print("[SERVER] ✓ Final flowchart saved and sent to client")
        
        print("\n[SERVER] STEP 6: Session complete")
        print("[SERVER] → Sending 'done' message to client")
        await ws.send_json({"type": "done", "reason": "complete"})
        print("[SERVER] ✓ Session completed successfully")
        print("="*60 + "\n")


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    
    try:
        # Wait for initial message with metric/description
        init_msg = await ws.receive_text()
        init_data = json.loads(init_msg)
        # Always use the default output dir inside server folder
        output_dir = str(DEFAULT_OUTPUT_DIR)
        api_key = init_data.get("anthropic_api_key")

        # Create a unique session id for this websocket connection and
        # use it as the subdirectory for generated flowcharts. This
        # lets us clean up everything tied to the websocket when it
        # disconnects.
        session_id = str(uuid.uuid4())
        session_output_dir = str(Path(output_dir) / session_id)

        metrics_list = init_data.get("metrics")
        if not metrics_list:
            if init_data.get("metrics_file"):
                path = Path(init_data["metrics_file"]).expanduser()
                metrics_list = load_metrics_from_file(path)
            elif init_data.get("pdf_path"):
                pdf_path = init_data["pdf_path"]
                metrics_list, saved_path = generate_metrics_from_pdf(
                    pdf_path,
                    Path(output_dir),
                    api_key=api_key,
                )
                await ws.send_json({
                    "type": "metrics_loaded",
                    "message": f"Extracted metrics from {pdf_path} into {saved_path}",
                })
            else:
                metric = init_data.get("metric", "Payment Latency")
                description = init_data.get(
                    "description",
                    "Latency between payment-charge and webhook-sent",
                )
                category = init_data.get("category", "unspecified")
                metrics_list = [
                    {
                        "metric_name": metric,
                        "description": description,
                        "category": category,
                    }
                ]

        if not metrics_list:
            await ws.send_json({
                "type": "error",
                "message": "No SLA metrics provided."
            })
            await ws.close()
            return

        print(f"\n=== Creating Agentic Session ===")
        print(f"Loaded {len(metrics_list)} metrics for processing")
        
        # Inform client of the session id so they can reference it if needed
        try:
            await ws.send_json({"type": "session_id", "session_id": session_id})
        except Exception:
            # best-effort; continue even if client doesn't accept the message
            pass

        session = WSAgenticSession(metrics_list, output_dir=session_output_dir, api_key=api_key)
        try:
            await session.run(ws)
        finally:
            # Session finished normally (client closed or run completed).
            # Remove any generated flowcharts for this websocket session
            try:
                if Path(session_output_dir).exists():
                    shutil.rmtree(session_output_dir)
                    print(f"Removed session output dir: {session_output_dir}")
            except Exception as e:
                print(f"Error removing session dir {session_output_dir}: {e}")
        
    except WebSocketDisconnect:
        print("Client disconnected")
        # On abrupt disconnect, attempt to remove any session artifacts
        try:
            if 'session_output_dir' in locals() and Path(session_output_dir).exists():
                shutil.rmtree(session_output_dir)
                print(f"Removed session output dir after disconnect: {session_output_dir}")
        except Exception as e:
            print(f"Error removing session dir after disconnect: {e}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        try:
            await ws.send_json({
                "type": "error",
                "message": f"Server error: {str(e)}"
            })
        except:
            pass


if __name__ == "__main__":
    import os
    # Use a different port to avoid conflict with main API server
    port = int(os.getenv("CONTRACT_PARSER_PORT", "8001"))
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        ws_ping_interval=None,
        ws_ping_timeout=None,
    )

