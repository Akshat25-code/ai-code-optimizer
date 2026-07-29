# settings.py
"""Application settings with strict secret validation in production."""
from __future__ import annotations

import os
import sys

from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


# Defaults that must NEVER be used in production.
_FORBIDDEN_JWT_SECRETS = {
    "",
    "change_me",
    "your-secret-key-change-in-production",
    "your-secret-key",
    "secret",
    "dev-secret-change-in-production",
}


class Settings(BaseModel):
    # AI providers
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

    # Security
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "")
    access_token_ttl_min: int = int(os.getenv("ACCESS_TOKEN_TTL_MIN", "30"))
    refresh_token_ttl_days: int = int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "30"))

    # OAuth
    oauth_allowed_origins: list[str] = [
        o.strip() for o in os.getenv("OAUTH_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()
    ]
    oauth_base_url: str | None = os.getenv("OAUTH_BASE_URL") or None

    # Sandbox
    enable_code_execution: bool = os.getenv("ENABLE_CODE_EXECUTION", "0") == "1"
    sandbox_docker_socket: str | None = os.getenv("SANDBOX_DOCKER_SOCKET") or None
    sandbox_image_python: str = os.getenv("SANDBOX_IMAGE_PYTHON", "aco-sandbox-python:3.12")
    sandbox_image_node: str = os.getenv("SANDBOX_IMAGE_NODE", "aco-sandbox-node:20")
    sandbox_image_go: str = os.getenv("SANDBOX_IMAGE_GO", "aco-sandbox-go:1.22")
    sandbox_image_rust: str = os.getenv("SANDBOX_IMAGE_RUST", "aco-sandbox-rust:1.79")
    sandbox_image_java: str = os.getenv("SANDBOX_IMAGE_JAVA", "aco-sandbox-java:21")
    sandbox_image_cpp: str = os.getenv("SANDBOX_IMAGE_CPP", "aco-sandbox-cpp:gcc-13")
    sandbox_pool_size: int = int(os.getenv("SANDBOX_POOL_SIZE", "4"))
    sandbox_timeout_ms: int = int(os.getenv("SANDBOX_TIMEOUT_MS", "8000"))

    # AI behavior
    ai_timeout_sec: int = int(os.getenv("AI_TIMEOUT", "20"))
    ai_retries: int = int(os.getenv("AI_RETRIES", "1"))
    allow_fake_ai: bool = os.getenv("ALLOW_FAKE_AI", "0") == "1"

    # Quotas
    free_tier_analyses_per_day: int = int(os.getenv("FREE_TIER_ANALYSES_PER_DAY", "100"))

    # Environment
    app_env: str = os.getenv("APP_ENV", "development").lower()
    backend_port: int = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8001")))


settings = Settings()


def check_required_secrets(strict: bool | None = None) -> None:
    """
    Enforce secret quality. If strict=True, raise. If strict=False, only warn.
    Auto: strict when APP_ENV=production.
    """
    is_prod = settings.app_env == "production"
    enforce = strict if strict is not None else is_prod
    problems = []
    if settings.jwt_secret_key in _FORBIDDEN_JWT_SECRETS:
        problems.append("JWT_SECRET_KEY is missing or set to a known default")
    elif len(settings.jwt_secret_key) < 32:
        problems.append("JWT_SECRET_KEY must be at least 32 characters")
    if problems:
        msg = "Refusing to start with insecure configuration: " + "; ".join(problems)
        if enforce:
            raise RuntimeError(msg)
        print(f"[SECURITY WARNING] {msg}", file=sys.stderr)
