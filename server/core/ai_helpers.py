"""Shared helper functions for AI error handling and response formatting."""
from __future__ import annotations

from fastapi import HTTPException

from utils.code_utils import extract_code_block


def is_rate_limited_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return (
        "429" in msg
        or "too many requests" in msg
        or "rate limit" in msg
        or "rate-limited" in msg
        or "quota" in msg
    )


def raise_ai_http_error(exc: Exception, prefix: str = "AI error"):
    if is_rate_limited_error(exc):
        raise HTTPException(
            status_code=429,
            detail="AI provider is currently overloaded or rate-limited. Please try again later.",
        )
    raise HTTPException(status_code=500, detail=f"{prefix}: {exc}")


def build_fake_response(task: str, language: str, code: str, reason: str) -> dict:
    """Build a consistent dev-fake AI response when real providers are unavailable."""
    preview_lines = code.strip().splitlines()
    preview = "\n".join(preview_lines[:10]) + ("\n..." if len(preview_lines) > 10 else "")
    return {
        "provider_used": f"dev-fake-{reason}",
        "result": (
            f"[DEV FAKE] Task: {task} for {language}\n\n"
            f"Input preview:\n{preview}\n\n"
            f"This is a development stub ({reason})."
        ),
    }


def format_analyze_response(
    provider_used: str, result: str, tokens_in: int = 0, tokens_out: int = 0
) -> dict:
    result_text = result if isinstance(result, str) else str(result)
    optimized_code = extract_code_block(result_text)
    analysis_obj = {
        "summary": result_text,
        "raw": result_text,
    }
    structured = {
        "analysis": result_text,
        "optimized_code": optimized_code,
        "provider_metadata": {
            "provider_used": provider_used,
            "tokens_in": int(tokens_in or 0),
            "tokens_out": int(tokens_out or 0),
        },
    }
    return {
        "provider_used": provider_used,
        "analysis": analysis_obj,
        "provider_metadata": structured["provider_metadata"],
        "result": structured,
        "result_text": result_text,
        "optimized_code": optimized_code or result_text,
        "tokens_in": int(tokens_in or 0),
        "tokens_out": int(tokens_out or 0),
    }
