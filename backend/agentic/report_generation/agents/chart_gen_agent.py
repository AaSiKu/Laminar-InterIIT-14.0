"""
Chart Generation Agent: Generates Mermaid chart syntax from chart data
LLM Call #2
"""

from typing import Dict, Any, List, Union
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import json


class ChartItem(BaseModel):
    """Individual chart with metadata"""
    title: str = Field(description="Chart title")
    mermaid_syntax: str = Field(description="Valid Mermaid diagram syntax")
    chart_type: str = Field(description="Type of chart: line, flowchart, timeline, bar")


class ChartOutput(BaseModel):
    """Structured chart output"""
    charts: List[ChartItem] = Field(description="List of charts with mermaid syntax and metadata")


class ChartGenAgent:
    """
    Generates Mermaid chart syntax from structured chart data.
    """
    
    def __init__(self, llm: Union[BaseChatModel, None] = None, google_api_key: str = None, model_name: str = None):
        """
        Initialize ChartGenAgent with either an LLM instance or API credentials.
        
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
                temperature=0.1
            )
        else:
            raise ValueError(
                "Either provide 'llm' instance or both 'google_api_key' and 'model_name'"
            )
        
        self.structured_llm = self.llm.with_structured_output(ChartOutput)
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a data visualization expert specializing in Mermaid diagrams for operational reports.

CRITICAL RULES - FOLLOW EXACTLY:
1. Create ONLY pipeline topology flowcharts
2. ABSOLUTELY NO STYLING - no "style" lines, no colors, no fill, no stroke
3. Use subgraph ONLY to highlight affected nodes
4. Keep it simple - just nodes, arrows, and one subgraph

EXAMPLE OF CORRECT OUTPUT (copy this pattern exactly):
```
graph TD
    A[Kafka Consumer] --> B[JSON Parser]
    B --> C[Transform Node]
    C --> D[ML Model]
    D --> E[API Gateway]
    
    subgraph AFFECTED
        C
    end
```

FORBIDDEN - DO NOT INCLUDE:
- style commands (e.g., "style C fill:#f9f")
- color specifications
- stroke specifications
- fill specifications
- Any line starting with "style"

Guidelines:
- Normal nodes: Use square brackets [Node Name]
- Affected nodes: Reference by letter only inside subgraph AFFECTED
- Use graph TD for top-down layout
- Simple subgraph label: just "AFFECTED" with no quotes or emoji
- If chart data is time-series, skip it completely"""),
            ("user", """Generate Mermaid chart syntax for these chart requirements:

{chart_data}

For each chart, provide:
1. title: A clear chart title
2. mermaid_syntax: Valid Mermaid diagram code (without ``` markers)
3. chart_type: The type (line, flowchart, timeline, bar)

Return structured output with all charts.""")
        ])
        
        self.chain = self.prompt | self.structured_llm
    
    def generate(self, chart_data: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """
        Generate Mermaid charts from chart data.
        
        Args:
            chart_data: List of chart data structures
            
        Returns:
            List of charts with Mermaid syntax
        """
        result = self.chain.invoke({
            "chart_data": json.dumps(chart_data, indent=2)
        })
        
        # Convert Pydantic models to dicts
        charts = []
        for chart in result.charts:
            charts.append({
                "title": chart.title,
                "mermaid_syntax": chart.mermaid_syntax,
                "chart_type": chart.chart_type
            })
        
        return charts
