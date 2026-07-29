import time
from datetime import datetime, timezone
from fastapi import Request, HTTPException
from collections import defaultdict
import os

# Limit: 20 requests per minute by default for AI endpoints
AI_RATE_LIMIT = int(os.getenv("AI_RATE_LIMIT", "20"))
AI_RATE_WINDOW = int(os.getenv("AI_RATE_WINDOW", "60"))

REDIS_URL = os.getenv("REDIS_URL", "")

# Redis client initialization (lazy / optional)
_redis_client = None
_redis_failed = False

def _get_redis():
    global _redis_client, _redis_failed
    if _redis_client is not None or _redis_failed or not REDIS_URL:
        return _redis_client
    try:
        import redis
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        _redis_client.ping()
    except Exception as e:
        print(f"[RATE_LIMIT] Redis connection failed ({e}). Falling back to in-memory store.")
        _redis_failed = True
        _redis_client = None
    return _redis_client


# Simple in-memory fallback dict: IP -> [timestamps]
_requests = defaultdict(list)

def rate_limit_ai(request: Request):
    """
    Dependency to rate limit expensive AI API calls by IP.
    Uses Redis if available, else falls back to in-memory sliding window.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    r = _get_redis()
    if r:
        try:
            key = f"ratelimit:ai:{client_ip}"
            current = r.get(key)
            if current and int(current) >= AI_RATE_LIMIT:
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests. Please try again later."
                )
            pipe = r.pipeline()
            pipe.incr(key)
            if not current:
                pipe.expire(key, AI_RATE_WINDOW)
            pipe.execute()
            return
        except HTTPException:
            raise
        except Exception:
            pass  # Fall back to in-memory on redis failure

    # In-memory sliding window fallback
    _requests[client_ip] = [t for t in _requests[client_ip] if now - t < AI_RATE_WINDOW]

    if len(_requests[client_ip]) >= AI_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )

    _requests[client_ip].append(now)


# --- Daily usage quota enforcement ---
_daily_usage: dict[str, dict] = {}  # user_id -> {"date": "YYYY-MM-DD", "count": int}

FREE_TIER_LIMIT = int(os.getenv("FREE_TIER_ANALYSES_PER_DAY", "100"))


async def enforce_daily_quota(request: Request):
    """FastAPI dependency: block users who exceed their daily analysis quota.

    Checks the Authorization header for a JWT or the httpOnly access cookie.
    Authenticated free-tier users are capped at FREE_TIER_ANALYSES_PER_DAY.
    """
    user_id = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            from core.security import JWTManager
            payload = JWTManager.verify_token(token, "access")
            user_id = payload.get("sub") or payload.get("user_id")
        except Exception:
            pass

    if not user_id:
        token = request.cookies.get("aco_access")
        if token:
            try:
                from core.security import JWTManager
                payload = JWTManager.verify_token(token, "access")
                user_id = payload.get("sub") or payload.get("user_id")
            except Exception:
                pass

    if not user_id:
        return  # anonymous â€” handled by IP rate limiter only

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = _daily_usage.get(user_id)

    if entry is None or entry["date"] != today:
        try:
            from core.database import get_database
            db = get_database()
            count_doc = await db.daily_usage.find_one(
                {"user_id": user_id, "date": today}
            )
            current_count = count_doc["count"] if count_doc else 0
        except Exception:
            current_count = 0
        _daily_usage[user_id] = {"date": today, "count": current_count}
        entry = _daily_usage[user_id]

    if entry["count"] >= FREE_TIER_LIMIT:
        reset_msg = f"Daily limit of {FREE_TIER_LIMIT} analyses reached. Resets at midnight UTC."
        raise HTTPException(status_code=429, detail=reset_msg)

    # Increment
    entry["count"] += 1

    # Persist to MongoDB (fire-and-forget)
    try:
        from core.database import get_database
        db = get_database()
        await db.daily_usage.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {"user_id": user_id, "date": today}, "$inc": {"count": 1}},
            upsert=True,
        )
    except Exception:
        pass
