"""Sandbox escape tests — must all FAIL CLOSED.

The restricted-builtins wrapper in language_runners.py is defense-in-depth
only (known-escapable via object.__subclasses__() attribute chaining).
Real isolation comes from Docker (USE_DOCKER_SANDBOX=1 mandatory in prod).

These tests verify:
1. Direct imports of dangerous modules are blocked by _safe_import.
2. open()/eval/exec-style exfiltration is unavailable in safe builtins.
3. Production refuses non-Docker execution (fail-closed gate).
4. Docker command carries hardening flags.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("ALLOW_FAKE_AI", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
# Force subprocess path for wrapper-level tests (never Docker in CI)
os.environ["USE_DOCKER_SANDBOX"] = "0"

from services.execution import language_runners as lr
from services.execution import docker_runner as dr


def _run(code: str):
    return lr.run_python(code, timeout_ms=5000)


def _assert_blocked(code: str, label: str):
    """Payload must NOT produce attacker marker in stdout, and must fail."""
    r = _run(code)
    assert "PWNED" not in (r.stdout or ""), f"{label}: escape marker leaked!"
    # Blocked payloads surface as ok=False with ImportError/NameError in stderr
    assert r.ok is False, f"{label}: expected ok=False, got ok=True stdout={r.stdout!r}"


def test_direct_import_os_blocked():
    _assert_blocked("import os\nprint('PWNED')", "import os")


def test_dunder_import_os_blocked():
    _assert_blocked("__import__('os').system('echo PWNED')", "__import__ os")


def test_import_subprocess_blocked():
    _assert_blocked("import subprocess\nprint('PWNED')", "import subprocess")


def test_import_sys_blocked():
    _assert_blocked("import sys\nprint('PWNED')", "import sys")


def test_open_builtin_unavailable():
    # open() is NOT in safe builtins -> NameError -> ok=False
    _assert_blocked("open('/etc/passwd').read()\nprint('PWNED')", "open()")


def test_eval_unavailable_or_blocked():
    _assert_blocked("eval(\"__import__('os')\")\nprint('PWNED')", "eval")


def test_socket_import_blocked():
    _assert_blocked("import socket\nprint('PWNED')", "import socket")


def test_pathlib_import_blocked():
    _assert_blocked("import pathlib\nprint('PWNED')", "pathlib")


def test_allowed_import_still_works():
    r = _run("import math\nprint(math.sqrt(16))")
    assert r.ok is True
    assert "4.0" in r.stdout


def test_production_refuses_non_docker_execution(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("USE_DOCKER_SANDBOX", "0")
    r = lr.run_python("print('hello')")
    assert r.ok is False
    assert "USE_DOCKER_SANDBOX" in r.stderr


def test_production_gate_all_languages(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("USE_DOCKER_SANDBOX", "0")
    assert lr.run_javascript("console.log(1)").ok is False
    assert lr.run_go("package main").ok is False
    assert lr.run_ruby("puts 1").ok is False


def test_docker_hardening_flags(monkeypatch):
    captured = {}

    def fake_run(cmd, timeout_s, cwd=None, stdin_text=None):
        captured["cmd"] = cmd

        class CP:
            returncode = 0
            stdout = ""
            stderr = ""
        return CP()

    monkeypatch.setattr(dr, "_safe_subprocess_run", fake_run)
    dr.run_in_docker("python:3.12-alpine", ["python", "--version"], "/tmp", 5.0)
    cmd = captured["cmd"]
    for flag in ("--read-only", "--cap-drop=ALL", "--pids-limit=64",
                 "--network", "none", "--memory=128m", "--memory-swap=128m",
                 "--security-opt", "no-new-privileges:true",
                 "--user", "nobody"):
        assert flag in cmd, f"missing docker flag: {flag}"
