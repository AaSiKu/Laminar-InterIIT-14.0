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
from ..agents.drafter_agent import DrafterAgent


def create_workflow(agent_model: BaseChatModel, reasoning_model: BaseChatModel) -> StateGraph:
    """
    Create the LangGraph workflow for report generation.
    
    Workflow structure:
    1. Planner (LLM call #1) - Analyzes inputs, creates plan
    2. RulebookMatcher (rule-based) - Matches relevant rules
    3. Drafter (LLM call #2) - Drafts final report
    
    Args:
        agent_model: LLM model for Planner (from create_agent_model)
        reasoning_model: LLM model for Drafter (from create_reasoning_model)
        
    Returns:
        Compiled StateGraph workflow
    """
    
    # Initialize agents with LLM instances from factory
    planner = PlannerAgent(llm=agent_model)
    rulebook_matcher = RulebookMatcher()
    drafter = DrafterAgent(llm=reasoning_model)
    
    # Define workflow nodes
    def planner_node(state: ReportState) -> ReportState:
        """Node 1: Plan the report"""
        print("[1/3] Planning report structure...")
        start_time = time.time()
        
        try:
            plan = planner.plan(state["diagnostic_data"])
            state["report_plan"] = plan.model_dump()
            print(f"Plan created in {time.time() - start_time:.2f}s")
        except Exception as e:
            state["error"] = f"Planner failed: {str(e)}"
            print(f"Planner failed: {e}")
        
        return state
    
    def rulebook_matcher_node(state: ReportState) -> ReportState:
        """Node 2: Match relevant rules"""
        print("[2/3] Matching relevant rules...")
        start_time = time.time()
        
        try:
            matched_rules = rulebook_matcher.match(state["diagnostic_data"])
            state["matched_rules"] = matched_rules
            print(f"  ✓ Matched {len(matched_rules)} rules in {time.time() - start_time:.2f}s")
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            state["error"] = f"Rule matching failed: {str(e)}"
            print(f"Rule matching failed: {e}")
            print(f"Error details:\n{error_details}")
        
        return state
    
    def drafter_node(state: ReportState) -> ReportState:
        """Node 3: Draft final report"""
        print("[3/3] Drafting final report...")
        start_time = time.time()
        
        try:
            report = drafter.draft(
                report_plan=state["report_plan"],
                diagnostic_data=state["diagnostic_data"],
                matched_rules=state["matched_rules"],
                charts=[]  # No charts generated
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
    workflow.add_node("rulebook_matcher", rulebook_matcher_node)
    workflow.add_node("drafter", drafter_node)
    
    # Define edges (linear flow: Planner → RulebookMatcher → Drafter)
    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "rulebook_matcher")
    workflow.add_edge("rulebook_matcher", "drafter")
    workflow.add_edge("drafter", END)
    
    # Compile workflow
    return workflow.compile()
