"""Streaming API routes: /analyze-code/stream (SSE)."""
from __future__ import annotations

import json
import logging
import os

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from core.rate_limit import rate_limit_ai, enforce_daily_quota
from core.ai_helpers import build_fake_response, format_analyze_response
from models.analysis_models import AnalyzeReq
from services.ai.streaming_service import stream_ai
from services.ai.cache_service import (
    make_cache_key,
    get_cached_response,
    store_cached_response,
    record_cache_hit,
)
from api.auth_routes import get_optional_user
from api.apikeys_routes import fetch_user_api_keys

logger = logging.getLogger("streaming_routes")

router = APIRouter()


def _sse(event: dict) -> str:
    """Format a dict as an SSE data frame."""
    return f"data: {json.dumps(event)}\n\n"


@router.post(
    "/analyze-code/stream",
    dependencies=[Depends(rate_limit_ai), Depends(enforce_daily_quota)],
)
async def analyze_code_stream(req: AnalyzeReq, current_user: dict | None = Depends(get_optional_user)):
    """Stream AI analysis as Server-Sent Events.

    Event types:
      start  â€” {"type": "start", "provider": str, "tokens_in": int, "cached": bool}
      chunk  â€” {"type": "chunk", "text": str}
      done   â€” {"type": "done", "tokens_out": int, "optimized_code": str, "from_cache": bool}
      error  â€” {"type": "error", "detail": str}
    """
    cache_key = make_cache_key(
        req.code, req.task, req.language, req.provider,
        req.user_instructions, req.optimization_focus,
    )

    # Fetch user's BYO API keys (if authenticated)
    user_api_keys = None
    if current_user:
        user_api_keys = await fetch_user_api_keys(current_user["id"]) or None

    # If user has their OWN key for this provider, don't count toward platform quota
    # (they pay their own bill â€” we just route the request)
    user_has_own_key = bool(user_api_keys and req.provider in user_api_keys)

    async def event_generator():
        # Cache hit: replay full text as single chunk â€” instant, zero API cost
        cached = await get_cached_response(cache_key)
        if cached is not None:
            await record_cache_hit(cache_key)
            full_text = cached.get("result_text", "") or ""
            yield _sse({
                "type": "start",
                "provider": cached.get("provider_used", "cache"),
                "tokens_in": cached.get("tokens_in", 0),
                "cached": True,
            })
            yield _sse({"type": "chunk", "text": full_text})
            yield _sse({
                "type": "done",
                "tokens_out": cached.get("tokens_out", 0),
                "optimized_code": cached.get("optimized_code", ""),
                "from_cache": True,
            })
            return

        provider_used = "unknown"
        tokens_in = 0
        try:
            async for event in stream_ai(
                req.task,
                req.language,
                req.code,
                req.provider,
                user_instructions=req.user_instructions,
                optimization_focus=req.optimization_focus,
                api_keys=user_api_keys,
            ):
                if event["type"] == "start":
                    provider_used = event["provider"]
                    tokens_in = event["tokens_in"]
                    yield _sse({**event, "cached": False})
                elif event["type"] == "chunk":
                    yield _sse(event)
                elif event["type"] == "done":
                    full_text = event["full_text"]
                    response = format_analyze_response(
                        provider_used, full_text, tokens_in, event["tokens_out"]
                    )
                    await store_cached_response(cache_key, response)
                    yield _sse({
                        "type": "done",
                        "tokens_out": event["tokens_out"],
                        "optimized_code": response.get("optimized_code", ""),
                        "from_cache": False,
                    })
                elif event["type"] == "error":
                    if os.getenv("ALLOW_FAKE_AI", "1") == "1":
                        fake = build_fake_response(
                            req.task, req.language, req.code, "stream-error"
                        )
                        yield _sse({
                            "type": "start",
                            "provider": fake["provider_used"],
                            "tokens_in": 0,
                            "cached": False,
                        })
                        yield _sse({"type": "chunk", "text": fake["result"]})
                        yield _sse({
                            "type": "done",
                            "tokens_out": 0,
                            "optimized_code": "",
                            "from_cache": False,
                        })
                    else:
                        yield _sse(event)
        except Exception as e:
            logger.exception("Stream failed")
            yield _sse({"type": "error", "detail": f"Stream failed: {e}"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )
