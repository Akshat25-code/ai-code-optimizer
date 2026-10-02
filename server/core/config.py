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
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    # Verified against the live DeepSeek models endpoint (2026-10): the
    # account lists deepseek-flash + deepseek-v4-pro (no deepseek-chat).
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro")
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

    # Sandbox (single source of truth: USE_DOCKER_SANDBOX + SANDBOX_IMAGE_<LANG>
    # read directly by docker_runner; per-language image overrides live there.
    # The old sandbox_* settings fields were dead (nothing read them) and are
    # removed. Execution gating reads ENABLE_CODE_EXECUTION from the
    # environment in api/execution_routes.py.)

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


def is_production_env(env_value: str | None = None) -> bool:
    """Fail-closed environment check: anything that is not explicitly
    development/testing gets production behavior (secure cookies, Docker
    enforcement, no fake AI). Unknown/staging values fail closed."""
    env = (env_value if env_value is not None else os.getenv("APP_ENV", "development")).lower()
    return env not in ("development", "testing")


def allow_fake_ai() -> bool:
    """Fake-AI demo mode. Defaults OFF everywhere; enabled only by explicit
    ALLOW_FAKE_AI=1 (tests and local dev set it)."""
    return os.getenv("ALLOW_FAKE_AI", "0") == "1"


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
