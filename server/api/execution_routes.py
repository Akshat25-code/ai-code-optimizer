"""Execution API routes: /run-code, /run-code/compare, /optimize-code-enhanced, /evaluate-optimization."""
from __future__ import annotations

import asyncio
import os
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from core.rate_limit import rate_limit_ai
from core.ai_helpers import (
    build_fake_response,
    raise_ai_http_error,
)
from models.analysis_models import (
    RunCodeReq,
    RunCompareReq,
    EnhancedOptimizeReq,
    EvaluateOptimizationReq,
)
from services.ai.provider_service import ask_ai, ProviderConfigError
from services.execution.sandbox_runner import run_code, to_dict as run_result_to_dict
from services.execution.output_comparator import compare as compare_outputs
from services.execution.performance_profiler import profile_code
from services.execution.docker_runner import LANGUAGE_IMAGES
from utils.code_utils import extract_code_block, estimate_complexity

# Comma-separated list of client IPs allowed to invoke code execution.
CODE_EXECUTION_IP_ALLOWLIST = {
    ip.strip()
    for ip in os.getenv("CODE_EXECUTION_IP_ALLOWLIST", "").split(",")
    if ip.strip()
}

router = APIRouter()


def _is_code_execution_allowed(request: Request) -> tuple[bool, str]:
    """Decide whether the current request is allowed to run user code.

    Rules (in order):
    1. APP_ENV=testing â†’ allowed for automated tests only.
    2. ENABLE_CODE_EXECUTION=1 â†’ allowed regardless of source.
    3. Loopback interface (127.0.0.1, ::1) â†’ allowed.
    4. Client IP in CODE_EXECUTION_IP_ALLOWLIST â†’ allowed.
    5. Otherwise â†’ denied (default-deny).
    """
    if os.getenv("APP_ENV", "").lower() == "testing":
        return True, "APP_ENV=testing"
    if os.getenv("ENABLE_CODE_EXECUTION", "0") == "1":
        return True, "ENABLE_CODE_EXECUTION=1"
    client_host = getattr(getattr(request, "client", None), "host", None) or ""
    if client_host in {"127.0.0.1", "::1", "localhost"}:
        return True, "loopback"
    if client_host in CODE_EXECUTION_IP_ALLOWLIST:
        return True, "ip_allowlist"
    return False, client_host


@router.post("/run-code", dependencies=[Depends(rate_limit_ai)])
async def run_code_endpoint(req: RunCodeReq, request: Request):
    """Execute code with basic performance metrics.

    Safety: default-deny â€” requires ENABLE_CODE_EXECUTION=1, loopback,
    or the client IP being in CODE_EXECUTION_IP_ALLOWLIST.
    """
    allowed, reason = _is_code_execution_allowed(request)
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Code execution is disabled. Set ENABLE_CODE_EXECUTION=1 or "
                f"add the client IP to CODE_EXECUTION_IP_ALLOWLIST. Got: {reason}"
            ),
        )
    result = run_code(req.code, req.language, stdin_text=req.stdin or "", timeout_ms=int(req.timeout_ms or 5000))
    return run_result_to_dict(result)


@router.post("/run-code/compare", dependencies=[Depends(rate_limit_ai)])
async def run_code_compare(req: RunCompareReq, request: Request):
    """Run original + optimized code and compare basic metrics.

    Safety: same default-deny as /run-code.
    """
    allowed, reason = _is_code_execution_allowed(request)
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Code execution is disabled. Set ENABLE_CODE_EXECUTION=1 or "
                f"add the client IP to CODE_EXECUTION_IP_ALLOWLIST. Got: {reason}"
            ),
        )

    effective_timeout_ms = int(req.timeout_ms or 5000)
    if req.timeout is not None:
        effective_timeout_ms = int(req.timeout * 1000)

    started = time.perf_counter()
    original = run_code(req.original_code, req.language, stdin_text=req.stdin or "", timeout_ms=effective_timeout_ms)
    optimized = run_code(req.optimized_code, req.language, stdin_text=req.stdin or "", timeout_ms=effective_timeout_ms)
    took_ms = int((time.perf_counter() - started) * 1000)

    output_match = bool(original.ok and optimized.ok and original.stdout == optimized.stdout)

    speed_pct = None
    memory_pct = None
    if original.ok and optimized.ok and original.exec_time_ms > 0:
        speed_pct = round(((original.exec_time_ms - optimized.exec_time_ms) / original.exec_time_ms) * 100.0, 2)
    if (
        original.ok
        and optimized.ok
        and (original.peak_kb is not None)
        and (optimized.peak_kb is not None)
        and original.peak_kb > 0
    ):
        memory_pct = round(((original.peak_kb - optimized.peak_kb) / original.peak_kb) * 100.0, 2)

    runtime_metrics = {
        "original": run_result_to_dict(original),
        "optimized": run_result_to_dict(optimized),
        "original_code": run_result_to_dict(original),
        "optimized_code": run_result_to_dict(optimized),
        "original_exec_time_ms": original.exec_time_ms,
        "optimized_exec_time_ms": optimized.exec_time_ms,
        "original_peak_kb": original.peak_kb,
        "optimized_peak_kb": optimized.peak_kb,
        "speed_improvement_pct": speed_pct,
        "memory_saved_pct": memory_pct,
    }
    comparison_report = {
        "output_match": output_match,
        "summary": "Outputs match" if output_match else "Outputs differ",
    }

    return {
        "took_ms": took_ms,
        "original": run_result_to_dict(original),
        "optimized": run_result_to_dict(optimized),
        "output_match": output_match,
        "runtime_metrics": runtime_metrics,
        "comparison_report": comparison_report,
        "improvements": {
            "speed_improvement_pct": speed_pct,
            "memory_saved_pct": memory_pct,
        },
    }


