import sqlite3
import hashlib
from typing import Dict

CACHE_DB_PATH = "summarize_prompts_cache.db"

def init_cache_db():
    """Initialize the SQLite cache database"""
    
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS summarize_cache (
            prompt_hash TEXT PRIMARY KEY,
            prompt TEXT NOT NULL,
            response JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def get_cached_response(full_prompt: str) -> str | None:
    """Retrieve cached response for a given prompt"""
    prompt_hash = hashlib.sha256(full_prompt.encode()).hexdigest()
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT response FROM summarize_cache WHERE prompt_hash = ?",
        (prompt_hash,)
    )
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

def cache_response(full_prompt: str, response: Dict):
    """Store a new prompt-response pair in the cache"""
    prompt_hash = hashlib.sha256(full_prompt.encode()).hexdigest()
    conn = sqlite3.connect(CACHE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO summarize_cache (prompt_hash, prompt, response) VALUES (?, ?, ?)",
        (prompt_hash, full_prompt, response)
    )
    conn.commit()
    conn.close()
