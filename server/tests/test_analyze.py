"""Tests for the /analyze-code endpoint with fake AI mode."""
import pytest


def test_analyze_code_optimization(client, sample_python_code):
    """Test analyze-code with optimization task returns a fake response."""
    resp = client.post("/analyze-code", json={
        "code": sample_python_code,
        "language": "Python",
        "task": "optimization",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "result" in data or "optimized_code" in data
    # With ALLOW_FAKE_AI=1, we get a dev-fake response
    provider = data.get("provider_used", "")
    assert "dev-fake" in provider or len(data.get("result", "")) > 0


def test_analyze_code_bug_detection(client, sample_python_code):
    """Test analyze-code with bug_detection task."""
    resp = client.post("/analyze-code", json={
        "code": sample_python_code,
        "language": "Python",
        "task": "bug_detection",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "result" in data


def test_analyze_code_explanation(client, sample_js_code):
    """Test analyze-code with explanation task."""
    resp = client.post("/analyze-code", json={
        "code": sample_js_code,
        "language": "JavaScript",
        "task": "explanation",
    })
    assert resp.status_code == 200


def test_analyze_code_empty_code_returns_error(client):
    """Test that empty code returns appropriate error."""
    resp = client.post("/analyze-code", json={
        "code": "",
        "language": "Python",
        "task": "optimization",
    })
    # Should still return 200 with fake AI or 422 validation
    assert resp.status_code in (200, 400, 422)


def test_analyze_code_with_provider(client, sample_python_code):
    """Test specifying a specific provider."""
    resp = client.post("/analyze-code", json={
        "code": sample_python_code,
        "language": "Python",
        "task": "optimization",
        "provider": "openai",
    })
    assert resp.status_code == 200


def test_analyze_code_with_focus(client, sample_python_code):
    """Test optimization with focus areas."""
    resp = client.post("/analyze-code", json={
        "code": sample_python_code,
        "language": "Python",
        "task": "optimization",
        "user_instructions": "Focus on recursion elimination",
        "optimization_focus": ["time_complexity", "readability"],
    })
    assert resp.status_code == 200


def test_analyze_code_max_length(client):
    """Test that code exceeding MAX_CODE_LENGTH is rejected."""
    import os
    max_len = int(os.environ.get("MAX_CODE_LENGTH", "50000"))
    huge_code = "x = 1\n" * (max_len // 5)  # Each line is 6 chars
    if len(huge_code) <= max_len:
        # won't exceed, skip
        return
    resp = client.post("/analyze-code", json={
        "code": huge_code,
        "language": "Python",
        "task": "optimization",
    })
    assert resp.status_code == 422  # Pydantic validation error


def test_compare_models(client, sample_python_code):
    """Test the compare models endpoint."""
    resp = client.post("/analyze-code/compare", json={
        "code": sample_python_code,
        "language": "Python",
        "task": "optimization",
        "providers": ["openai", "claude"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
