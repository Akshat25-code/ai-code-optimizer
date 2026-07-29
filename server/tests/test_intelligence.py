"""Tests for intelligence API endpoints."""

def test_scan_secrets_detects_patterns(client):
    code = 'API_KEY = "sk-123456789012345678901234567890"\npassword = "super-secret-value"'
    resp = client.post("/intelligence/scan-secrets", json={"code": code})
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_secrets"] is True
    assert data["count"] >= 1


def test_redact_secrets(client):
    code = 'token = "my-secret-token-value-here"'
    resp = client.post("/intelligence/redact-secrets", json={"code": code})
    assert resp.status_code == 200
    data = resp.json()
    assert "[REDACTED_SECRET]" in data["redacted_code"]


def test_scan_repo(client):
    files = [
        {"path": "main.py", "content": "def hello():\n    return 1\n"},
        {"path": "test_main.py", "content": "def test_hello():\n    assert True\n"},
    ]
    resp = client.post("/intelligence/scan-repo", json={"files": files})
    assert resp.status_code == 200
    data = resp.json()
    assert "health_score" in data
    assert data["summary"]["file_count"] >= 1


def test_provider_status(client):
    resp = client.get("/intelligence/provider-status")
    assert resp.status_code == 200
    data = resp.json()
    assert "fake_ai_mode" in data
    assert "providers" in data


def test_verify_optimization_with_provided_code(client):
    original = "print(sum([1,2,3]))"
    optimized = "print(6)"
    resp = client.post("/intelligence/verify-optimization", json={
        "code": original,
        "optimized_code": optimized,
        "language": "Python",
        "skip_ai": True,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "verified" in data
    assert "proof_panel" in data


def test_generate_report_json(client):
    resp = client.post("/intelligence/report", json={
        "title": "Test Report",
        "language": "Python",
        "task": "optimization",
        "original_code": "x = 1",
        "optimized_code": "x = 1",
        "format": "json",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Report"
    assert "limitations" in data
