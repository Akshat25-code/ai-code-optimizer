"""Differential verification engine: fuzzing, medians, fail-closed gates."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("ALLOW_FAKE_AI", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("USE_DOCKER_SANDBOX", "0")

from services.execution import verification_engine as ve
from services.execution.language_runners import RunResult


def test_fuzz_corpus_deterministic_and_bounded():
    a = ve.fuzz_stdin_inputs(12)
    b = ve.fuzz_stdin_inputs(12)
    assert a == b
    assert 1 <= len(a) <= 12
    assert all(len(s) <= ve.MAX_INPUT_BYTES for s in a)


def test_verify_fails_closed_without_docker(monkeypatch):
    monkeypatch.setenv("USE_DOCKER_SANDBOX", "0")
    r = ve.verify_optimization("print(1)", "print(1)", "python", fuzz_inputs=0)
    assert r["verified"] is False
    assert "Docker" in r["verify_reason"]
    assert r["proof_badges"][1]["label"] == "Output-matched on 0 inputs"
    assert r["proof_panel"]["output_match"] is False


def test_verify_fails_closed_without_optimized(monkeypatch):
    monkeypatch.setattr(ve, "should_use_docker", lambda: True)
    r = ve.verify_optimization("print(1)", "", "python", fuzz_inputs=0)
    assert r["verified"] is False
    assert "No optimized code" in r["verify_reason"]


def _fake_run_factory(outputs, times=None, peaks=None):
    """Mock run_code: outputs maps stdin->stdout; times/peak cycle per call."""
    calls = {"n": 0}

    def _fake(code, language, stdin_text="", timeout_ms=5000, raw=False):
        i = calls["n"]
        calls["n"] += 1
        out = outputs.get(stdin_text, outputs.get("__default__", ""))
        t = (times or [5])[i % len(times or [5])]
        p = (peaks or [10])[i % len(peaks or [10])]
        return RunResult(True, out, "", t, peak_kb=None if raw else p)
    return _fake


def test_verify_matched_nonempty_verifies(monkeypatch):
    monkeypatch.setattr(ve, "should_use_docker", lambda: True)
    outputs = {"__default__": "6\n"}
    monkeypatch.setattr(ve, "run_code", _fake_run_factory(outputs, times=[8, 6, 7, 6, 7], peaks=[100, 90]))
    r = ve.verify_optimization(
        "print(sum([1,2,3]))", "print(6)", "python",
        test_inputs=["", "x\n"], fuzz_inputs=0, repeats=3, min_nonempty=1,
    )
    assert r["verified"] is True
    assert r["differential"]["inputs_total"] == 2  # "" probe + "x\n"
    assert r["differential"]["inputs_matched"] == 2
    assert r["differential"]["inputs_nonempty"] == 2
    assert r["proof_badges"][1]["label"] == "Output-matched on 2/2 inputs"
    # Timing calls are #4..#9 -> orig times [7,6,6] -> median 6; memory from
    # separate wrapper (non-raw) runs whose wall times are discarded.
    assert r["proof_panel"]["original_runtime_ms"] == 6
    assert r["proof_panel"]["original_peak_kb"] == 100
    assert r["proof_panel"]["optimized_peak_kb"] == 90


def test_verify_mismatch_fails_with_counts(monkeypatch):
    monkeypatch.setattr(ve, "should_use_docker", lambda: True)

    def _fake(code, language, stdin_text="", timeout_ms=5000, raw=False):
        if "orig" in code:
            return RunResult(True, "A\n" if stdin_text != "bad\n" else "A\n", "", 5, 10)
        return RunResult(True, "A\n" if stdin_text != "bad\n" else "B\n", "", 5, 10)

    monkeypatch.setattr(ve, "run_code", _fake)
    r = ve.verify_optimization(
        "orig", "opt", "python", test_inputs=["ok\n", "bad\n"],
        fuzz_inputs=0, repeats=1, min_nonempty=1,
    )
    assert r["verified"] is False
    assert r["differential"]["inputs_total"] == 3  # "" probe + ok + bad
    assert r["differential"]["inputs_matched"] == 2
    assert "different output" in r["verify_reason"]


def test_verify_all_empty_is_inconclusive_not_verified(monkeypatch):
    monkeypatch.setattr(ve, "should_use_docker", lambda: True)
    monkeypatch.setattr(ve, "run_code", _fake_run_factory({"__default__": ""}))
    r = ve.verify_optimization(
        "x = 1", "x = 1", "python", test_inputs=[""], fuzz_inputs=0,
        repeats=1, min_nonempty=2,
    )
    assert r["verified"] is False
    assert "non-empty" in r["verify_reason"]
    # Empty==empty still "matches" but proves nothing
    assert r["differential"]["inputs_nonempty"] == 0


def test_raw_python_refuses_without_docker(monkeypatch):
    from services.execution import language_runners as lr
    monkeypatch.setenv("USE_DOCKER_SANDBOX", "0")
    r = lr.run_python("print(1)", raw=True)
    assert r.ok is False
    assert "Docker" in r.stderr
