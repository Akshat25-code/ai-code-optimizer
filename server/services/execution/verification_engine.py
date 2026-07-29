"""End-to-end verified optimization: inspect, run, compare, badge."""
from __future__ import annotations

import time
from typing import Any

from services.analysis.code_intelligence import inspect_code_quality
from services.execution.sandbox_runner import run_code, to_dict as run_result_to_dict
from services.analysis.secret_scanner import scan_secrets
from utils.code_utils import extract_code_block


def verify_optimization(
    original_code: str,
    optimized_code: str,
    language: str,
    *,
    stdin_text: str = "",
    timeout_ms: int = 5000,
    provider_used: str = "unknown",
    ai_result_text: str = "",
) -> dict[str, Any]:
    lang = (language or "Python").strip()
    secrets = scan_secrets(original_code)
    inspection_original = inspect_code_quality(original_code, lang)
    inspection_optimized = inspect_code_quality(optimized_code, lang) if optimized_code else None

    started = time.perf_counter()
    original_run = run_code(original_code, lang, stdin_text=stdin_text, timeout_ms=timeout_ms)
    optimized_run = run_code(optimized_code, lang, stdin_text=stdin_text, timeout_ms=timeout_ms) if optimized_code else None
    took_ms = int((time.perf_counter() - started) * 1000)

    output_match = bool(
        optimized_run
        and original_run.ok
        and optimized_run.ok
        and original_run.stdout == optimized_run.stdout
    )

    speed_pct = None
    if optimized_run and original_run.ok and optimized_run.ok and original_run.exec_time_ms > 0:
        speed_pct = round(
            ((original_run.exec_time_ms - optimized_run.exec_time_ms) / original_run.exec_time_ms) * 100.0,
            2,
        )

    memory_pct = None
    if (
        optimized_run
        and original_run.ok
        and optimized_run.ok
        and original_run.peak_kb
        and optimized_run.peak_kb
        and original_run.peak_kb > 0
    ):
        memory_pct = round(
            ((original_run.peak_kb - optimized_run.peak_kb) / original_run.peak_kb) * 100.0,
            2,
        )

    verified = output_match and original_run.ok and (optimized_run.ok if optimized_run else False)
    score_delta = 0
    if inspection_optimized:
        score_delta = inspection_optimized["score"] - inspection_original["score"]

    proof_badges = [
        {"label": "Static scan", "status": "passed" if inspection_original["score"] >= 60 else "warning"},
        {"label": "Output matched", "status": "passed" if output_match else "failed"},
        {"label": "Original runs", "status": "passed" if original_run.ok else "failed"},
        {"label": "Optimized runs", "status": "passed" if optimized_run and optimized_run.ok else "failed"},
        {
            "label": "Benchmark improved",
            "status": "passed" if speed_pct and speed_pct > 0 else ("warning" if speed_pct == 0 else "failed"),
        },
        {"label": "Secrets clean", "status": "passed" if not secrets["has_secrets"] else "warning"},
        {
            "label": "AI provider",
            "status": "warning" if provider_used.startswith("dev-fake") else "passed",
            "detail": provider_used,
        },
    ]

    return {
        "engine": "verification-engine-v1",
        "status": "Verified Optimization" if verified else "Unverified",
        "verified": verified,
        "provider_used": provider_used,
        "took_ms": took_ms,
        "proof_panel": {
            "output_match": output_match,
            "original_runtime_ms": original_run.exec_time_ms,
            "optimized_runtime_ms": optimized_run.exec_time_ms if optimized_run else None,
            "speed_gain_pct": speed_pct,
            "memory_gain_pct": memory_pct,
            "score_delta": score_delta,
            "status": "Verified Optimization" if verified else "Unverified",
        },
        "proof_badges": proof_badges,
        "secrets_scan": secrets,
        "inspection": {
            "original": inspection_original,
            "optimized": inspection_optimized,
        },
        "runtime": {
            "original": run_result_to_dict(original_run),
            "optimized": run_result_to_dict(optimized_run) if optimized_run else None,
        },
        "optimized_code": extract_code_block(optimized_code) or optimized_code,
        "ai_result_text": ai_result_text,
    }
