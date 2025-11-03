
import os 
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI


class GroqLLM:
    def __init__(self, user_control_inputs):
        self.user_control_inputs =user_control_inputs
    
    def get_llm_model(self):
        try:
            groq_api_key = self.user_control_inputs["API_KEY"]
            model = self.user_control_inputs["selected_model"]                
            llm = ChatGroq(model=model,api_key=groq_api_key)
            
        except Exception as e :
            raise ValueError(f"Exception occured as {e}")
        return llm


class OpenaiLLM:
    def __init__(self, user_control_inputs):
        self.user_control_inputs =user_control_inputs
    
    def get_llm_model(self):
        try:
            openai_api_key = self.user_control_inputs["API_KEY"]
            model = self.user_control_inputs["selected_model"]
            llm = ChatOpenAI(model=model,api_key=openai_api_key)
            
        except Exception as e :
            raise ValueError(f"Exception occured as {e}")
        return llm