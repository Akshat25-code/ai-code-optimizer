"""Unit tests for security helpers, AI helpers, and model validators."""
import os
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")

from fastapi import HTTPException

from security.crypto import encrypt_str, decrypt_str
from security.csrf import issue_csrf_token, verify_csrf, CSRF_COOKIE, CSRF_HEADER
from core.ai_helpers import (
    is_rate_limited_error,
    raise_ai_http_error,
    build_fake_response,
    format_analyze_response,
)
from models.analysis_models import AnalyzeReq, InspectCodeReq
from models.requests import LanguageValidationError


def test_crypto_roundtrip_and_failure():
    token = encrypt_str("oauth-secret-123")
    assert token and isinstance(token, str)
    assert decrypt_str(token) == "oauth-secret-123"
    assert decrypt_str("") is None
    assert decrypt_str("not-a-token!!") is None
    assert encrypt_str("") is not None


def _stub_request(method="POST", cookie=None, header=None):
    cookies = {CSRF_COOKIE: cookie} if cookie else {}
    headers = {CSRF_HEADER: header} if header else {}
    return SimpleNamespace(method=method, cookies=cookies, headers=headers)


def test_csrf_safe_methods_pass_without_tokens():
    verify_csrf(_stub_request(method="GET"))  # must not raise


def test_csrf_double_submit_roundtrip():
    tok = issue_csrf_token()
    assert tok
    verify_csrf(_stub_request(cookie=tok, header=tok))  # must not raise


def test_csrf_missing_and_mismatch_rejected():
    with pytest.raises(HTTPException) as e:
        verify_csrf(_stub_request())
    assert e.value.status_code == 403
    with pytest.raises(HTTPException) as e:
        verify_csrf(_stub_request(cookie="a", header="b"))
    assert e.value.status_code == 403


def test_rate_limit_detection_and_mapping():
    assert is_rate_limited_error(Exception("429 too many requests")) is True
    assert is_rate_limited_error(Exception("quota exceeded")) is True
    assert is_rate_limited_error(Exception("plain boom")) is False
    with pytest.raises(HTTPException) as e:
        raise_ai_http_error(Exception("429 slow down"), "Opt")
    assert e.value.status_code == 429
    with pytest.raises(HTTPException) as e:
        raise_ai_http_error(Exception("boom"), "Opt")
    assert e.value.status_code == 500 and "Opt" in e.value.detail


def test_fake_and_format_responses():
    fake = build_fake_response("optimization", "python", "x = 1\n" * 20, "keys-missing")
    assert fake["provider_used"] == "dev-fake-keys-missing"
    assert "..." in fake["result"]  # long input truncated with marker
    out = format_analyze_response("openai", "```python\nprint(1)\n```", 10, 5)
    assert out["optimized_code"] == "print(1)"
    assert out["tokens_in"] == 10 and out["tokens_out"] == 5
    out = format_analyze_response("openai", 12345)
    assert out["result_text"] == "12345"


def test_analysis_model_language_validation():
    assert AnalyzeReq(code="x", language="Python", task="optimization").language == "Python"
    with pytest.raises(Exception):
        AnalyzeReq(code="x", language="Klingon", task="optimization")
    assert InspectCodeReq(code="x", language="javascript").language == "JavaScript"


def test_language_validation_error_messages():
    err = LanguageValidationError("Brainfuck")
    assert "Brainfuck" in str(err) and err.language == "Brainfuck"
    err = LanguageValidationError("SQL", message="custom")
    assert str(err) == "custom"
