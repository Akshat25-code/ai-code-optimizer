"""Client for the isolated execution worker (server/worker.py).

When EXECUTOR_URL is set, code runs in the worker container instead of the
API process. Otherwise returns None and callers use the local path.
"""
from __future__ import annotations

import os

import httpx

from services.execution.language_runners import RunResult


def worker_configured() -> bool:
    return bool(os.getenv("EXECUTOR_URL", "").strip())


def execute_via_worker(code: str, language: str, stdin_text: str = "",
                       timeout_ms: int = 5000, raw: bool = False,
                       endpoint: str = "/execute") -> RunResult | None:
    """POST code to the worker; None when unconfigured. Raises on transport
    errors so callers can distinguish worker-down from worker-refused."""
    base = os.getenv("EXECUTOR_URL", "").strip().rstrip("/")
    if not base:
        return None
    key = os.getenv("EXECUTOR_API_KEY", "")
    timeout_s = max(1.0, min(120.0, timeout_ms / 1000 + 15))
    try:
        r = httpx.post(
            f"{base}{endpoint}",
            json={"code": code, "language": language, "stdin_text": stdin_text,
                  "timeout_ms": timeout_ms, "raw": raw},
            headers={"X-Executor-Key": key} if key else {},
            timeout=timeout_s,
        )
    except Exception as e:
        raise RuntimeError(f"Execution worker unreachable: {e}")
    if r.status_code == 401:
        raise RuntimeError("Execution worker rejected the executor key")
    if r.status_code == 503:
        raise RuntimeError(f"Execution worker refused: {r.text[:200]}")
    try:
        data = r.json()
    except Exception:
        raise RuntimeError(f"Execution worker bad response: HTTP {r.status_code}")
    return RunResult(
        ok=bool(data.get("ok", False)),
        stdout=str(data.get("stdout", "")),
        stderr=str(data.get("stderr", "")),
        exec_time_ms=int(data.get("exec_time_ms", 0) or 0),
        peak_kb=data.get("peak_kb"),
    )


def profile_via_worker(code: str, language: str,
                       timeout_ms: int = 10000) -> dict | None:
    """POST code to the worker /profile endpoint. None when unconfigured."""
    base = os.getenv("EXECUTOR_URL", "").strip().rstrip("/")
    if not base:
        return None
    key = os.getenv("EXECUTOR_API_KEY", "")
    timeout_s = max(1.0, min(120.0, timeout_ms / 1000 + 15))
    try:
        r = httpx.post(
            f"{base}/profile",
            json={"code": code, "language": language, "timeout_ms": timeout_ms},
            headers={"X-Executor-Key": key} if key else {},
            timeout=timeout_s,
        )
    except Exception as e:
        raise RuntimeError(f"Execution worker unreachable: {e}")
    if r.status_code == 401:
        raise RuntimeError("Execution worker rejected the executor key")
    if r.status_code == 503:
        raise RuntimeError(f"Execution worker refused: {r.text[:200]}")
    try:
        data = r.json()
    except Exception:
        raise RuntimeError(f"Execution worker bad response: HTTP {r.status_code}")
    return data if isinstance(data, dict) else {"ok": False, "error": "bad response"}