@router.post("/optimize-code-enhanced")
async def optimize_code_enhanced(request: EnhancedOptimizeReq):
    """Enhanced optimization endpoint with real AST-based performance analysis."""
    try:
        code = request.code
        language = request.language
        provider = request.provider
        test_inputs = request.test_inputs
        user_instructions = request.user_instructions
        optimization_focus = request.optimization_focus

        provider_used, optimization_result, tokens_in, tokens_out = await ask_ai(
            "optimization",
            language,
            code,
            provider,
            user_instructions=user_instructions,
            optimization_focus=optimization_focus,
        )

        # Real AST-based complexity analysis
        complexity = estimate_complexity(code, language)
        optimized_text = optimization_result if isinstance(optimization_result, str) else str(optimization_result)
        opt_code = extract_code_block(optimized_text)
        opt_complexity = estimate_complexity(opt_code, language) if opt_code else complexity
        performance_analysis = {
            "time_complexity": complexity["time_complexity"],
            "space_complexity": complexity["space_complexity"],
            "optimized_time_complexity": opt_complexity["time_complexity"],
            "optimized_space_complexity": opt_complexity["space_complexity"],
            "explanation": complexity["explanation"],
            "details": complexity["details"],
            "improvement_estimate": (
                f"Improved from {complexity['time_complexity']} to {opt_complexity['time_complexity']}"
                if complexity["time_complexity"] != opt_complexity["time_complexity"]
                else "Same asymptotic complexity â€” improvement may be in constant factors"
            ),
        }

        optimized_code = f"# Optimized version suggested by {provider_used}:\n{optimization_result}"

        return {
            "provider_used": provider_used,
            "result": optimization_result,
            "performance_analysis": performance_analysis,
            "reasoning_details": optimization_result,
            "reasoning": optimization_result,
            "optimized_code": optimized_code,
            "test_inputs_processed": len(test_inputs),
            "tokens_in": int(tokens_in or 0),
            "tokens_out": int(tokens_out or 0),
        }

    except Exception as e:
        raise_ai_http_error(e, "Enhanced optimization error")


@router.post("/evaluate-optimization")
async def evaluate_optimization_endpoint(req: EvaluateOptimizationReq, request: Request):
    """Full verified optimization pipeline (AI + sandbox + proof)."""
    allowed, reason = _is_code_execution_allowed(request)
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Code execution disabled ({reason}). Set ENABLE_CODE_EXECUTION=1.",
        )
    from services.execution.verification_engine import verify_optimization

    optimized = ""
    provider_used = "unknown"
    ai_text = ""
    tokens_in = 0
    tokens_out = 0
    try:
        ai_timeout = int(os.getenv("AI_TIMEOUT", "20"))
        provider_used, result, tokens_in, tokens_out = await asyncio.wait_for(
            ask_ai(
                "optimization",
                req.language,
                req.code,
                req.provider,
                user_instructions=req.user_instructions,
                optimization_focus=req.optimization_focus,
            ),
            timeout=ai_timeout,
        )
        ai_text = result if isinstance(result, str) else str(result)
        optimized = extract_code_block(ai_text) or ai_text
    except ProviderConfigError:
        if os.getenv("ALLOW_FAKE_AI", "0") == "1":
            fake = build_fake_response("optimization", req.language, req.code, "keys-missing")
            provider_used = fake["provider_used"]
            ai_text = fake["result"]
            optimized = req.code
        else:
            raise HTTPException(status_code=400, detail="AI provider not configured")
    except asyncio.TimeoutError:
        if os.getenv("ALLOW_FAKE_AI", "0") == "1":
            fake = build_fake_response("optimization", req.language, req.code, "timeout")
            provider_used = fake["provider_used"]
            ai_text = fake["result"]
            optimized = req.code
        else:
            raise HTTPException(status_code=504, detail="AI provider timed out")

    report = verify_optimization(
        req.code,
        optimized,
        req.language,
        provider_used=provider_used,
        ai_result_text=ai_text,
    )
    report["optimized_code"] = optimized
    report["tokens_in"] = tokens_in
    report["tokens_out"] = tokens_out
    return report


@router.get("/test-optimization-sample")
async def test_optimization_sample():
    raise HTTPException(
        status_code=501,
        detail="test-optimization-sample is disabled. See /docs.",
    )


# ---------- Sandbox endpoints (Feature 3) ----------


class SandboxCompareReq(BaseModel):
    out_a: str
    out_b: str
    mode: str = "exact"  # exact | numeric_tolerance | order_independent
    epsilon: float = 1e-6


class SandboxProfileReq(BaseModel):
    code: str
    language: str = "python"
    timeout_ms: int = 10000


@router.post("/sandbox/compare")
async def sandbox_compare(req: SandboxCompareReq):
    """Compare two outputs using exact, numeric_tolerance, or order_independent mode."""
    result = compare_outputs(req.out_a, req.out_b, mode=req.mode, epsilon=req.epsilon)
    return result


@router.post("/sandbox/profile")
async def sandbox_profile(req: SandboxProfileReq, request: Request):
    """Profile code execution: memory + cProfile hotspots."""
    allowed, reason = _is_code_execution_allowed(request)
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Code execution disabled ({reason}). Set ENABLE_CODE_EXECUTION=1.",
        )
    result = profile_code(req.code, req.language, timeout_ms=req.timeout_ms)
    return result


@router.get("/sandbox/languages")
async def sandbox_languages():
    """List supported sandbox languages and their Docker images."""
    return {
        "languages": [
            {"name": lang, "image": img, "docker_available": True}
            for lang, img in LANGUAGE_IMAGES.items()
        ]
    }
