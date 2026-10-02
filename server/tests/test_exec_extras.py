"""Coverage for execution helpers: test_runner, profiler paths, comparator
branches, sarif export, step-executor pattern/tag branches."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")

from services.execution.test_runner import run_pytest
from services.execution.performance_profiler import profile_python, profile_javascript, profile_code
from services.execution.output_comparator import compare
from services.execution.step_executor import StepExecutor
from services.analysis.secret_scanner import scan_secrets, to_sarif


def test_run_pytest_pass_and_fail():
    # Generous timeout: spawning a fresh pytest (plugin autoload) takes
    # several seconds on Windows and must not flake under load.
    ok = run_pytest("def add(a, b):\n    return a + b\n",
                    "def test_add():\n    assert add(1, 2) == 3\n",
                    timeout_s=120)
    assert ok["passed"] is True and ok["exit_code"] == 0
    bad = run_pytest("def add(a, b):\n    return a + b\n",
                     "def test_add():\n    assert add(1, 2) == 999\n",
                     timeout_s=120)
    assert bad["passed"] is False and bad["failed_count"] >= 1


def test_run_pytest_auto_import_and_timeout():
    r = run_pytest("x = 1\n", "def test_x():\n    assert x == 1\n", timeout_s=120)
    assert r["passed"] is True  # harness prepends `from target import *`
    r = run_pytest("x = 1\n", "def test_x():\n    assert True\n", timeout_s=0.001)
    assert r["passed"] is False  # spawn alone exceeds 1ms: TimeoutExpired path


def test_profile_python_live_wrapper():
    r = profile_python("print(sum(range(100)))", timeout_ms=15000)
    assert r["ok"] is True
    assert r["peak_kb"] >= 0
    assert isinstance(r["hotspots"], list)


def test_profile_python_error_and_unsupported():
    r = profile_python("raise ValueError('boom')", timeout_ms=15000)
    assert r["ok"] is False and "ValueError" in r["error"]
    r = profile_code("print(1)", "go")
    assert r["ok"] is False and "not supported" in r["error"]


def test_profile_javascript_live_and_missing(monkeypatch):
    r = profile_javascript("console.log(1+2)", timeout_ms=15000)
    if r["ok"]:
        assert r["peak_kb"] >= 0
    else:
        assert "Node" in r["error"] or "Parse" in r["error"]
    import services.execution.performance_profiler as pp
    monkeypatch.setattr(pp, "should_use_docker", lambda: False)
    monkeypatch.setattr("shutil.which", lambda *a, **k: None)
    # force FileNotFoundError via bogus node lookup
    import shutil
    monkeypatch.setattr(shutil, "which", lambda *a, **k: None)
    orig = pp._safe_subprocess_run
    monkeypatch.setattr(pp, "_safe_subprocess_run", lambda *a, **k: (_ for _ in ()).throw(FileNotFoundError()))
    r = profile_javascript("console.log(1)", timeout_ms=5000)
    assert r["ok"] is False and "Node" in r["error"]
    monkeypatch.setattr(pp, "_safe_subprocess_run", orig)


def test_comparator_order_independent_diff_and_linecount():
    assert compare("b\na\n", "a\nb\n", mode="order_independent")["match"] is True
    r = compare("a\nb\n", "a\nc\n", mode="order_independent")
    assert r["match"] is False and "Only in" in r["diff_summary"]
    r = compare("a\nb\nc\n", "a\nb\n", mode="exact")
    assert r["match"] is False and "Line count" in r["diff_summary"]
    r = compare("1.0\n", "1.0\n2.0\n", mode="numeric_tolerance")
    assert r["match"] is False and "Number count" in r["diff_summary"]


def test_to_sarif_shape():
    report = scan_secrets('API_KEY = "sk-abcdefghijklmnopqrstuvwx"\n')
    sarif = to_sarif(report, "demo.py")
    assert sarif["version"] == "2.1.0"
    assert sarif["runs"][0]["results"]
    assert sarif["runs"][0]["tool"]["driver"]["name"] == "aco-secret-scanner"
    empty = to_sarif(scan_secrets("print(1)\n"))
    assert empty["runs"][0]["results"] == []


def test_step_detect_and_tag_branches():
    assert StepExecutor.detect_pattern([]) == "unknown"
    assert StepExecutor.detect_pattern([{"variables": {"left": 0, "mid": 1}}]) == "binary_search"
    steps = [{"variables": {"a": [3, 1]}}, {"variables": {"a": [1, 3]}}]
    StepExecutor._tag_steps([], "sorting")
    StepExecutor._tag_steps(steps, "sorting")
    assert steps[1]["operation"] == "swap"
    cmp_steps = [{"variables": {"i": 0}}, {"variables": {"i": 1}}]
    StepExecutor._tag_steps(cmp_steps, "sorting")
    assert cmp_steps[1]["operation"] == "compare"
    bs = [{"variables": {"mid": 1}}, {"variables": {"mid": 2}}]
    StepExecutor._tag_steps(bs, "binary_search")
    assert bs[1]["operation"] == "compare"
    bs2 = [{"variables": {"left": 0}}, {"variables": {"left": 1}}]
    StepExecutor._tag_steps(bs2, "binary_search")
    assert bs2[1]["operation"] == "narrow"
    g = [{"variables": {"visited": []}}, {"variables": {"visited": [1]}}]
    StepExecutor._tag_steps(g, "graph_traversal")
    assert g[1]["operation"] == "visit"
