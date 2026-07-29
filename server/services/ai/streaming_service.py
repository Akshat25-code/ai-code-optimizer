"""
Streaming AI provider support â€” async generators yielding text chunks.

Supports OpenAI, Anthropic (Claude), and Gemini streaming APIs.
Each function yields raw text deltas as they arrive from the provider.
"""
from __future__ import annotations

import json
from typing import AsyncGenerator

import httpx

from core.config import settings
from services.ai.provider_service import (
    ProviderConfigError,
    build_prompt,
    count_tokens,
    pick_provider,
)

STREAM_TIMEOUT = httpx.Timeout(90.0, connect=10.0)


# ---------- OpenAI streaming ----------
async def stream_openai(prompt: str, *, api_key_override: str | None = None) -> AsyncGenerator[str, None]:
    key = api_key_override or settings.openai_api_key
    if not key:
        raise ProviderConfigError("OpenAI key missing")
    headers = {"Authorization": f"Bearer {key}"}
    payload = {
        "model": settings.openai_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=STREAM_TIMEOUT) as client:
        async with client.stream(
            "POST", "https://api.openai.com/v1/chat/completions",
            headers=headers, json=payload,
        ) as response:
            if response.status_code >= 400:
                body = await response.aread()
                raise ProviderConfigError(f"OpenAI stream error {response.status_code}: {body[:200]}")
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue


# ---------- Anthropic (Claude) streaming ----------
async def stream_claude(prompt: str, *, api_key_override: str | None = None) -> AsyncGenerator[str, None]:
    key = api_key_override or settings.anthropic_api_key
    if not key:
        raise ProviderConfigError("Anthropic key missing")
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": settings.anthropic_model,
        "max_tokens": 2048,
        "temperature": 0.2,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
    }
    async with httpx.AsyncClient(timeout=STREAM_TIMEOUT) as client:
        async with client.stream(
            "POST", "https://api.anthropic.com/v1/messages",
            headers=headers, json=payload,
        ) as response:
            if response.status_code >= 400:
                body = await response.aread()
                raise ProviderConfigError(f"Anthropic stream error {response.status_code}: {body[:200]}")
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                try:
                    data = json.loads(line[6:])
                    if data.get("type") == "content_block_delta":
                        delta = data.get("delta", {}).get("text", "")
                        if delta:
                            yield delta
                    elif data.get("type") == "message_stop":
                        break
                except json.JSONDecodeError:
                    continue


# ---------- Google Gemini streaming ----------
async def stream_gemini(prompt: str, *, api_key_override: str | None = None) -> AsyncGenerator[str, None]:
    key = api_key_override or settings.gemini_api_key
    if not key:
        raise ProviderConfigError("Gemini key missing")
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2},
    }
    model = settings.gemini_model
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
        f":streamGenerateContent?alt=sse&key={key}"
    )
    async with httpx.AsyncClient(timeout=STREAM_TIMEOUT) as client:
        async with client.stream("POST", url, json=payload) as response:
            if response.status_code >= 400:
                body = await response.aread()
                raise ProviderConfigError(f"Gemini stream error {response.status_code}: {body[:200]}")
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                try:
                    data = json.loads(line[6:])
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        for part in parts:
                            text = part.get("text", "")
                            if text:
                                yield text
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue


_STREAMERS = {
    "openai": stream_openai,
    "claude": stream_claude,
    "gemini": stream_gemini,
}


async def stream_ai(
    task: str,
    language: str,
    code: str,
    provider: str | None,
    user_instructions: str | None = None,
    optimization_focus: list[str] | None = None,
    api_keys: dict[str, str] | None = None,
) -> AsyncGenerator[dict, None]:
    """Stream AI response as events.

    Yields dicts:
      {"type": "start", "provider": str, "tokens_in": int}
      {"type": "chunk", "text": str}
      {"type": "done", "tokens_out": int, "full_text": str}
      {"type": "error", "detail": str}
    """
    prompt = build_prompt(
        task, language, code,
        user_instructions=user_instructions,
        optimization_focus=optimization_focus,
    )
    prompt_tokens = count_tokens(prompt)

    provider_aliases = {"anthropic": "claude", "xai": "grok"}
    explicit = bool(provider and provider != "auto")
    if explicit:
        selected = provider_aliases.get((provider or "").lower().strip(), (provider or "").lower().strip())
    else:
        selected = pick_provider(task, code, language)

    # Streaming only supported for these three; fall back to claude
    if selected not in _STREAMERS:
        selected = "claude" if settings.anthropic_api_key else "openai"

    streamer = _STREAMERS.get(selected)
    if streamer is None:
        yield {"type": "error", "detail": f"No streaming support for provider {selected}"}
        return

    # Resolve user API key override for the selected provider
    _key_map = {"openai": "openai", "claude": "anthropic", "gemini": "gemini"}

    def _get_override(prov: str) -> str | None:
        if not api_keys:
            return None
        return api_keys.get(_key_map.get(prov, prov))

    yield {"type": "start", "provider": selected, "tokens_in": prompt_tokens}

    collected: list[str] = []
    try:
        async for chunk in streamer(prompt, api_key_override=_get_override(selected)):
            collected.append(chunk)
            yield {"type": "chunk", "text": chunk}
    except ProviderConfigError as e:
        # Try fallback providers on config errors (missing key, bad model)
        fallbacks = [p for p in ("claude", "openai", "gemini") if p != selected]
        for fb in fallbacks:
            fb_streamer = _STREAMERS[fb]
            try:
                collected = []
                yield {"type": "start", "provider": f"{fb}(fallback)", "tokens_in": prompt_tokens}
                async for chunk in fb_streamer(prompt, api_key_override=_get_override(fb)):
                    collected.append(chunk)
                    yield {"type": "chunk", "text": chunk}
                break
            except ProviderConfigError:
                continue
        else:
            yield {"type": "error", "detail": str(e)}
            return
    except Exception as e:
        yield {"type": "error", "detail": f"Stream failed: {e}"}
        return

    full_text = "".join(collected)
    yield {
        "type": "done",
        "tokens_out": count_tokens(full_text),
        "full_text": full_text,
    }
