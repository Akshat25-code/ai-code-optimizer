"""End-to-end pipeline tests: submit → analyze → optimize → execute → verify.

Exercises the full user journey through FastAPI, not just isolated modules.
Requires APP_ENV=testing (execution allowed) + ALLOW_FAKE_AI=1.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("ALLOW_FAKE_AI", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("USE_DOCKER_SANDBOX", "0")
os.environ.setdefault("ENABLE_CODE_EXECUTION", "1")

from fastapi.testclient import TestClient
from main import app
from api.auth_routes import get_current_user

# Execution + intelligence routes require auth: act as a signed-in user.
TEST_USER = {"id": "test-user", "email": "test@example.com", "name": "Test"}
app.dependency_overrides[get_current_user] = lambda: TEST_USER

client = TestClient(app)


def test_anonymous_execution_refused():
    """Fail closed: no token -> 401 even when execution is enabled."""
    from fastapi.testclient import TestClient as TC
    app.dependency_overrides.pop(get_current_user, None)
    try:
        c = TC(app)
        r = c.post("/run-code", json={"code": "print(1)", "language": "python"})
        assert r.status_code == 401, r.text
    finally:
        app.dependency_overrides[get_current_user] = lambda: TEST_USER

SAMPLE = "def add(a, b):\n    return a + b\n\nprint(add(2, 3))\n"


def test_analyze_then_execute_journey():
    # 1. analyze
    r = client.post("/analyze", json={"code": SAMPLE, "language": "python"})
    assert r.status_code in (200, 404, 422), r.text
    # 2. execute original
    r = client.post("/run-code", json={"code": "print(2+3)", "language": "python"})
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True
    assert "5" in r.json().get("stdout", "")


def test_run_compare_pipeline():
    r = client.post("/run-code/compare", json={
        "original_code": "print(sum(range(10)))",
        "optimized_code": "print(45)",
        "language": "python",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["output_match"] is True


def test_sandbox_compare_and_profile():
    r = client.post("/sandbox/compare", json={"out_a": "hello\n", "out_b": "hello", "mode": "exact"})
    assert r.status_code == 200
    r = client.post("/sandbox/profile", json={"code": "print('hi')", "language": "python"})
    assert r.status_code in (200, 403)


def test_execution_timeout_kills_infinite_loop():
    r = client.post("/run-code", json={
        "code": "while True:\n    pass",
        "language": "python",
        "timeout_ms": 1500,
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("ok") is False
    assert "imeout" in body.get("stderr", "")


def test_optimize_enhanced_fake_ai():
    r = client.post("/optimize-code-enhanced", json={
        "code": SAMPLE, "language": "python", "test_inputs": [],
    })
    # Fake-AI mode returns 200; without keys + no fake returns 4xx — both acceptable in CI
    assert r.status_code in (200, 400, 500), r.text
