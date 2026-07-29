"""
AI response caching layer â€” MongoDB-backed with in-memory hot cache.

Cache key: sha256(code + task + language + provider + instructions + focus).
Saves API cost and gives instant responses for repeated requests.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

logger = logging.getLogger("ai_cache")

CACHE_TTL_DAYS = int(os.getenv("AI_CACHE_TTL_DAYS", "7"))
CACHE_ENABLED = os.getenv("AI_CACHE_ENABLED", "1") == "1"

# Hot in-memory cache for the current process (LRU-ish, capped)
_memory_cache: dict[str, dict] = {}
_MEMORY_CACHE_MAX = 200


def make_cache_key(
    code: str,
    task: str,
    language: str,
    provider: str | None = None,
    user_instructions: str | None = None,
    optimization_focus: list[str] | None = None,
) -> str:
    """Deterministic cache key from all request parameters that affect output."""
    raw = json.dumps({
        "code": code,
        "task": (task or "").strip().lower(),
        "language": (language or "").strip().lower(),
        "provider": (provider or "auto").strip().lower(),
        "instructions": (user_instructions or "").strip(),
        "focus": sorted(optimization_focus or []),
    }, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def get_cached_response(cache_key: str) -> Optional[dict[str, Any]]:
    """Look up a cached AI response. Returns None on miss."""
    if not CACHE_ENABLED:
        return None

    # 1. Hot memory cache
    entry = _memory_cache.get(cache_key)
    if entry:
        if entry["expires_at"] > datetime.now(timezone.utc):
            return entry["response"]
        del _memory_cache[cache_key]

    # 2. MongoDB cache
    try:
        from core.database import get_database
        db = get_database()
        doc = await db.ai_response_cache.find_one({"cache_key": cache_key})
        if doc and doc.get("expires_at"):
            expires = doc["expires_at"]
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires > datetime.now(timezone.utc):
                response = doc.get("response", {})
                # Promote to memory cache
                _set_memory(cache_key, response, expires)
                return response
    except Exception as e:
        logger.debug(f"Cache lookup failed (non-critical): {e}")

    return None


async def store_cached_response(cache_key: str, response: dict[str, Any]) -> None:
    """Store an AI response in the cache."""
    if not CACHE_ENABLED:
        return

    expires_at = datetime.now(timezone.utc) + timedelta(days=CACHE_TTL_DAYS)
    _set_memory(cache_key, response, expires_at)

    try:
        from core.database import get_database
        db = get_database()
        await db.ai_response_cache.update_one(
            {"cache_key": cache_key},
            {
                "$set": {
                    "cache_key": cache_key,
                    "response": response,
                    "created_at": datetime.now(timezone.utc),
                    "expires_at": expires_at,
                },
                "$inc": {"hit_count": 0},
            },
            upsert=True,
        )
    except Exception as e:
        logger.debug(f"Cache store failed (non-critical): {e}")


async def record_cache_hit(cache_key: str) -> None:
    """Increment hit counter for analytics ('You saved $X this month')."""
    try:
        from core.database import get_database
        db = get_database()
        await db.ai_response_cache.update_one(
            {"cache_key": cache_key},
            {"$inc": {"hit_count": 1}},
        )
    except Exception:
        pass


async def get_cache_stats(user_id: str | None = None) -> dict[str, Any]:
    """Aggregate cache stats: total entries, total hits, estimated savings."""
    try:
        from core.database import get_database
        db = get_database()
        pipeline = [
            {"$group": {
                "_id": None,
                "entries": {"$sum": 1},
                "total_hits": {"$sum": "$hit_count"},
            }},
        ]
        result = await db.ai_response_cache.aggregate(pipeline).to_list(1)
        if result:
            stats = result[0]
            # Rough estimate: each cache hit saves ~$0.01 of API cost
            return {
                "entries": stats.get("entries", 0),
                "total_hits": stats.get("total_hits", 0),
                "estimated_savings_usd": round(stats.get("total_hits", 0) * 0.01, 2),
            }
    except Exception:
        pass
    return {"entries": 0, "total_hits": 0, "estimated_savings_usd": 0}


def _set_memory(cache_key: str, response: dict, expires_at: datetime) -> None:
    if len(_memory_cache) >= _MEMORY_CACHE_MAX:
        # Evict oldest entry
        oldest = min(_memory_cache, key=lambda k: _memory_cache[k]["expires_at"])
        del _memory_cache[oldest]
    _memory_cache[cache_key] = {"response": response, "expires_at": expires_at}
