"""Secrets-at-rest: pasted keys must not land in MongoDB in plaintext."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("ALLOW_FAKE_AI", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")

from unittest.mock import patch

from services.analysis.secret_scanner import (
    SECRET_ONLY_KINDS,
    redact_for_storage,
    redact_secrets,
)


def test_code_patterns_not_corrupted_by_storage_redaction():
    code = "import subprocess\nsubprocess.call(cmd, shell=True)\nx = eval('1')\n"
    redacted, n = redact_for_storage(code)
    assert n == 0
    assert "shell=True" in redacted and "eval(" in redacted


def test_true_secrets_redacted_for_storage():
    code = 'API_KEY = "sk-abcdefghijklmnopqrstuvwx"\nprint("hi")\n'
    redacted, n = redact_for_storage(code)
    assert n >= 1
    assert "sk-abcdefghijklmnopqrstuvwx" not in redacted
    assert "[REDACTED_SECRET]" in redacted


def test_redaction_opt_out(monkeypatch):
    monkeypatch.setenv("REDACT_SECRETS_AT_REST", "0")
    code = 'API_KEY = "sk-abcdefghijklmnopqrstuvwx"\n'
    assert redact_for_storage(code) == (code, 0)


def test_full_redact_still_covers_code_patterns():
    # Default redact_secrets (AI-prompt path) keeps old behavior incl. patterns.
    code = "x = eval('1')\n"
    redacted, n = redact_secrets(code)
    assert n >= 1 and "eval(" not in redacted


def test_session_create_redacts_stored_code():
    from fastapi.testclient import TestClient
    from main import app
    from api.auth_routes import get_current_user

    captured = {}

    class FakeColl:
        async def insert_one(self, doc):
            captured.update(doc)

            class R:
                inserted_id = "abc123"
            return R()

    class FakeDB:
        optimize_sessions = FakeColl()

    app.dependency_overrides[get_current_user] = lambda: {"id": "u1"}
    try:
        with patch("api.session_routes.get_database", return_value=FakeDB()):
            c = TestClient(app)
            r = c.post("/opt-sessions/", json={
                "code": 'KEY = "sk-abcdefghijklmnopqrstuvwx"\nprint(1)\n',
                "language": "python",
            })
        assert r.status_code == 201, r.text
        assert "sk-abcdefghijklmnopqrstuvwx" not in captured["code"]
        assert captured["secrets_redacted"] >= 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)
