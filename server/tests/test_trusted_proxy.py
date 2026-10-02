"""Trusted-proxy client IP resolution: X-Forwarded-For honored only via proxies."""
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("ALLOW_FAKE_AI", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")

from core.rate_limit import get_client_ip


def _req(peer, xff="", trusted="127.0.0.1,::1"):
    os.environ["TRUSTED_PROXIES"] = trusted
    return SimpleNamespace(
        client=SimpleNamespace(host=peer),
        headers={"x-forwarded-for": xff} if xff else {},
    )


def test_direct_peer_used_without_forwarding():
    assert get_client_ip(_req("9.9.9.9")) == "9.9.9.9"


def test_forwarded_honored_via_trusted_proxy():
    r = _req("127.0.0.1", "203.0.113.7, 127.0.0.1")
    assert get_client_ip(r) == "203.0.113.7"


def test_forwarded_ignored_from_untrusted_peer():
    # Attacker-controlled XFF must not spoof identity past an untrusted hop.
    r = _req("9.9.9.9", "203.0.113.7")
    assert get_client_ip(r) == "9.9.9.9"


def test_chain_walks_past_trusted_proxies():
    r = _req("127.0.0.1", "198.51.100.9, 10.0.0.5, 127.0.0.1",
             trusted="127.0.0.1,::1,10.0.0.5")
    assert get_client_ip(r) == "198.51.100.9"


def test_anonymous_intelligence_refused(client):
    """Fail closed on intelligence routes too (no token -> 401)."""
    r = client.post("/intelligence/scan-secrets", json={"code": "x = 1"})
    assert r.status_code == 401, r.text
