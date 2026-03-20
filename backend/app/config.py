from dotenv import load_dotenv
import os
load_dotenv()
# OpenRouter API Key (supports free models)

def get_openai_key():
    """Get OpenRouter API key from environment or config."""
    key=os.getenv("OPENROUTER_API_KEY")
    if not key:
        return ValueError("OPENROUTER_API_KEY not found in environment variable")
    return key
