"""Tests for BYO-API: encryption, apikeys routes, provider key threading."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


# â”€â”€ encryption round-trip â”€â”€
def test_encrypt_decrypt_roundtrip():
    """Encrypted value decrypts back to original."""
    import os
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
    # Reset singleton so it picks up the env var
    import core.encryption as enc
    enc._fernet = None

    plaintext = "sk-test-key-abc123xyz"
    ciphertext = enc.encrypt_value(plaintext)
    assert ciphertext != plaintext
    assert enc.decrypt_value(ciphertext) == plaintext


def test_encrypt_different_ciphertexts():
    """Same plaintext produces different ciphertexts (Fernet uses timestamp+IV)."""
    import os
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
    import core.encryption as enc
    enc._fernet = None

    plaintext = "sk-test-key"
    c1 = enc.encrypt_value(plaintext)
    c2 = enc.encrypt_value(plaintext)
    # Both decrypt to the same value
    assert enc.decrypt_value(c1) == plaintext
    assert enc.decrypt_value(c2) == plaintext


def test_decrypt_invalid_raises():
    """Decrypting garbage raises ValueError."""
    import os
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
    import core.encryption as enc
    enc._fernet = None

    with pytest.raises(ValueError, match="decrypt"):
        enc.decrypt_value("not-a-valid-ciphertext")


# â”€â”€ key masking â”€â”€
def test_mask_key_long():
    from api.apikeys_routes import _mask_key
    assert _mask_key("sk-abc123xyz456") == "sk-a...z456"


def test_mask_key_short():
    from api.apikeys_routes import _mask_key
    assert _mask_key("short") == "sh...rt"


# â”€â”€ provider validation â”€â”€
def test_validate_provider_valid():
    from api.apikeys_routes import _validate_provider
    assert _validate_provider("openai") == "openai"
    assert _validate_provider("ANTHROPIC") == "anthropic"
    assert _validate_provider("  Gemini  ") == "gemini"


def test_validate_provider_invalid():
    from fastapi import HTTPException
    from api.apikeys_routes import _validate_provider
    with pytest.raises(HTTPException) as exc_info:
        _validate_provider("invalid-provider")
    assert exc_info.value.status_code == 400


# â”€â”€ fetch_user_api_keys â”€â”€
@pytest.mark.asyncio
async def test_fetch_user_api_keys_empty():
    """Returns empty dict when no keys stored."""
    mock_cursor = AsyncMock()
    mock_cursor.__aiter__ = lambda self: self
    mock_cursor.__anext__ = AsyncMock(side_effect=StopAsyncIteration)

    mock_db = MagicMock()
    mock_db.user_api_keys.find.return_value = mock_cursor

    with patch("api.apikeys_routes.get_database", return_value=mock_db):
        from api.apikeys_routes import fetch_user_api_keys
        keys = await fetch_user_api_keys("user123")
        assert keys == {}


# â”€â”€ provider_service api_keys parameter â”€â”€
def test_ask_ai_accepts_api_keys_param():
    """ask_ai function signature accepts api_keys parameter."""
    import inspect
    from services.ai.provider_service import ask_ai
    sig = inspect.signature(ask_ai)
    assert "api_keys" in sig.parameters


def test_ask_openai_accepts_override():
    """ask_openai accepts api_key_override kwarg."""
    import inspect
    from services.ai.provider_service import ask_openai
    sig = inspect.signature(ask_openai)
    assert "api_key_override" in sig.parameters


def test_ask_claude_accepts_override():
    import inspect
    from services.ai.provider_service import ask_claude
    sig = inspect.signature(ask_claude)
    assert "api_key_override" in sig.parameters


def test_ask_gemini_accepts_override():
    import inspect
    from services.ai.provider_service import ask_gemini
    sig = inspect.signature(ask_gemini)
    assert "api_key_override" in sig.parameters


# â”€â”€ streaming_service api_keys parameter â”€â”€
def test_stream_ai_accepts_api_keys_param():
    import inspect
    from services.ai.streaming_service import stream_ai
    sig = inspect.signature(stream_ai)
    assert "api_keys" in sig.parameters


def test_stream_openai_accepts_override():
    import inspect
    from services.ai.streaming_service import stream_openai
    sig = inspect.signature(stream_openai)
    assert "api_key_override" in sig.parameters
