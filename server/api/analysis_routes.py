"""Analysis API routes: /analyze-code, /analyze-code/compare, /inspect-code, /supported-languages."""
from __future__ import annotations

import asyncio
import os
import time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse

from core.rate_limit import rate_limit_ai, enforce_daily_quota
from core.ai_helpers import (
    build_fake_response,
    format_analyze_response,
    raise_ai_http_error,
)
from core.config import settings
from models.analysis_models import (
    AnalyzeReq,
    AnalyzeRes,
    CompareReq,
    CompareResItem,
    InspectCodeReq,
    InspectReportReq,
)
from services.ai.provider_service import ask_ai, ProviderConfigError
from services.ai.cache_service import (
    make_cache_key,
    get_cached_response,
    store_cached_response,
    record_cache_hit,
    get_cache_stats,
)
from services.analysis.bug_scanner import scan_python, scan_javascript, to_json as bug_report_to_json
from services.analysis.code_intelligence import format_code_quality_markdown, inspect_code_quality
from services.analysis.complexity_engine import analyze_complexity
from services.analysis.rules_engine import RulesEngine, get_compliance_score
from services.analysis.analytics_engine import build_snapshot
from core.database import get_database
from api.auth_routes import get_optional_user
from api.apikeys_routes import fetch_user_api_keys

router = APIRouter()
_rules_engine = RulesEngine()


@router.post("/analyze-code", response_model=AnalyzeRes, dependencies=[Depends(rate_limit_ai), Depends(enforce_daily_quota)])
async def analyze_code(req: AnalyzeReq, current_user: dict | None = Depends(get_optional_user)):
    try:
        norm_task = (req.task or "").strip().lower()
        if norm_task in {"bug_detection", "bug-detection", "bug", "bugs"}:
            lang = (req.language or "").strip().lower()
            if lang == "python":
                report = scan_python(req.code)
                return format_analyze_response("static", bug_report_to_json(report), 0, 0)
            if lang in {"javascript", "typescript"}:
                report = scan_javascript(req.code)
                return format_analyze_response("static", bug_report_to_json(report), 0, 0)

        # Check AI response cache â€” instant response, zero API cost on hit
        cache_key = make_cache_key(
            req.code, req.task, req.language, req.provider,
            req.user_instructions, req.optimization_focus,
        )
        cached = await get_cached_response(cache_key)
        if cached is not None:
            await record_cache_hit(cache_key)
            cached["from_cache"] = True
            return cached

        # Fetch user's BYO API keys (if authenticated)
        user_api_keys = None
        if current_user:
            user_api_keys = await fetch_user_api_keys(current_user["id"]) or None

        ai_timeout = int(os.getenv("AI_TIMEOUT", "20"))
        ai_retries = int(os.getenv("AI_RETRIES", "1"))

        last_exc = None
        for attempt in range(ai_retries + 1):
            try:
                provider_used, result, tokens_in, tokens_out = await asyncio.wait_for(
                    ask_ai(
                        req.task,
                        req.language,
                        req.code,
                        req.provider,
                        user_instructions=req.user_instructions,
                        optimization_focus=req.optimization_focus,
                        api_keys=user_api_keys,
                    ),
                    timeout=ai_timeout,
                )
                response = format_analyze_response(provider_used, result, tokens_in, tokens_out)
                await store_cached_response(cache_key, response)
                return response
            except asyncio.TimeoutError as te:
                last_exc = te
                if attempt < ai_retries:
                    await asyncio.sleep(min(2 ** attempt, 2))
                    continue
                else:
                    raise
    except ValueError as e:
        if "programming language" in str(e).lower():
            raise HTTPException(status_code=422, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except ProviderConfigError as e:
        if os.getenv("ALLOW_FAKE_AI", "1") == "1":
            return build_fake_response(req.task, req.language, req.code, "keys-missing")
        raise HTTPException(status_code=400, detail=str(e))
    except asyncio.TimeoutError:
        if os.getenv("ALLOW_FAKE_AI", "1") == "1":
            return build_fake_response(req.task, req.language, req.code, "timeout")
        raise HTTPException(status_code=504, detail="AI provider timed out")
    except HTTPException:
        raise
    except Exception as e:
        if os.getenv("ALLOW_FAKE_AI", "1") == "1":
            return build_fake_response(req.task, req.language, req.code, f"error: {e}")
        raise_ai_http_error(e, "AI error")


@router.post("/analyze-code/compare", dependencies=[Depends(enforce_daily_quota)])
async def compare_models(req: CompareReq, current_user: dict | None = Depends(get_optional_user)):
    """Run the same request across multiple AI providers and return side-by-side results."""
    try:
        all_providers = ["openai", "claude", "gemini"]
        if settings.experimental_providers_enabled:
            all_providers.extend(["deepseek", "grok"])
        target_providers = req.providers or all_providers

        # Fetch user's BYO API keys (if authenticated)
        user_api_keys = None
        if current_user:
            user_api_keys = await fetch_user_api_keys(current_user["id"]) or None

        ai_timeout = int(os.getenv("AI_TIMEOUT", "20"))
        ai_retries = int(os.getenv("AI_RETRIES", "1"))

        async def run_provider(pname: str) -> tuple[str, CompareResItem]:
            start = time.perf_counter()
            last_exc = None
            for attempt in range(ai_retries + 1):
                try:
                    provider_used, result, tokens_in, tokens_out = await asyncio.wait_for(
                        ask_ai(
                            req.task,
                            req.language,
                            req.code,
                            pname,
                            user_instructions=req.user_instructions,
                            optimization_focus=req.optimization_focus,
                            api_keys=user_api_keys,
                        ),
                        timeout=ai_timeout,
                    )
                    dur = int((time.perf_counter() - start) * 1000)
                    return pname, CompareResItem(
                        status="ok",
                        provider_used=provider_used,
                        result=result,
                        duration_ms=dur,
                        tokens_in=tokens_in,
                        tokens_out=tokens_out,
                    )
                except ProviderConfigError as ce:
                    dur = int((time.perf_counter() - start) * 1000)
                    if os.getenv("ALLOW_FAKE_AI", "1") == "1":
                        fake = build_fake_response(req.task, req.language, req.code, "keys-missing")
                        return pname, CompareResItem(
                            status="config",
                            provider_used=f"{pname}-dev-fake",
                            result=fake["result"],
                            duration_ms=dur,
                        )
                    return pname, CompareResItem(status="config", error=str(ce), duration_ms=dur)
                except asyncio.TimeoutError as te:
                    last_exc = te
                    if attempt < ai_retries:
                        await asyncio.sleep(min(2 ** attempt, 2))
                        continue
                    dur = int((time.perf_counter() - start) * 1000)
                    if os.getenv("ALLOW_FAKE_AI", "1") == "1":
                        fake = build_fake_response(req.task, req.language, req.code, "timeout")
                        return pname, CompareResItem(
                            status="timeout",
                            provider_used=f"{pname}-dev-fake-timeout",
                            result=fake["result"],
                            duration_ms=dur,
                        )
                    return pname, CompareResItem(status="timeout", error="timeout", duration_ms=dur)
                except Exception as e:
                    dur = int((time.perf_counter() - start) * 1000)
                    return pname, CompareResItem(status="error", error=str(e), duration_ms=dur)

        tasks = [run_provider(p) for p in target_providers]
        started = time.perf_counter()
        results = await asyncio.gather(*tasks)
        took_ms = int((time.perf_counter() - started) * 1000)

        return {
            "results": {name: item.model_dump() for name, item in results},
            "took_ms": took_ms,
            "providers": target_providers,
        }
    except ValueError as e:
        if "programming language" in str(e).lower():
            raise HTTPException(status_code=422, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise_ai_http_error(e, "Compare error")


@router.post("/inspect-code", dependencies=[Depends(rate_limit_ai)])
async def inspect_code_endpoint(req: InspectCodeReq):
    """Deterministic local code intelligence without calling an AI provider."""
    try:
        result = inspect_code_quality(req.code, req.language, req.optimized_code)

        # Integrate rules engine â€” evaluate all loaded packs
        all_rules = []
        for pack_rules in _rules_engine.get_all_packs().values():
            all_rules.extend(pack_rules)

        if all_rules:
            violations = _rules_engine.evaluate(req.code, req.language, all_rules)
            result["rule_violations"] = [v.to_dict() for v in violations]
            result["compliance_score"] = get_compliance_score(violations)
        else:
            result["rule_violations"] = []
            result["compliance_score"] = 100

        # Write quality snapshot (best-effort, non-blocking)
        try:
            db = get_database()
            if db is not None:
                snapshot = build_snapshot(result)
                await db.quality_snapshots.insert_one(snapshot)
        except Exception:
            pass  # Don't fail inspection on snapshot write error

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Local inspection failed: {e}")


@router.post("/inspect-code/report", response_class=PlainTextResponse)
async def inspect_code_report_endpoint(req: InspectReportReq):
    """Generate a Markdown proof report from deterministic local inspection."""
    try:
        report = inspect_code_quality(req.code, req.language, req.optimized_code)
        markdown = format_code_quality_markdown(report, req.project_name)
        return PlainTextResponse(
            markdown,
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="code_quality_proof_report.md"'},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proof report generation failed: {e}")


@router.post("/analysis/complexity")
async def complexity_analysis_endpoint(req: InspectCodeReq):
    """Full AST-based complexity analysis â€” pure CS, zero AI.

    Returns: cognitive complexity, cyclomatic complexity, Halstead metrics,
    maintainability index, dead code detection, call graph, per-function
    grading (A-F), and overall score.
    """
    try:
        report = analyze_complexity(req.code, req.language)
        if req.optimized_code:
            optimized_report = analyze_complexity(req.optimized_code, req.language)
            report["optimized"] = optimized_report
            report["comparison"] = {
                "score_delta": optimized_report.get("score", 0) - report.get("score", 0),
                "grade_before": report.get("grade", "?"),
                "grade_after": optimized_report.get("grade", "?"),
                "dead_code_delta": (
                    optimized_report.get("aggregate", {}).get("dead_code_count", 0)
                    - report.get("aggregate", {}).get("dead_code_count", 0)
                ),
                "avg_cyclomatic_delta": round(
                    optimized_report.get("aggregate", {}).get("avg_cyclomatic", 0)
                    - report.get("aggregate", {}).get("avg_cyclomatic", 0),
                    2,
                ),
                "avg_cognitive_delta": round(
                    optimized_report.get("aggregate", {}).get("avg_cognitive", 0)
                    - report.get("aggregate", {}).get("avg_cognitive", 0),
                    2,
                ),
            }
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Complexity analysis failed: {e}")


@router.get("/analysis/cache-stats")
async def cache_stats_endpoint():
    """Cache statistics: entries, hits, estimated cost savings."""
    return await get_cache_stats()


@router.get("/supported-languages")
async def get_supported_languages_endpoint():
    """Get all supported programming languages."""
    try:
        from models.requests import (
            get_supported_languages as get_langs,
            get_popular_languages as get_popular,
        )

        all_languages = get_langs()
        popular_languages = get_popular()

        supported_languages = {
            name: {
                "name": info.name,
                "category": info.category.value if hasattr(info.category, "value") else str(info.category),
                "extensions": info.extensions,
                "description": info.description,
                "is_popular": info.is_popular,
            }
            for name, info in all_languages.items()
        }
        return {
            "supported_languages": supported_languages,
            "popular_languages": popular_languages,
            "languages": [
                {
                    "language": name,
                    "name": info["name"],
                    "version": "unspecified",
                    "metadata": {
                        **info,
                        "is_popular_listed": name in popular_languages,
                    },
                }
                for name, info in supported_languages.items()
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching supported languages: {e}")
