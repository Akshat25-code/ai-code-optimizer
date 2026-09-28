"""HTTPS enforcement: http->301 redirect + HSTS header in production only."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("ALLOW_FAKE_AI", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")

from fastapi.testclient import TestClient
from main import app


def test_http_redirects_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    with TestClient(app, base_url="http://testserver") as c:
        r = c.get("/health", follow_redirects=False)
    assert r.status_code == 301
    assert r.headers["location"].startswith("https://")


def test_https_gets_hsts_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    with TestClient(app, base_url="https://testserver") as c:
        r = c.get("/health")
    assert r.status_code == 200
    hsts = r.headers.get("strict-transport-security", "")
    assert "max-age=31536000" in hsts and "includeSubDomains" in hsts


def test_no_redirect_outside_production():
    with TestClient(app, base_url="http://testserver") as c:
        r = c.get("/health")
    assert r.status_code == 200
    assert "strict-transport-security" not in r.headers


def test_forwarded_proto_respected(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    with TestClient(app, base_url="http://testserver") as c:
        r = c.get("/health", headers={"x-forwarded-proto": "https"})
    assert r.status_code == 200
