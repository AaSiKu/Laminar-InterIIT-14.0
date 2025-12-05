"""
Drafter Agent: Writes the final comprehensive report
LLM Call #3
"""

from typing import Dict, Any, List, Union
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
import json


class DrafterAgent:
    """
    Writes the final comprehensive report based on all gathered information.
    """
    
    def __init__(self, llm: Union[BaseChatModel, None] = None, google_api_key: str = None, model_name: str = None):
        """
        Initialize DrafterAgent with either an LLM instance or API credentials.
        
        Args:
            llm: Pre-configured LLM instance from factory (preferred)
            google_api_key: Google API key (backward compatibility)
            model_name: Model name (backward compatibility)
        """
        if llm is not None:
            self.llm = llm
        elif google_api_key and model_name:
            # Backward compatibility: create LLM from API key
            self.llm = ChatGoogleGenerativeAI(
                google_api_key=google_api_key,
                model=model_name,
                temperature=0.5
            )
        else:
            raise ValueError(
                "Either provide 'llm' instance or both 'google_api_key' and 'model_name'"
            )
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a senior operations analyst at Laminar, writing reports for Ops Managers. Your reports are known for being clear, actionable, and comprehensive.

Your writing guidelines:
1. **Audience**: Write for Ops Managers who need to make quick decisions
2. **Tone**: Professional, direct, data-driven
3. **Structure**: Follow the provided outline exactly
4. **Length**: Minimum 2000 words, with detailed analysis
5. **Focus**: Balance technical accuracy with business impact

Report sections to include:
- **Executive Summary**: 3-5 bullet points highlighting key findings
- **Incident Overview**: What happened, when, and impact
- **Root Cause Analysis**: Detailed RCA findings with evidence from error_citations
- **Technical Analysis**: Deep dive with error log citations in a table
- **Affected Services**: List all affected services (from affected_services field)
- **Impact Assessment**: Business and technical impact quantification
- **Remediation Actions**: Immediate fixes and long-term improvements
- **Recommendations**: Strategic recommendations based on matched rules

RCA Output Structure (use these fields):
- severity: Impact severity (CRITICAL, HIGH, MEDIUM, LOW)
- affected_services: List of services affected (primary service first)
- narrative: Clear explanation of what happened and why
- error_citations: Specific log entries with timestamp, service, and message
- root_cause: Technical root cause (specific and actionable)

Writing best practices:
- Start each section with a clear topic sentence
- Reference the narrative field for incident overview
- Use error_citations to create the error log table with columns: | Timestamp | Service | Message |
- List all affected_services and their roles in the incident
- Quote the root_cause directly in the Root Cause Analysis section
- Quantify impact wherever possible based on telemetry data
- Provide actionable next steps
- Use clear subheadings for readability

Data presentation:
- Present all data in tables and highlighted text - NO charts or diagrams
- For error logs: create a markdown table from error_citations
- Use tables for metric comparisons (before/after values)
- Highlight key metrics and thresholds in bold text
- NO flowcharts, NO mermaid diagrams, NO visualizations
- NO emoji, NO colors in the final output"""),
            ("user", """Write a comprehensive operational report based on this telemetry analysis:

**Report Plan:**
{report_plan}

**Diagnostic Data:**
RCA Output: {rca_output}
External News: {external_news}
Live Data Stream (30-minute window): {live_data_stream}

**Matched Rules:**
{matched_rules}

Write a complete, professional report that is at least 2000 words. Follow the report plan structure. Present all data in tables and text format - no charts or diagrams.""")
        ])
        
        self.chain = self.prompt | self.llm
    
    def draft(
        self,
        report_plan: Dict[str, Any],
        diagnostic_data: Dict[str, Any],
        matched_rules: List[Dict[str, Any]],
        charts: List[Dict[str, str]]
    ) -> str:
        """
        Write the final comprehensive report.
        
        Args:
            report_plan: Structured plan from PlannerAgent
            diagnostic_data: Complete diagnostic inputs
            matched_rules: Matched rules from RulebookMatcher
            charts: Generated charts from ChartGenAgent
            
        Returns:
            Complete report as Markdown string
        """
        result = self.chain.invoke({
            "report_plan": json.dumps(report_plan, indent=2),
            "rca_output": json.dumps(diagnostic_data.get("rca_output", {}), indent=2),
            "external_news": json.dumps(diagnostic_data.get("external_news", []), indent=2),
            "live_data_stream": json.dumps(diagnostic_data.get("live_data_stream", {}), indent=2),
            "matched_rules": json.dumps(matched_rules, indent=2)
        })
        
        return result.content
