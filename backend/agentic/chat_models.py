from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
import os


model = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.0,
    max_retries=2,
    api_key=os.environ["GROQ_API_KEY"]
)

reasoning_model = ChatOpenAI(model="o1", temperature=1, api_key=os.getenv("OPENAI_API_KEY"))
