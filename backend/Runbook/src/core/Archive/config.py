"""
DEPRECATED: Use load_dotenv() directly in your modules instead

This config module added unnecessary abstraction.
Simply use:

    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    api_key = os.getenv('GOOGLE_API_KEY')
    database_url = os.getenv('DATABASE_URL', 'sqlite+aiosqlite:///./runbook.db')

This is simpler, more explicit, and easier to understand.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# For backward compatibility only - prefer using os.getenv() directly
def get_config():
    """Deprecated: Use os.getenv() directly instead"""
    class _Config:
        @property
        def google_api_key(self):
            return os.getenv('GOOGLE_API_KEY')
        
        @property
        def database_url(self):
            return os.getenv('DATABASE_URL', 'sqlite+aiosqlite:///./runbook.db')
        
        @property
        def llm_model(self):
            return os.getenv('LLM_MODEL', 'gemini-2.5-flash')
        
        @property
        def llm_temperature(self):
            return float(os.getenv('LLM_TEMPERATURE', '0.3'))
        
        @property
        def llm_max_tokens(self):
            return int(os.getenv('LLM_MAX_TOKENS', '4096'))
        
        @property
        def llm_timeout(self):
            return int(os.getenv('LLM_TIMEOUT', '120'))
    
    return _Config()


class Config(_Config):
    """Deprecated: Use os.getenv() directly instead"""
    pass
