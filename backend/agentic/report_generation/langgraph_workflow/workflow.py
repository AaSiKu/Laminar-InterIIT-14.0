"""
LangGraph Workflow Definition
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any
from langchain_core.language_models import BaseChatModel
from langgraph.graph import StateGraph, END
import time

from .state import ReportState
from ..agents.planner_agent import PlannerAgent
from ..agents.rulebook_matcher import RulebookMatcher
from ..agents.chart_data_extractor import ChartDataExtractor
from ..agents.chart_gen_agent import ChartGenAgent
from ..agents.drafter_agent import DrafterAgent
def create_workflow(agent_model: BaseChatModel, reasoning_model: BaseChatModel) -> StateGraph:
    """
    Create the LangGraph workflow for report generation.
    
    Workflow structure:
    1. Planner (LLM call #1) - Analyzes inputs, creates plan
    2. Parallel:
       - RulebookMatcher (rule-based) - Matches relevant rules
       - ChartDataExtractor (rule-based) - Extracts chart data
    3. ChartGen (LLM call #2) - Generates Mermaid charts
    4. Drafter (LLM call #3) - Drafts final report
    
    Args:
        agent_model: LLM model for Planner and ChartGen (from create_agent_model)
        reasoning_model: LLM model for Drafter (from create_reasoning_model)
        
    Returns:
        Compiled StateGraph workflow
    """
    
    # Initialize agents with LLM instances from factory
    planner = PlannerAgent(llm=agent_model)
    rulebook_matcher = RulebookMatcher()
    chart_extractor = ChartDataExtractor()
    chart_gen = ChartGenAgent(llm=agent_model)
    drafter = DrafterAgent(llm=reasoning_model)
    
    # Define workflow nodes
    def planner_node(state: ReportState) -> ReportState:
        """Node 1: Plan the report"""
        print("[1/4] Planning report structure...")
        start_time = time.time()
        
        try:
            plan = planner.plan(state["diagnostic_data"])
            state["report_plan"] = plan.model_dump()
            print(f"Plan created in {time.time() - start_time:.2f}s")
        except Exception as e:
            state["error"] = f"Planner failed: {str(e)}"
            print(f"Planner failed: {e}")
        
        return state
    
    def parallel_processing_node(state: ReportState) -> ReportState:
        """Node 2: Parallel processing - match rules and extract chart data"""
        print("[2/4] Matching rules and extracting chart data (parallel)...")
        start_time = time.time()
        
        try:
            # Process in parallel (though Python GIL limits true parallelism)
            matched_rules = rulebook_matcher.match(state["diagnostic_data"])
            chart_requirements = state["report_plan"].get("chart_requirements", [])
            chart_data = chart_extractor.extract(state["diagnostic_data"], chart_requirements)
            
            state["matched_rules"] = matched_rules
            state["chart_data"] = chart_data
            
            print(f"  ✓ Matched {len(matched_rules)} rules, extracted {len(chart_data)} charts in {time.time() - start_time:.2f}s")
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            state["error"] = f"Parallel processing failed: {str(e)}"
            print(f"Parallel processing failed: {e}")
            print(f"Error details:\n{error_details}")
        
        return state
    
    def chart_gen_node(state: ReportState) -> ReportState:
        """Node 3: Generate Mermaid charts"""
        print("[3/4] Generating Mermaid charts...")
        start_time = time.time()
        
        try:
            charts = chart_gen.generate(state["chart_data"])
            state["charts"] = charts
            print(f"  ✓ Generated {len(charts)} charts in {time.time() - start_time:.2f}s")
        except Exception as e:
            state["error"] = f"Chart generation failed: {str(e)}"
            print(f"Chart generation failed: {e}")
        
        return state
    
    def drafter_node(state: ReportState) -> ReportState:
        """Node 4: Draft final report"""
        print("[4/4] Drafting final report...")
        start_time = time.time()
        
        try:
            report = drafter.draft(
                report_plan=state["report_plan"],
                diagnostic_data=state["diagnostic_data"],
                matched_rules=state["matched_rules"],
                charts=state["charts"]
            )
            state["final_report"] = report
            print(f"Report drafted in {time.time() - start_time:.2f}s")
        except Exception as e:
            state["error"] = f"Drafter failed: {str(e)}"
            print(f"Drafter failed: {e}")
        
        return state
    
    # Build workflow graph
    workflow = StateGraph(ReportState)
    
    # Add nodes
    workflow.add_node("planner", planner_node)
    workflow.add_node("parallel_processing", parallel_processing_node)
    workflow.add_node("chart_gen", chart_gen_node)
    workflow.add_node("drafter", drafter_node)
    
    # Define edges (linear flow)
    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "parallel_processing")
    workflow.add_edge("parallel_processing", "chart_gen")
    workflow.add_edge("chart_gen", "drafter")
    workflow.add_edge("drafter", END)
    
    # Compile workflow
    return workflow.compile()
