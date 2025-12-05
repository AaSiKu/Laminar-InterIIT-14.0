import json
import sys
import re
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
        self.feedback_history: Dict[str, Dict[int, List[str]]] = {}  # metric_name -> step_index -> list of feedback strings

    async def run_phase1_interactive(self, ws: WebSocket) -> bool:
        """Run Phase 1 interactively via WebSocket.
        
        Returns True if Phase 1 completed successfully, False otherwise.
        """
        await ws.send_json({
            "type": "phase",
            "phase": 1,
            "message": "Starting Phase 1: Input & Filter Builder (multi-metric)"
        })

        metrics_text = json.dumps(self.metrics_list, indent=2)
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

        response = self.builder.client.messages.create(
            model=self.builder.model_name,
            max_tokens=4000,
            messages=[{"role": "user", "content": initial_msg}]
        )
        response_text = response.content[0].text

        conversation_history.append({"role": "user", "content": initial_msg})
        conversation_history.append({"role": "assistant", "content": response_text})

        await ws.send_json({
            "type": "agent_response",
            "phase": 1,
            "message": response_text
        })
        
        # Interactive loop
        while True:
            # Check if we have a complete flowchart
            flowchart_data = None
            mapping_data = None
            
            # Extract all JSON blocks
            json_blocks = re.findall(r"```json(.*?)```", response_text, re.DOTALL)
            
            # Also try to parse the whole text if it's raw JSON
            if not json_blocks:
                try:
                    json.loads(response_text)
                    json_blocks = [response_text]
                except:
                    pass

            for block in json_blocks:
                try:
                    data = json.loads(block.strip())
                    if "nodes" in data and "edges" in data:
                        flowchart_data = data
                        # If mapping is inside the flowchart block (legacy/fallback)
                        if "metric_mapping" in data:
                            mapping_data = {"metric_mapping": data["metric_mapping"]}
                    elif "metric_mapping" in data:
                        mapping_data = data
                except Exception:
                    pass
            
            if flowchart_data:
                # Post-process: ensure open_tel_spans_input has required fields
                for node in flowchart_data.get("nodes", []):
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
                
                # Inject mapping if found
                if mapping_data and "metric_mapping" in mapping_data:
                    flowchart_data["metric_mapping"] = mapping_data["metric_mapping"]

                self.phase1_flowchart = flowchart_data
                self._prepare_filter_metadata()
                await ws.send_json({
                    "type": "phase1_complete",
                    "flowchart": flowchart_data,
                    "message": "Phase 1 completed successfully"
                })
                return True
            
            # Wait for user input
            await ws.send_json({
                "type": "await_input",
                "phase": 1
            })
            
            try:
                msg = await ws.receive_text()
                user_data = json.loads(msg)
                user_input = user_data.get("message", "").strip()
                
                if user_input.lower() in ('quit', 'exit'):
                    await ws.send_json({"type": "done", "reason": "quit"})
                    return False
                
                # Add to conversation
                conversation_history.append({"role": "user", "content": user_input})
                
                # Get response
                response = self.builder.client.messages.create(
                    model=self.builder.model_name,
                    max_tokens=4000,
                    messages=conversation_history
                )
                response_text = response.content[0].text
                conversation_history.append({"role": "assistant", "content": response_text})
                
                await ws.send_json({
                    "type": "agent_response",
                    "phase": 1,
                    "message": response_text
                })
                
            except Exception as e:
                await ws.send_json({
                    "type": "error",
                    "message": f"Error: {str(e)}"
                })
                return False

    async def run_phase2_iterative(self, ws: WebSocket) -> bool:
        """Run Phase 2 iteratively via WebSocket with user approval for each node."""

        await ws.send_json({
            "type": "phase",
            "phase": 2,
            "message": "Starting Phase 2: Metric Calculation Builder"
        })

        from contractparseragent.graph_builder import build_macro_plan, build_next_node

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

            await ws.send_json({
                "type": "metric_start",
                "metric_index": metric_index,
                "metric_name": metric_name,
                "filters": filter_ids,
                "filter_context": filter_context,
            })

            plan_data = build_macro_plan(metric_name, metric_desc, self.phase1_flowchart, filter_context)
            macro_plan = plan_data.get("steps", [])
            metric_desc_refined = plan_data.get("metric_description", metric_desc)

            await ws.send_json({
                "type": "macro_plan",
                "metric_index": metric_index,
                "steps": macro_plan,
                "metric_description": metric_desc_refined,
                "total_steps": len(macro_plan),
            })

            step_index = 0
            while step_index < len(macro_plan):
                await ws.send_json({
                    "type": "step_start",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "total_steps": len(macro_plan),
                    "step": macro_plan[step_index],
                })

                current_graph = self._current_graph_snapshot()
                
                # Prepare user feedback
                feedback_list = self.feedback_history.get(metric_name, {}).get(step_index, [])
                user_feedback = ""
                if feedback_list:
                    user_feedback = "\n".join(f"- {f}" for f in feedback_list)
                
                llm_result = build_next_node(
                    current_graph,
                    macro_plan,
                    step_index,
                    filter_context,
                    user_feedback,
                )
                macro_plan = llm_result.get("macro_plan", macro_plan)
                next_node = llm_result.get("next_node")
                next_edges = llm_result.get("next_edges", [])

                if not next_node:
                    await ws.send_json({
                        "type": "error",
                        "message": "LLM did not return a node for this step",
                    })
                    return False

                rewritten_edges = self._rewrite_edges_for_filter(
                    next_edges,
                    primary_filter_id,
                    next_node.get("id"),
                )

                await ws.send_json({
                    "type": "node_proposed",
                    "metric_index": metric_index,
                    "step_index": step_index,
                    "node": next_node,
                    "edges": rewritten_edges,
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
                        # Collect and accumulate feedback
                        feedback = approval_data.get("feedback", "").strip()
                        if feedback:
                            if metric_name not in self.feedback_history:
                                self.feedback_history[metric_name] = {}
                            if step_index not in self.feedback_history[metric_name]:
                                self.feedback_history[metric_name][step_index] = []
                            self.feedback_history[metric_name][step_index].append(feedback)
                            print(f"Feedback recorded for step {step_index}: {feedback}")
                        
                        await ws.send_json({
                            "type": "status",
                            "message": f"Regenerating step {step_index + 1} for metric {metric_name}...",
                        })
                        continue
                    if action != "approve":
                        await ws.send_json({
                            "type": "error",
                            "message": "Invalid action. Use 'approve', 'reject', or 'quit'",
                        })
                        continue

                    self._finalize_node(next_node, rewritten_edges)

                    await ws.send_json({
                        "type": "node_approved",
                        "metric_index": metric_index,
                        "step_index": step_index,
                        "message": f"Metric {metric_name}: Step {step_index + 1} approved",
                    })

                    step_index += 1

                except Exception as e:
                    await ws.send_json({
                        "type": "error",
                        "message": f"Error: {str(e)}",
                    })
                    return False

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

        def _node_sort_key(node: Dict[str, Any]) -> int:
            node_id = str(node.get("id", ""))
            if node_id.startswith("n") and node_id[1:].isdigit():
                return int(node_id[1:])
            return sys.maxsize

        filter_nodes.sort(key=_node_sort_key)
        self.filter_index = {node.get("id"): node for node in filter_nodes}
        
        explicit_mapping = self.phase1_flowchart.get("metric_mapping")
        self.metric_filter_map = auto_assign_filters_to_metrics(
            self.metrics_list,
            filter_nodes,
            self.input_node_id,
            explicit_mapping=explicit_mapping,
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
        self.builder.merge_and_save(
            self.phase1_flowchart,
            self.phase2_graph,
            output_dir=str(self.output_dir),
        )

    async def save_final_flowchart(self, ws: WebSocket):
        """Merge Phase 1 and Phase 2 and save final flowchart."""
        merged = self.builder.merge_and_save(self.phase1_flowchart, self.phase2_graph, str(self.output_dir))
        
        await ws.send_json({
            "type": "final",
            "flowchart": merged,
            "path": str(self.output_dir / "flowchart.json"),
            "message": "Final flowchart saved successfully"
        })

    async def run(self, ws: WebSocket):
        """Main session flow: Phase 1 → Phase 2 → Save."""
        await ws.send_json({
            "type": "session_start",
            "metrics": self.metrics_list,
            "message": f"Starting session for {len(self.metrics_list)} SLA metrics"
        })
        
        # Phase 1
        phase1_success = await self.run_phase1_interactive(ws)
        if not phase1_success:
            await ws.send_json({"type": "done", "reason": "phase1_failed"})
            return

        # Immediately after Phase 1 completes, persist a snapshot of just
        # the input+filter flowchart before any metric-calculation nodes
        # are added in Phase 2. This will typically be the first
        # flowchart file the user sees.
        try:
            # Use an empty Phase 2 graph so the merged result is exactly
            # the Phase 1 flowchart (modulo id normalization in merge).
            self.builder.merge_and_save(
                self.phase1_flowchart,
                {"nodes": [], "edges": []},
                output_dir=str(self.output_dir),
            )
        except Exception as e:
            await ws.send_json({
                "type": "error",
                "message": f"Error saving Phase 1 flowchart snapshot: {str(e)}",
            })
        
        # Phase 2
        phase2_success = await self.run_phase2_iterative(ws)
        if not phase2_success:
            await ws.send_json({"type": "done", "reason": "phase2_failed"})
            return
        
        # Save final
        await self.save_final_flowchart(ws)
        await ws.send_json({"type": "done", "reason": "complete"})


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
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        ws_ping_interval=None,
        ws_ping_timeout=None,
    )

