"""
Shared test fixtures for the AI Code Optimizer backend.
Uses ALLOW_FAKE_AI=1 and SKIP_MONGO_INIT=1 for isolated testing.
"""
import os
import sys

# Ensure the server directory is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set environment variables BEFORE importing the app
os.environ["SKIP_MONGO_INIT"] = "1"
os.environ["ALLOW_FAKE_AI"] = "1"
os.environ["APP_ENV"] = "testing"
os.environ["CORS_ORIGINS"] = "http://localhost:5173,http://127.0.0.1:5173"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def _session_client():
    """Single TestClient for the whole session (app lifespan runs once)."""
    from main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture
def client(_session_client):
    """Plain client (no auth override). Function-scoped facade."""
    yield _session_client


@pytest.fixture
def authed_client(_session_client):
    """Client acting as a signed-in user. The auth override is installed
    per-test and restored afterwards, so anonymous/auth-failure tests in
    the same process are unaffected. (A session-scoped override previously
    leaked app-globally for the rest of the session, turning later 401s
    into 200s depending on test order.)"""
    from main import app
    from api.auth_routes import get_current_user
    prev = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: {
        "id": "test-user", "email": "test@example.com", "name": "Test",
    }
    try:
        yield _session_client
    finally:
        if prev is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = prev


@pytest.fixture(autouse=True)
def _reset_rate_limit_state():
    """Hermetic suites: the IP sliding-window and daily-quota stores are
    process-global, so without a reset, fast runs exhaust the AI budget
    before late tests execute (429 masking the expected 401/200).
    No test asserts on accumulated limiter state (verified)."""
    import core.rate_limit as rl
    rl._requests.clear()
    rl._daily_usage.clear()
    yield
    rl._requests.clear()
    rl._daily_usage.clear()


@pytest.fixture
def sample_python_code():
    """Sample Python code for testing."""
    return """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(10))
""".strip()


@pytest.fixture
def sample_js_code():
    """Sample JavaScript code for testing."""
    return """
function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}
""".strip()
