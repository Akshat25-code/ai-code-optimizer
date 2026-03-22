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
def client():
    """Create a FastAPI TestClient with MongoDB skipped."""
    from main import app
    with TestClient(app) as c:
        yield c


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
