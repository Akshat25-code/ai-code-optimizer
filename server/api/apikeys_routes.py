"""BYO-API: CRUD endpoints for user-provided AI provider API keys."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from bson import ObjectId

from api.auth_routes import get_current_user
from core.database import get_database
from core.encryption import encrypt_value, decrypt_value

router = APIRouter(prefix="/api-keys", tags=["API Keys"])

VALID_PROVIDERS = {"openai", "anthropic", "gemini", "deepseek", "grok"}

# Prefix hints for basic validation (not exhaustive â€” just catches obvious mistakes)
_KEY_PREFIXES = {
    "openai": ("sk-",),
    "anthropic": ("sk-ant-",),
    "gemini": ("AI",),
    "deepseek": ("sk-",),
    "grok": ("xai-",),
}


class SaveKeyReq(BaseModel):
    api_key: str = Field(..., min_length=8, max_length=256)


def _mask_key(key: str) -> str:
    """Return masked version: first 4 + ... + last 4."""
    if len(key) <= 8:
        return key[:2] + "..." + key[-2:]
    return key[:4] + "..." + key[-4:]


def _validate_provider(provider: str) -> str:
    p = provider.lower().strip()
    if p not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid provider. Must be one of: {', '.join(sorted(VALID_PROVIDERS))}",
        )
    return p


@router.put("/{provider}")
async def save_api_key(
    provider: str,
    body: SaveKeyReq,
    current_user: dict = Depends(get_current_user),
):
    """Store or update an encrypted API key for a provider."""
    provider = _validate_provider(provider)
    key = body.api_key.strip()

    # Basic prefix validation
    prefixes = _KEY_PREFIXES.get(provider, ())
    if prefixes and not any(key.startswith(p) for p in prefixes):
        raise HTTPException(
            status_code=400,
            detail=f"Key doesn't look like a valid {provider} API key. "
                   f"Expected prefix: {' or '.join(prefixes)}",
        )

    db = get_database()
    now = datetime.now(timezone.utc)

    await db.user_api_keys.update_one(
        {"user_id": current_user["id"], "provider": provider},
        {
            "$set": {
                "encrypted_key": encrypt_value(key),
                "key_hint": _mask_key(key),
                "updated_at": now,
            },
            "$setOnInsert": {
                "user_id": current_user["id"],
                "provider": provider,
                "created_at": now,
            },
        },
        upsert=True,
    )
    return {"provider": provider, "key_hint": _mask_key(key), "message": "Key saved"}


@router.get("")
async def list_api_keys(current_user: dict = Depends(get_current_user)):
    """List which providers the user has keys configured for (masked)."""
    db = get_database()
    cursor = db.user_api_keys.find(
        {"user_id": current_user["id"]},
        {"provider": 1, "key_hint": 1, "updated_at": 1, "_id": 0},
    )
    keys = []
    async for doc in cursor:
        keys.append({
            "provider": doc["provider"],
            "key_hint": doc.get("key_hint", "***"),
            "updated_at": doc.get("updated_at"),
        })
    return {"keys": keys}


@router.delete("/{provider}")
async def delete_api_key(
    provider: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a stored API key."""
    provider = _validate_provider(provider)
    db = get_database()
    result = await db.user_api_keys.delete_one(
        {"user_id": current_user["id"], "provider": provider}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No key found for this provider")
    return {"message": f"{provider} key deleted"}


@router.post("/{provider}/test")
async def test_api_key(
    provider: str,
    current_user: dict = Depends(get_current_user),
):
    """Test a stored key by making a lightweight API call."""
    provider = _validate_provider(provider)
    db = get_database()
    doc = await db.user_api_keys.find_one(
        {"user_id": current_user["id"], "provider": provider}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No key stored for this provider")

    try:
        key = decrypt_value(doc["encrypted_key"])
    except ValueError:
        raise HTTPException(status_code=400, detail="Key corrupted â€” please re-enter")

    import httpx

    ok, detail = await _test_provider_key(provider, key)
    if ok:
        return {"status": "valid", "provider": provider, "detail": detail}
    raise HTTPException(status_code=400, detail=f"Key test failed: {detail}")


async def _test_provider_key(provider: str, key: str) -> tuple[bool, str]:
    """Make a cheap API call to verify the key works."""
    import httpx

    timeout = httpx.Timeout(10.0, connect=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if provider == "openai":
                r = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
                if r.status_code == 200:
                    return True, "OpenAI key valid"
                return False, f"HTTP {r.status_code}"

            elif provider == "anthropic":
                r = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-3-haiku-20240307",
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "hi"}],
                    },
                )
                if r.status_code in (200, 201):
                    return True, "Anthropic key valid"
                if r.status_code == 401:
                    return False, "Invalid API key"
                return False, f"HTTP {r.status_code}"

            elif provider == "gemini":
                r = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={key}",
                )
                if r.status_code == 200:
                    return True, "Gemini key valid"
                return False, f"HTTP {r.status_code}"

            elif provider == "deepseek":
                from core.config import settings
                r = await client.get(
                    f"{settings.deepseek_base_url}/v1/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
                if r.status_code == 200:
                    return True, "DeepSeek key valid"
                return False, f"HTTP {r.status_code}"

            elif provider == "grok":
                from core.config import settings
                r = await client.get(
                    f"{settings.grok_base_url}/v1/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
                if r.status_code == 200:
                    return True, "Grok key valid"
                return False, f"HTTP {r.status_code}"

            return False, f"Unknown provider: {provider}"
    except httpx.TimeoutException:
        return False, "Connection timed out"
    except Exception as e:
        return False, str(e)


async def fetch_user_api_keys(user_id: str) -> dict[str, str]:
    """Fetch and decrypt all API keys for a user. Returns {provider: plaintext_key}."""
    db = get_database()
    cursor = db.user_api_keys.find({"user_id": user_id})
    keys: dict[str, str] = {}
    async for doc in cursor:
        try:
            keys[doc["provider"]] = decrypt_value(doc["encrypted_key"])
        except ValueError:
            continue  # Skip corrupted keys silently
    return keys
