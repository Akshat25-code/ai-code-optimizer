"""End-to-end verified optimization: differential fuzzing + median timing.

Method (see RESEARCH.md §4 — this engine is the product half of the study):
1. Build an input corpus: caller stdin + caller test_inputs + Hypothesis
   differential fuzz inputs (deterministic seed, bounded size).
2. Run original + optimized on EVERY input, raw in Docker (no
   restricted-builtins wrapper, no tracemalloc) — fail closed without Docker.
3. Require non-empty comparisons: empty-vs-empty proves nothing. Verified
   only if every input matches AND at least `min_nonempty` inputs produced
   output on the original.
4. Timing: repeat runs on the primary input, take the median. Memory:
   separate instrumented runs whose wall times are discarded.
"""
from __future__ import annotations

import statistics
import time
from typing import Any

from services.analysis.code_intelligence import inspect_code_quality
from services.execution.docker_runner import should_use_docker
from services.execution.sandbox_runner import run_code, to_dict as run_result_to_dict
from services.analysis.secret_scanner import scan_secrets
from utils.code_utils import extract_code_block

ENGINE_VERSION = "verification-engine-v2"
DEFAULT_FUZZ_INPUTS = 12
DEFAULT_REPEATS = 5
DEFAULT_MIN_NONEMPTY = 2
MAX_INPUT_BYTES = 4096
FUZZ_SEED = 12345


def fuzz_stdin_inputs(n: int = DEFAULT_FUZZ_INPUTS, seed: int = FUZZ_SEED) -> list[str]:
    """Deterministic differential-fuzz corpus (stdin payloads).

    Uses Hypothesis strategies with derandomization + no database so the
    corpus is reproducible run to run. Falls back to a fixed corpus if
    Hypothesis is unavailable.
    """
    try:
        from hypothesis import given, settings, strategies as st

        corpus: list[str] = []

        @settings(max_examples=max(1, n), database=None, derandomize=True)
        @given(st.one_of(
            st.just(""),
            st.integers(min_value=-9999, max_value=9999).map(lambda i: f"{i}\n"),
            st.lists(st.integers(min_value=-999, max_value=999),
                     min_size=0, max_size=8).map(lambda xs: " ".join(map(str, xs)) + "\n"),
            st.text(
                alphabet=st.characters(whitelist_categories=("Ll", "Lu", "Nd"),
                                       blacklist_characters="\x00"),
                min_size=0, max_size=40,
            ).map(lambda s: s + "\n"),
        ))
        def _collect(s: str) -> None:
            corpus.append(s[:MAX_INPUT_BYTES])

        _collect()
        # Deduplicate, keep order; guarantee at least the empty probe.
        seen: list[str] = []
        for s in corpus:
            if s not in seen:
                seen.append(s)
        return seen or [""]
    except Exception:
        return ["", "0\n", "1\n", "5\n", "hello\n", "1 2 3\n"][: max(1, n)]


def _median_ms(samples: list[int]) -> int | None:
    return int(statistics.median(samples)) if samples else None


