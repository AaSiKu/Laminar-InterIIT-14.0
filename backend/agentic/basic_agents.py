from typing import Annotated, List
from typing_extensions import TypedDict
import operator
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END, START
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.types import Send


def generate_report(query: str, model):
    
    class Section(BaseModel):
        name: str = Field(description="the title of the section for the report ")
        description: str = Field(description=" overview about the main topics and concepts that should be written in this section of the report")

    class list_sections(BaseModel):
        sections: List[Section] = Field("sections of the report")

    class State(TypedDict):
        topic: str
        sections: List[Section]
        completed_sections: Annotated[list, operator.add]
        final_report: str

    class WorkerState(TypedDict):
        section: Section
        completed_sections: Annotated[list, operator.add]

    def orchestor(state: State):
        result = model.with_structured_output(list_sections).invoke([
            SystemMessage(content=" generate a plan for the report from the given text."),
            HumanMessage(content=f" text : {state['topic']}")
        ])
        return {"sections": result.sections}

    def llm_call(state: WorkerState):
        result = model.invoke([
            SystemMessage(content=" generate the report section based on the name and description of the section given. include no preamble. use markdown format "),
            HumanMessage(content=f'here is the name : {state["section"].name} and the description : {state["section"].description}')
        ])
        return {'completed_sections': [result.content]}

    def router(state: State):
        return [Send("llm_call", {"section": s}) for s in state['sections']]

    def synth(state: State):
        sections = state['completed_sections']
        final_report = "\n\n---\n\n".join(sections)
        return {"final_report": final_report}

    graph_builder = StateGraph(State)
    graph_builder.add_node("orchestor", orchestor)
    graph_builder.add_node("llm_call", llm_call)
    graph_builder.add_node("synth", synth)
    graph_builder.add_edge(START, "orchestor")
    graph_builder.add_conditional_edges("orchestor", router, ["llm_call"])
    graph_builder.add_edge("llm_call", "synth")
    graph_builder.add_edge("synth", END)
    
    graph = graph_builder.compile()
    result = graph.invoke({"topic": query})
    
    return result["final_report"]
if __name__ == "__main__":
    from dotenv import load_dotenv

    load_dotenv()
    from langchain_groq import ChatGroq
    model = ChatGroq(model ="llama-3.3-70b-versatile")
    query = '''
    generate report based on the following text 
    Under the specific constraints that x(t) = 0 for t < 0 and that x(t) contains no impulses
or higher order singularities at the origin, one can directly calculate, from the Laplace
transform, the initial value x(O+)-i.e., x(t) as t approaches zero from positive values of
t. Specifically the initial-value theorem states that
x(O+) = lim sX(s), (9.110)
s~x
Also, if x(t) = 0 fort< 0 and, in addition, x(t) has a finite limit as t ~ x, then the finalvalue theorem says that lim x(t) = lim sX(s). (9.111)
t---+x s---->0
    '''
    print(generate_report(query , model))