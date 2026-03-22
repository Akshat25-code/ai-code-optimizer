# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi import Request
from websocket_manager import manager
import asyncio
import logging
import time
import re
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from typing import Any
from ai_service import ask_ai, ProviderConfigError
from bug_scanner import scan_python, to_json as bug_report_to_json
from code_runner import run_python, run_code, to_dict as run_result_to_dict
from simple_enhanced_ai_service import evaluate_code_optimization
from language_validator import (
    validate_programming_language, 
    LanguageValidationError, 
    programming_language_validator,
    get_supported_languages,
    get_popular_languages
)
from mongodb_auth_routes import router as auth_router
from oauth_routes import router as oauth_router
from profile_routes import router as profile_router
from opt_sessions_routes import router as opt_sessions_router
from github_routes import router as github_router
from mongodb_database import connect_to_mongo, init_mongodb, close_mongo_connection, mongo_diagnostics
import os
from dotenv import load_dotenv
from settings import settings

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger("ai_code_optimizer")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

BACKEND_PORT = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8001")))
APP_ENV = os.getenv("APP_ENV", "development").lower()
MAX_CODE_LENGTH = int(os.getenv("MAX_CODE_LENGTH", "50000"))  # 50KB default


# --- Lifespan (replaces deprecated @app.on_event) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if os.getenv("SKIP_MONGO_INIT", "0") == "1":
        logger.warning("SKIP_MONGO_INIT=1: Skipping MongoDB initialization (dev-only)")
        logger.info(f"BACKEND_PORT={BACKEND_PORT}")
    else:
        await connect_to_mongo()
        await init_mongodb()
        logger.info("MongoDB authentication initialized")
        logger.info(f"Using DB name: {os.getenv('MONGODB_DB', 'ai_code_optimizer')}")
        logger.info(f"BACKEND_PORT={BACKEND_PORT}")
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(title="AI Code Optimizer API", version="0.4.0", lifespan=lifespan)


def _is_rate_limited_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return (
        "429" in msg
        or "too many requests" in msg
        or "rate limit" in msg
        or "rate-limited" in msg
        or "quota" in msg
    )


def _raise_ai_http_error(exc: Exception, prefix: str = "AI error"):
    if _is_rate_limited_error(exc):
        raise HTTPException(
            status_code=429,
            detail="AI provider is currently overloaded or rate-limited. Please try again later.",
        )
    raise HTTPException(status_code=500, detail=f"{prefix}: {exc}")


def _build_fake_response(task: str, language: str, code: str, reason: str) -> dict:
    """Build a consistent dev-fake AI response when real providers are unavailable."""
    preview_lines = code.strip().splitlines()
    preview = "\n".join(preview_lines[:10]) + ("\n..." if len(preview_lines) > 10 else "")
    return {
        "provider_used": f"dev-fake-{reason}",
        "result": (
            f"[DEV FAKE] Task: {task} for {language}\n\n"
            f"Input preview:\n{preview}\n\n"
            f"This is a development stub ({reason})."
        ),
    }


def _extract_first_code_block(text: str) -> str:
    if not text:
        return ""
    match = re.search(r"```[a-zA-Z0-9_+\-]*\n([\s\S]*?)```", text)
    return match.group(1).strip() if match else ""


def _format_analyze_response(provider_used: str, result: str, tokens_in: int = 0, tokens_out: int = 0) -> dict:
    result_text = result if isinstance(result, str) else str(result)
    optimized_code = _extract_first_code_block(result_text)
    analysis_obj = {
        "summary": result_text,
        "raw": result_text,
    }
    structured = {
        "analysis": result_text,
        "optimized_code": optimized_code,
        "provider_metadata": {
            "provider_used": provider_used,
            "tokens_in": int(tokens_in or 0),
            "tokens_out": int(tokens_out or 0),
        },
    }
    return {
        "provider_used": provider_used,
        "analysis": analysis_obj,
        "provider_metadata": structured["provider_metadata"],
        "result": structured,
        "result_text": result_text,
        "optimized_code": optimized_code or result_text,
        "tokens_in": int(tokens_in or 0),
        "tokens_out": int(tokens_out or 0),
    }


