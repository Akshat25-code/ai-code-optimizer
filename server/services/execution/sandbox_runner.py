"""Sandbox code runner â€” thin dispatcher to per-language runners.

All heavy logic lives in:
  - language_runners.py  (per-language run functions + RunResult)
  - docker_runner.py     (Docker container execution + resource limits)
  - trace_runner.py      (sys.settrace step-by-step tracer)
"""
from __future__ import annotations

# Re-export RunResult and to_dict so existing imports keep working
from services.execution.language_runners import (
    RunResult,
    to_dict,
    run_python,
    run_javascript,
    run_typescript,
    run_java,
    run_cpp,
    run_go,
    run_ruby,
    run_php,
)
from services.execution.trace_runner import trace_python


def run_code(code: str, language: str, stdin_text: str = "", timeout_ms: int = 5000,
             raw: bool = False) -> RunResult:
    """Generic code runner that dispatches to language-specific runners.

    raw=True requests uninstrumented execution (no restricted-builtins
    wrapper, no tracemalloc). Only Python has an instrumented path, so raw
    only changes Python; without Docker it fails closed.

    When EXECUTOR_URL is set, code runs in the isolated worker container
    instead of this process. If the worker is down, production refuses;
    dev/test fall back to local dispatch.
    """
    from services.execution import worker_client
    from services.execution.docker_runner import is_production

    if worker_client.worker_configured():
        try:
            remote = worker_client.execute_via_worker(
                code, language, stdin_text, timeout_ms, raw=raw)
            if remote is not None:
                return remote
        except RuntimeError as e:
            if is_production():
                return RunResult(False, "", f"Refused: {e}", 0)
            # Dev/test convenience fallback to local dispatch below.
    lang = language.lower()

    if lang in ("python", "py"):
        return run_python(code, stdin_text, timeout_ms, raw=raw)
    elif lang in ("javascript", "js", "node", "nodejs"):
        return run_javascript(code, stdin_text, timeout_ms)
    elif lang in ("typescript", "ts"):
        return run_typescript(code, stdin_text, timeout_ms)
    elif lang in ("java",):
        return run_java(code, stdin_text, timeout_ms)
    elif lang in ("c", "cpp", "c++"):
        return run_cpp(code, lang, stdin_text, timeout_ms)
    elif lang in ("go", "golang"):
        return run_go(code, stdin_text, timeout_ms)
    elif lang in ("ruby", "rb"):
        return run_ruby(code, stdin_text, timeout_ms)
    elif lang in ("php",):
        return run_php(code, stdin_text, timeout_ms)
    else:
        return RunResult(
            ok=False, stdout="", stderr=f"Runtime for {language} is not installed on the server.",
            exec_time_ms=0, peak_kb=None,
        )
