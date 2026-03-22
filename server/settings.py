# settings.py
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseModel):
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    anthropic_api_key: str | None = os.getenv("ANTHROPIC_API_KEY")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    deepseek_api_key: str | None = os.getenv("DEEPSEEK_API_KEY")
    grok_api_key: str | None = os.getenv("GROK_API_KEY")
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")

    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    grok_model: str = os.getenv("GROK_MODEL", "grok-2-latest")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    deepseek_base_url: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    grok_base_url: str = os.getenv("GROK_BASE_URL", "https://api.x.ai")
    groq_base_url: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai")
    experimental_providers_enabled: bool = os.getenv("ENABLE_DEEPSEEK_GROK", "0") == "1"

settings = Settings()