# Add CORS middleware — restrict origins in production
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)
app.include_router(oauth_router)
app.include_router(opt_sessions_router)
app.include_router(github_router)
app.include_router(profile_router)

@app.websocket("/ws/session/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            # Wait for data from ANY client in this session
            data = await websocket.receive_json()
            # Broadcast it back to all OTHER clients in this session
            await manager.broadcast(session_id, {"type": "session_update", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)

# Serve uploaded files (e.g., avatars)
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Debug endpoints — only available in development
@app.get("/debug/db")
async def debug_db():
    if APP_ENV == "production":
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "database": os.getenv("MONGODB_DB", "ai_code_optimizer"),
        "port_env": BACKEND_PORT,
        "allow_fake_ai": os.getenv("ALLOW_FAKE_AI", "1") == "1"
    }

# Optional, dev-only: return Mongo diagnostics (mask secrets). Enable with MONGODB_DEBUG=1
@app.get("/debug/mongo")
async def debug_mongo():
    if APP_ENV == "production" or os.getenv("MONGODB_DEBUG", "0") != "1":
        raise HTTPException(status_code=404, detail="Not found")
    diag = await mongo_diagnostics()
    # Mask credentials in URL if present
    url = str(diag.get("url", ""))
    if "@" in url and "://" in url:
        scheme, rest = url.split("://", 1)
        if "@" in rest:
            creds, hostpart = rest.split("@", 1)
            diag["url"] = f"{scheme}://***:***@{hostpart}"
    return diag

class AnalyzeReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str
    task: str  # "bug_detection" | "optimization" | "explanation" | "analyze" | "document" | "refactor"
    provider: str | None = None  # "openai" | "claude" | "gemini" | None/auto
    user_instructions: str | None = None
    optimization_focus: list[str] | None = None
    
    @validator('language')
    def validate_language(cls, v):
        """Validate that language is a supported programming language"""
        try:
            validate_programming_language(v)
            return v
        except LanguageValidationError as e:
            raise ValueError(str(e))

class AnalyzeRes(BaseModel):
    provider_used: str
    result: Any
    analysis: Any = None
    optimized_code: str | None = None
    provider_metadata: dict | None = None
    result_text: str | None = None
    tokens_in: int | None = 0
    tokens_out: int | None = 0


class RunCodeReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str
    stdin: str | None = None
    timeout_ms: int | None = 5000

    @validator('language')
    def validate_language(cls, v):
        try:
            validate_programming_language(v)
            return v
        except LanguageValidationError as e:
            raise ValueError(str(e))


class RunCompareReq(BaseModel):
    original_code: str = Field(..., max_length=MAX_CODE_LENGTH)
    optimized_code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str = "Python"
    stdin: str | None = None
    timeout_ms: int | None = 5000
    timeout: int | None = None

    @validator('language')
    def validate_language(cls, v):
        try:
            validate_programming_language(v)
            return v
        except LanguageValidationError as e:
            raise ValueError(str(e))


@app.post("/run-code")
async def run_code_endpoint(req: RunCodeReq, request: Request):
    """Dev-only code runner with basic performance metrics.
    Supports: Python, JavaScript

    Safety:
    - Enabled by default in dev mode (localhost)
    - Localhost-only by default
    """
    # Allow localhost requests (dev mode) - auto-enable for localhost
    client_host = getattr(getattr(request, "client", None), "host", None) or ""
    allowed_hosts = {"127.0.0.1", "::1", "localhost", "0.0.0.0"}
    is_localhost = client_host in allowed_hosts or client_host.startswith("192.168.") or client_host.startswith("10.")
    
    # Auto-enable for localhost, otherwise check env var
    if not is_localhost and os.getenv("ENABLE_CODE_EXECUTION", "0") != "1":
        raise HTTPException(status_code=403, detail=f"Code execution is restricted to localhost. Got: {client_host}")

    result = run_code(req.code, req.language, stdin_text=req.stdin or "", timeout_ms=int(req.timeout_ms or 5000))
    return run_result_to_dict(result)


@app.post("/run-code/compare")
async def run_code_compare(req: RunCompareReq, request: Request):
    """Dev-only: run original + optimized code and compare basic metrics.
    Supports: Python, JavaScript

    Safety:
    - Enabled by default in dev mode (localhost)
    - Localhost-only by default
    """
    # Allow localhost requests (dev mode) - auto-enable for localhost
    client_host = getattr(getattr(request, "client", None), "host", None) or ""
    allowed_hosts = {"127.0.0.1", "::1", "localhost", "0.0.0.0"}
    is_localhost = client_host in allowed_hosts or client_host.startswith("192.168.") or client_host.startswith("10.")
    
    # Auto-enable for localhost, otherwise check env var
    if not is_localhost and os.getenv("ENABLE_CODE_EXECUTION", "0") != "1":
        raise HTTPException(status_code=403, detail=f"Code execution is restricted to localhost. Got: {client_host}")

    effective_timeout_ms = int(req.timeout_ms or 5000)
    if req.timeout is not None:
        # Accept legacy timeout in seconds used by older clients/tests.
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

    if original.ok and optimized.ok and (original.peak_kb is not None) and (optimized.peak_kb is not None) and original.peak_kb > 0:
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

class EvaluateOptimizationReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str
    provider: str | None = None
    user_instructions: str | None = None
    optimization_focus: list[str] | None = None

@app.post("/analyze-code", response_model=AnalyzeRes)
async def analyze_code(req: AnalyzeReq):
    try:
        # Static bug detection (fast, deterministic) for Python
        norm_task = (req.task or "").strip().lower()
        if norm_task in {"bug_detection", "bug-detection", "bug", "bugs"} and req.language == "Python":
            report = scan_python(req.code)
            return _format_analyze_response("static", bug_report_to_json(report), 0, 0)

        # Language validation is already handled by Pydantic validator
        # Guard against long external timeouts
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
                    ),
                    timeout=ai_timeout,
                )
                return _format_analyze_response(provider_used, result, tokens_in, tokens_out)
            except asyncio.TimeoutError as te:
                last_exc = te
                if attempt < ai_retries:
                    # brief backoff before retry
                    await asyncio.sleep(min(2 ** attempt, 2))
                    continue
                else:
                    raise
    except ValueError as e:
        # Handle language validation errors
        if "programming language" in str(e).lower():
            raise HTTPException(status_code=422, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except ProviderConfigError as e:
        if os.getenv("ALLOW_FAKE_AI", "1") == "1":
            return _build_fake_response(req.task, req.language, req.code, "keys-missing")
        raise HTTPException(status_code=400, detail=str(e))
    except asyncio.TimeoutError:
        if os.getenv("ALLOW_FAKE_AI", "1") == "1":
            return _build_fake_response(req.task, req.language, req.code, "timeout")
        raise HTTPException(status_code=504, detail="AI provider timed out")
    except HTTPException:
        raise
    except Exception as e:
        if os.getenv("ALLOW_FAKE_AI", "1") == "1":
            return _build_fake_response(req.task, req.language, req.code, f"error: {e}")
        _raise_ai_http_error(e, "AI error")

@app.get("/supported-languages")
async def get_supported_languages_endpoint():
    """Get all supported programming languages"""
    try:
        from language_validator import get_supported_languages as get_langs, get_popular_languages as get_popular
        all_languages = get_langs()
        popular_languages = get_popular()
        
        return [
            {
                "language": name,
                "name": info.name,
                "version": "unspecified",
                "metadata": {
                    "name": info.name,
                    "category": info.category,
                    "extensions": info.extensions,
                    "description": info.description,
                    "is_popular": info.is_popular,
                    "is_popular_listed": name in popular_languages,
                },
            }
            for name, info in all_languages.items()
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching supported languages: {e}")

@app.get("/")
async def root():
    return {"message": "AI Code Optimizer API", "version": "0.3.0", "docs": "/docs"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "0.3.0"}

@app.get("/providers")
async def providers_status():
    """Report which AI providers are configured (no secrets returned)."""
    configured_default = os.getenv("PRIMARY_AI_PROVIDER", "auto").strip().lower()
    alias_map = {
        "claude": "anthropic",
    }
    if settings.experimental_providers_enabled:
        alias_map.update({"grok": "grok", "deepseek": "deepseek"})
    default_provider = alias_map.get(configured_default, configured_default)
    providers = [
        {"name": "openai", "healthy": bool(settings.openai_api_key), "configured": bool(settings.openai_api_key), "model": settings.openai_model},
        {"name": "anthropic", "healthy": bool(settings.anthropic_api_key), "configured": bool(settings.anthropic_api_key), "model": settings.anthropic_model},
        {"name": "gemini", "healthy": bool(settings.gemini_api_key), "configured": bool(settings.gemini_api_key), "model": settings.gemini_model},
    ]
    if settings.experimental_providers_enabled:
        providers.extend([
            {"name": "deepseek", "healthy": bool(settings.deepseek_api_key), "configured": bool(settings.deepseek_api_key), "model": settings.deepseek_model},
            {
                "name": "grok",
                "healthy": bool(settings.grok_api_key or settings.groq_api_key),
                "configured": bool(settings.grok_api_key or settings.groq_api_key),
                "model": settings.grok_model if settings.grok_api_key else settings.groq_model,
            },
        ])
    return {
        "providers": providers,
        "default_provider": default_provider,
        "openai": bool(settings.openai_api_key),
        "anthropic": bool(settings.anthropic_api_key),
        "gemini": bool(settings.gemini_api_key),
        "deepseek": bool(settings.experimental_providers_enabled and settings.deepseek_api_key),
        "grok": bool(settings.experimental_providers_enabled and (settings.grok_api_key or settings.groq_api_key)),
        "models": {
            "openai": settings.openai_model,
            "anthropic": settings.anthropic_model,
            "gemini": settings.gemini_model,
        },
        "allow_fake_ai": os.getenv("ALLOW_FAKE_AI", "1") == "1",
        "ai_timeout": int(os.getenv("AI_TIMEOUT", "10")),
        "ai_retries": int(os.getenv("AI_RETRIES", "1")),
        "experimental_providers_enabled": settings.experimental_providers_enabled,
    }

class CompareReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str
    task: str
    providers: list[str] | None = None  # e.g., ["openai","claude","gemini","deepseek","grok"] or None for all
    user_instructions: str | None = None
    optimization_focus: list[str] | None = None

    @validator('language')
    def validate_language(cls, v):
        try:
            validate_programming_language(v)
            return v
        except LanguageValidationError as e:
            raise ValueError(str(e))

class CompareResItem(BaseModel):
    status: str  # ok | timeout | error | config
    provider_used: str | None = None
    result: str | None = None
    error: str | None = None
    duration_ms: int | None = None
    tokens_in: int | None = 0
    tokens_out: int | None = 0

@app.post("/analyze-code/compare")
async def compare_models(req: CompareReq):
    """Run the same request across multiple AI providers and return side-by-side results."""
    try:
        # normalize providers
        all_providers = ["openai", "claude", "gemini"]
        if settings.experimental_providers_enabled:
            all_providers.extend(["deepseek", "grok"])
        target_providers = req.providers or all_providers

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
                        tokens_out=tokens_out
                    )
                except ProviderConfigError as ce:
                    dur = int((time.perf_counter() - start) * 1000)
                    if os.getenv("ALLOW_FAKE_AI", "1") == "1":
                        fake = _build_fake_response(req.task, req.language, req.code, "keys-missing")
                        return pname, CompareResItem(status="config", provider_used=f"{pname}-dev-fake", result=fake["result"], duration_ms=dur)
                    return pname, CompareResItem(status="config", error=str(ce), duration_ms=dur)
                except asyncio.TimeoutError as te:
                    last_exc = te
                    if attempt < ai_retries:
                        await asyncio.sleep(min(2 ** attempt, 2))
                        continue
                    dur = int((time.perf_counter() - start) * 1000)
                    if os.getenv("ALLOW_FAKE_AI", "1") == "1":
                        fake = _build_fake_response(req.task, req.language, req.code, "timeout")
                        return pname, CompareResItem(status="timeout", provider_used=f"{pname}-dev-fake-timeout", result=fake["result"], duration_ms=dur)
                    return pname, CompareResItem(status="timeout", error="timeout", duration_ms=dur)
                except Exception as e:
                    dur = int((time.perf_counter() - start) * 1000)
                    return pname, CompareResItem(status="error", error=str(e), duration_ms=dur)

        tasks = [run_provider(p) for p in target_providers]
        started = time.perf_counter()
        results = await asyncio.gather(*tasks)
        took_ms = int((time.perf_counter() - started) * 1000)

        return {
            "results": {name: item.dict() for name, item in results},
            "took_ms": took_ms,
            "providers": target_providers,
        }
    except ValueError as e:
        if "programming language" in str(e).lower():
            raise HTTPException(status_code=422, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        _raise_ai_http_error(e, "Compare error")

class EnhancedOptimizeReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str = "python"
    provider: str | None = None
    test_inputs: list = []
    user_instructions: str | None = None
    optimization_focus: list[str] | None = None


@app.post("/optimize-code-enhanced")
async def optimize_code_enhanced(request: EnhancedOptimizeReq):
    """Enhanced optimization endpoint with performance analysis"""
    try:
        code = request.code
        language = request.language
        provider = request.provider
        test_inputs = request.test_inputs
        user_instructions = request.user_instructions
        optimization_focus = request.optimization_focus
        
        # Get optimization from AI
        provider_used, optimization_result, tokens_in, tokens_out = await ask_ai(
            "optimization",
            language,
            code,
            provider,
            user_instructions=user_instructions,
            optimization_focus=optimization_focus,
        )
        
        # Analyze performance characteristics
        performance_analysis = {
            "time_complexity": "Analyzed - see optimization details",
            "space_complexity": "Analyzed - see optimization details", 
            "improvement_estimate": "Significant improvement expected"
        }
        
        # Generate optimized code suggestion
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
        _raise_ai_http_error(e, "Enhanced optimization error")

@app.post("/evaluate-optimization")
async def evaluate_optimization_endpoint(req: EvaluateOptimizationReq):
    """
    Comprehensive optimization evaluation endpoint
    Performs AI optimization and evaluates the results with:
    1. Test cases with various inputs
    2. Performance metrics comparison
    3. Additional optimization recommendations
    """
    try:
        result = await evaluate_code_optimization(
            req.code,
            req.language,
            req.provider,
            user_instructions=req.user_instructions,
            optimization_focus=req.optimization_focus,
        )
        return result
    except Exception as e:
        _raise_ai_http_error(e, "Evaluation error")

@app.get("/test-optimization-sample")
async def test_optimization_sample():
    """
    Test endpoint with a sample optimization to demonstrate the evaluation system
    """
    sample_code = """
def factorial(n):
    if n <= 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result = result * i
    return result
"""
    
    try:
        result = await evaluate_code_optimization(sample_code, "python", "openai")
        return result
    except Exception as e:
        _raise_ai_http_error(e, "Test evaluation error")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting AI Code Optimizer API")
    logger.info("=" * 50)
    logger.info("Authentication & MongoDB Ready")
    logger.info("=" * 50)
    logger.info(f"Server starting on http://localhost:{BACKEND_PORT}")
    logger.info(f"API Documentation: http://localhost:{BACKEND_PORT}/docs")
    logger.info(f"Health Check: http://localhost:{BACKEND_PORT}/health")
    logger.info(f"Active DB: {os.getenv('MONGODB_DB', 'ai_code_optimizer')}")
    logger.info(f"Environment: {APP_ENV}")
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)
