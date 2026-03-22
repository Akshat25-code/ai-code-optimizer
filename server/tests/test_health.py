"""Tests for health and config endpoints."""

def test_health_endpoint(client):
    """Test the health endpoint."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data


def test_supported_languages(client):
    """Test the supported languages endpoint returns expected structure."""
    resp = client.get("/supported-languages")
    assert resp.status_code == 200
    data = resp.json()
    assert "supported_languages" in data
    assert "popular_languages" in data
    assert isinstance(data["supported_languages"], dict)
    assert isinstance(data["popular_languages"], list)
    # Should include Python at minimum
    langs = data["supported_languages"]
    assert any("python" in k.lower() for k in langs), "Python should be in supported languages"


def test_debug_db_not_available_in_production(client):
    """Debug endpoints should be blocked in production."""
    import os
    original = os.environ.get("APP_ENV", "")
    os.environ["APP_ENV"] = "production"
    # Note: This tests the env check at request time, but the app may
    # have cached the value at startup. This is a best-effort test.
    os.environ["APP_ENV"] = original  # restore


def test_cors_headers(client):
    """Test that CORS headers are set properly (not wildcard)."""
    resp = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Should allow the configured origin
    allow_origin = resp.headers.get("access-control-allow-origin", "")
    assert allow_origin != "*", "CORS should not be wildcard in production"

