"""Chaos / resource-limit tests for the execution engine.

Documents: infinite loop → timeout kills + container cleaned;
memory pressure → reported cleanly, server stays up;
fork-ish / pid pressure → pids-limit holds (Docker) or timeout (subprocess).

Docker assertions are structural (flags present) so they run in CI without
a Docker daemon; behavioral checks run against the subprocess fallback.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("USE_DOCKER_SANDBOX", "0")

from services.execution.sandbox_runner import run_code
from services.execution import docker_runner as dr


def test_infinite_loop_timeout_and_cleanup():
    start = time.perf_counter()
    r = run_code("while True:\n    pass", "python", timeout_ms=2000)
    elapsed = time.perf_counter() - start
    assert r.ok is False
    assert "imeout" in (r.stderr or "")
    # Must return near the timeout, not hang forever
    assert elapsed < 15


def test_memory_pressure_reported_not_crash():
    # 200MB allocation attempt — should fail inside sandbox, server survives
    code = "a = bytearray(200 * 1024 * 1024)\nprint('allocated', len(a))"
    r = run_code(code, "python", timeout_ms=8000)
    # Either ok with output or clean failure — but never an exception escaping
    assert isinstance(r.stdout, str) and isinstance(r.stderr, str)


def test_syntax_error_is_clean_failure():
    r = run_code("def broken(:\n  pass", "python", timeout_ms=5000)
    assert r.ok is False


def test_docker_resource_limits_documented():
    import inspect
    src = inspect.getsource(dr.run_in_docker)
    for token in ("--memory=128m", "--memory-swap=128m", "--cpus=0.5",
                  "--pids-limit=64", "--network", "none", "--read-only",
                  "no-new-privileges", "--user"):
        assert token in src, f"missing documented limit: {token}"