def verify_optimization(
    original_code: str,
    optimized_code: str,
    language: str,
    *,
    stdin_text: str = "",
    test_inputs: list[str] | None = None,
    timeout_ms: int = 5000,
    repeats: int = DEFAULT_REPEATS,
    fuzz_inputs: int = DEFAULT_FUZZ_INPUTS,
    min_nonempty: int = DEFAULT_MIN_NONEMPTY,
    provider_used: str = "unknown",
    ai_result_text: str = "",
) -> dict[str, Any]:
    lang = (language or "Python").strip()
    secrets = scan_secrets(original_code)
    inspection_original = inspect_code_quality(original_code, lang)
    inspection_optimized = inspect_code_quality(optimized_code, lang) if optimized_code else None

    # Empty-stdin probe always runs: programs that ignore stdin must still agree.
    inputs: list[str] = [""]
    if stdin_text and stdin_text not in inputs:
        inputs.append(stdin_text[:MAX_INPUT_BYTES])
    for t in test_inputs or []:
        if t not in inputs:
            inputs.append(t[:MAX_INPUT_BYTES])
    if fuzz_inputs > 0:
        for s in fuzz_stdin_inputs(fuzz_inputs):
            if s not in inputs:
                inputs.append(s)

    if not optimized_code:
        return _inconclusive(
            secrets, inspection_original, inspection_optimized,
            provider_used, ai_result_text,
            reason="No optimized code to verify against.",
            inputs_total=len(inputs),
        )
    if not should_use_docker():
        return _inconclusive(
            secrets, inspection_original, inspection_optimized,
            provider_used, ai_result_text,
            reason=("Docker sandbox unavailable (USE_DOCKER_SANDBOX=1 required). "
                    "Verification refuses to run untrusted pairs outside Docker."),
            inputs_total=len(inputs),
        )

    started = time.perf_counter()
    per_input: list[dict[str, Any]] = []
    mismatches = 0
    failures = 0
    nonempty = 0
    for idx, stdin in enumerate(inputs):
        orig = run_code(original_code, lang, stdin_text=stdin, timeout_ms=timeout_ms, raw=True)
        opt = run_code(optimized_code, lang, stdin_text=stdin, timeout_ms=timeout_ms, raw=True)
        orig_out, opt_out = (orig.stdout or ""), (opt.stdout or "")
        both_ok = bool(orig.ok and opt.ok)
        match = both_ok and orig_out == opt_out
        has_output = bool(orig_out.strip())
        if has_output:
            nonempty += 1
        if not match:
            mismatches += 1
        if not both_ok:
            failures += 1
        if len(per_input) < 8 or not match:
            per_input.append({
                "input_index": idx,
                "stdin_preview": stdin[:120],
                "original_ok": orig.ok,
                "optimized_ok": opt.ok,
                "match": match,
                "nonempty": has_output,
                "original_stdout_preview": orig_out[:500],
                "optimized_stdout_preview": opt_out[:500],
                "stderr_preview": ((opt.stderr or orig.stderr) or "")[:300],
            })

    # Timing: repeated raw runs on the primary input, median wins.
    primary = inputs[0]
    orig_times: list[int] = []
    opt_times: list[int] = []
    timing_ok = True
    for _ in range(max(1, repeats)):
        ro = run_code(original_code, lang, stdin_text=primary, timeout_ms=timeout_ms, raw=True)
        rp = run_code(optimized_code, lang, stdin_text=primary, timeout_ms=timeout_ms, raw=True)
        if not (ro.ok and rp.ok):
            timing_ok = False
            break
        orig_times.append(ro.exec_time_ms)
        opt_times.append(rp.exec_time_ms)
    orig_med = _median_ms(orig_times) if timing_ok else None
    opt_med = _median_ms(opt_times) if timing_ok else None

    # Memory: separate instrumented runs; their wall times are discarded.
    mem_orig = run_code(original_code, lang, stdin_text=primary, timeout_ms=timeout_ms, raw=False)
    mem_opt = run_code(optimized_code, lang, stdin_text=primary, timeout_ms=timeout_ms, raw=False)
    orig_peak = mem_orig.peak_kb if mem_orig.ok else None
    opt_peak = mem_opt.peak_kb if mem_opt.ok else None

    speed_pct = None
    if orig_med is not None and opt_med is not None and orig_med > 0:
        speed_pct = round(((orig_med - opt_med) / orig_med) * 100.0, 2)
    memory_pct = None
    if orig_peak and opt_peak and orig_peak > 0:
        memory_pct = round(((orig_peak - opt_peak) / orig_peak) * 100.0, 2)

    total = len(inputs)
    matched = total - mismatches
    output_match = mismatches == 0 and failures == 0 and total > 0
    verified = bool(output_match and nonempty >= min_nonempty)
    if not verified:
        if failures:
            reason = f"{failures}/{total} input(s) crashed or timed out."
        elif not output_match:
            reason = f"{mismatches}/{total} input(s) produced different output."
        else:
            reason = (f"Only {nonempty}/{total} input(s) produced output "
                      f"(need >= {min_nonempty} non-empty comparisons).")
    else:
        reason = f"All {total} inputs matched, {nonempty} non-empty."

    score_delta = 0
    if inspection_optimized:
        score_delta = inspection_optimized["score"] - inspection_original["score"]

    proof_badges = [
        {"label": "Static scan", "status": "passed" if inspection_original["score"] >= 60 else "warning"},
        {"label": f"Output-matched on {matched}/{total} inputs",
         "status": "passed" if output_match else "failed",
         "detail": reason},
        {"label": "Original runs", "status": "passed" if failures == 0 else "failed"},
        {"label": "Non-empty comparisons",
         "status": "passed" if nonempty >= min_nonempty else "failed",
         "detail": f"{nonempty}/{total} produced output"},
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

    took_ms = int((time.perf_counter() - started) * 1000)
    return {
        "engine": ENGINE_VERSION,
        "status": "Verified Optimization" if verified else "Unverified",
        "verified": verified,
        "verify_reason": reason,
        "provider_used": provider_used,
        "took_ms": took_ms,
        "differential": {
            "inputs_total": total,
            "inputs_matched": matched,
            "inputs_nonempty": nonempty,
            "inputs_failed": failures,
            "min_nonempty_required": min_nonempty,
            "timing_repeats": max(1, repeats),
            "timing_input_preview": primary[:120],
            "per_input": per_input,
        },
        "proof_panel": {
            "output_match": output_match,
            "original_runtime_ms": orig_med,
            "optimized_runtime_ms": opt_med,
            "speed_gain_pct": speed_pct,
            "memory_gain_pct": memory_pct,
            "original_peak_kb": orig_peak,
            "optimized_peak_kb": opt_peak,
            "score_delta": score_delta,
            "status": "Verified Optimization" if verified else "Unverified",
        },
        "proof_badges": proof_badges,
        "secrets_scan": secrets,
        "inspection": {
            "original": inspection_original,
            "optimized": inspection_optimized,
        },
        "optimized_code": extract_code_block(optimized_code) or optimized_code,
        "ai_result_text": ai_result_text,
    }


def _inconclusive(secrets: dict, inspection_original: dict,
                  inspection_optimized: dict | None, provider_used: str,
                  ai_result_text: str, *, reason: str, inputs_total: int) -> dict[str, Any]:
    """Fail-closed report shape when execution cannot run (no Docker / no code)."""
    score_delta = 0
    if inspection_optimized:
        try:
            score_delta = inspection_optimized["score"] - inspection_original["score"]
        except Exception:
            score_delta = 0
    return {
        "engine": ENGINE_VERSION,
        "status": "Unverified",
        "verified": False,
        "verify_reason": reason,
        "provider_used": provider_used,
        "took_ms": 0,
        "differential": {
            "inputs_total": inputs_total,
            "inputs_matched": 0,
            "inputs_nonempty": 0,
            "inputs_failed": 0,
            "min_nonempty_required": DEFAULT_MIN_NONEMPTY,
            "timing_repeats": 0,
            "timing_input_preview": "",
            "per_input": [],
        },
        "proof_panel": {
            "output_match": False,
            "original_runtime_ms": None,
            "optimized_runtime_ms": None,
            "speed_gain_pct": None,
            "memory_gain_pct": None,
            "original_peak_kb": None,
            "optimized_peak_kb": None,
            "score_delta": score_delta,
            "status": "Unverified",
        },
        "proof_badges": [
            {"label": "Static scan",
             "status": "passed" if inspection_original.get("score", 0) >= 60 else "warning"},
            {"label": "Output-matched on 0 inputs", "status": "failed", "detail": reason},
            {"label": "Original runs", "status": "failed"},
            {"label": "Non-empty comparisons", "status": "failed", "detail": "0/0 produced output"},
            {"label": "Benchmark improved", "status": "failed"},
            {"label": "Secrets clean",
             "status": "passed" if not secrets.get("has_secrets") else "warning"},
            {"label": "AI provider",
             "status": "warning" if provider_used.startswith("dev-fake") else "passed",
             "detail": provider_used},
        ],
        "secrets_scan": secrets,
        "inspection": {"original": inspection_original, "optimized": inspection_optimized},
        "optimized_code": "",
        "ai_result_text": ai_result_text,
    }
