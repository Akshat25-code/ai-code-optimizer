"""Isolated execution worker: auth, docker gate, client mapping, dispatch."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("ALLOW_FAKE_AI", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")

from fastapi.testclient import TestClient

import worker
from services.execution import worker_client
from services.execution import sandbox_runner
from services.execution.language_runners import RunResult


def _wclient(monkeypatch, key="k-test"):
    monkeypatch.setattr(worker, "EXECUTOR_API_KEY", key)
    return TestClient(worker.app)


def test_worker_health_no_key_needed(monkeypatch):
    c = _wclient(monkeypatch)
    r = c.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_worker_execute_rejects_bad_key(monkeypatch):
    c = _wclient(monkeypatch, key="correct")
    r = c.post("/execute", json={"code": "print(1)", "language": "python"},
               headers={"X-Executor-Key": "wrong"})
    assert r.status_code == 401


def test_worker_execute_refuses_without_docker(monkeypatch):
    c = _wclient(monkeypatch)
    monkeypatch.setattr("services.execution.docker_runner.should_use_docker", lambda: False)
    # NOTE: worker imports should_use_docker lazily inside the endpoint, so
    # patch the canonical location.
    import services.execution.docker_runner as dr
    monkeypatch.setattr(dr, "should_use_docker", lambda: False)
    r = c.post("/execute", json={"code": "print(1)", "language": "python"},
               headers={"X-Executor-Key": "k-test"})
    assert r.status_code == 503


def test_client_returns_none_when_unconfigured(monkeypatch):
    monkeypatch.delenv("EXECUTOR_URL", raising=False)
    assert worker_client.execute_via_worker("print(1)", "python") is None
    assert worker_client.profile_via_worker("print(1)", "python") is None


def test_client_maps_worker_response(monkeypatch):
    monkeypatch.setenv("EXECUTOR_URL", "http://executor:8002")
    monkeypatch.setenv("EXECUTOR_API_KEY", "k")

    class Resp:
        status_code = 200

        def json(self):
            return {"ok": True, "stdout": "hi\n", "stderr": "",
                    "exec_time_ms": 12, "peak_kb": 7}

    import httpx
    monkeypatch.setattr(httpx, "post", lambda *a, **k: Resp())
    r = worker_client.execute_via_worker("print('hi')", "python")
    assert isinstance(r, RunResult)
    assert (r.ok, r.stdout, r.exec_time_ms, r.peak_kb) == (True, "hi\n", 12, 7)


def test_client_raises_on_bad_key(monkeypatch):
    monkeypatch.setenv("EXECUTOR_URL", "http://executor:8002")

    class Resp:
        status_code = 401
        text = "nope"

    import httpx
    import pytest
    monkeypatch.setattr(httpx, "post", lambda *a, **k: Resp())
    with pytest.raises(RuntimeError, match="rejected the executor key"):
        worker_client.execute_via_worker("print(1)", "python")


def test_runner_prefers_worker(monkeypatch):
    monkeypatch.setattr(worker_client, "worker_configured", lambda: True)
    sentinel = RunResult(True, "w\n", "", 3, 1)
    monkeypatch.setattr(worker_client, "execute_via_worker",
                         lambda *a, **k: sentinel)
    r = sandbox_runner.run_code("print(1)", "python")
    assert r.stdout == "w\n"


def test_runner_refuses_when_worker_down_in_production(monkeypatch):
    monkeypatch.setattr(worker_client, "worker_configured", lambda: True)

    def _boom(*a, **k):
        raise RuntimeError("worker unreachable")
    monkeypatch.setattr(worker_client, "execute_via_worker", _boom)
    monkeypatch.setenv("APP_ENV", "staging")  # non-dev/test => production behavior
    r = sandbox_runner.run_code("print(1)", "python")
    assert r.ok is False
    assert "worker" in r.stderr.lower()
    monkeypatch.setenv("APP_ENV", "testing")
