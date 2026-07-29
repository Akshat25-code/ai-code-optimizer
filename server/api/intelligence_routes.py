"""Intelligence API routes: verify, repo scan, secrets, tests, reports."""
from __future__ import annotations

import zipfile
import io
import asyncio
import os
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from core.rate_limit import enforce_daily_quota, rate_limit_ai
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from utils.code_utils import extract_code_block

from services.ai.provider_service import ask_ai, ProviderConfigError
from services.analysis.repo_scanner import scan_repository
from services.analysis.repo_importer import read_local_directory, process_imported_repo, compress_file_context
from services.analysis.secret_scanner import redact_secrets, scan_secrets, to_sarif
from services.execution.test_runner import run_pytest
from services.execution.verification_engine import verify_optimization
from services.reports.session_report_service import (
    build_session_report,
    render_html_report,
    render_json_report,
)

router = APIRouter(prefix="/intelligence", tags=["Code Intelligence"])

MAX_CODE_LENGTH = int(os.getenv("MAX_CODE_LENGTH", "50000"))


class SecretScanReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    filename: str = "input.py"


class RedactReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)


class RepoScanReq(BaseModel):
    files: list[dict[str, str]] = Field(..., max_length=500)


class VerifyReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    optimized_code: str | None = Field(default=None, max_length=MAX_CODE_LENGTH)
    language: str = "Python"
    provider: str | None = None
    user_instructions: str | None = None
    optimization_focus: list[str] | None = None
    stdin: str = ""
    timeout_ms: int = 5000
    skip_ai: bool = False


class TestRunReq(BaseModel):
    source_code: str = Field(..., max_length=MAX_CODE_LENGTH)
    test_code: str = Field(..., max_length=MAX_CODE_LENGTH)


class GenerateTestsReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str = "Python"
    provider: str | None = None


class ReportReq(BaseModel):
    title: str = "Code Intelligence Report"
    language: str = "Python"
    task: str = "optimization"
    original_code: str = Field(..., max_length=MAX_CODE_LENGTH)
    optimized_code: str = Field(default="", max_length=MAX_CODE_LENGTH)
    provider_used: str = ""
    inspection: dict | None = None
    verification: dict | None = None
    test_results: dict | None = None
    format: str = "json"



@router.post("/scan-secrets", dependencies=[Depends(rate_limit_ai)])
async def scan_secrets_endpoint(req: SecretScanReq):
    return scan_secrets(req.code, req.filename)


@router.post("/scan-secrets/sarif", dependencies=[Depends(rate_limit_ai)])
async def scan_secrets_sarif_endpoint(req: SecretScanReq):
    """Scan for secrets and return results in SARIF 2.1.0 format."""
    result = scan_secrets(req.code, req.filename)
    sarif = to_sarif(result, req.filename)
    return JSONResponse(content=sarif, media_type="application/sarif+json")


@router.post("/redact-secrets", dependencies=[Depends(rate_limit_ai)])
async def redact_secrets_endpoint(req: RedactReq):
    redacted, count = redact_secrets(req.code)
    return {"redacted_code": redacted, "redaction_count": count}


@router.post("/scan-repo")
async def scan_repo_endpoint(req: RepoScanReq):
    if not req.files:
        raise HTTPException(status_code=400, detail="No files provided")
    return scan_repository(req.files)


@router.post("/verify-optimization", dependencies=[Depends(rate_limit_ai)])
async def verify_optimization_endpoint(req: VerifyReq, request: Request):
    from core.ai_helpers import build_fake_response, format_analyze_response
    from api.execution_routes import _is_code_execution_allowed

    allowed, reason = _is_code_execution_allowed(request)
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Code execution disabled ({reason}). Set ENABLE_CODE_EXECUTION=1.",
        )

    optimized = req.optimized_code or ""
    provider_used = "provided"
    ai_text = ""

    if not req.skip_ai and not optimized.strip():
        try:
            ai_timeout = int(os.getenv("AI_TIMEOUT", "20"))
            provider_used, result, _ti, _to = await asyncio.wait_for(
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
        stdin_text=req.stdin or "",
        timeout_ms=int(req.timeout_ms or 5000),
        provider_used=provider_used,
        ai_result_text=ai_text,
    )
    report["optimized_code"] = optimized
    return report


@router.post("/run-tests")
async def run_tests_endpoint(req: TestRunReq, request: Request):
    from api.execution_routes import _is_code_execution_allowed

    allowed, reason = _is_code_execution_allowed(request)
    if not allowed:
        raise HTTPException(status_code=403, detail=f"Code execution disabled ({reason})")
    return run_pytest(req.source_code, req.test_code)


@router.post(
    "/generate-tests",
    dependencies=[Depends(rate_limit_ai), Depends(enforce_daily_quota)],
)
async def generate_tests_endpoint(req: GenerateTestsReq):
    prompt = f"""Generate pytest unit tests for this {req.language} code.
Output ONLY a Python test file using pytest. Import from module named target.
Use descriptive test names. Cover edge cases.

CODE:
{req.code}
"""
    try:
        provider_used, result, ti, to = await ask_ai(
            "documentation",
            req.language,
            prompt,
            req.provider,
        )
        test_code = extract_code_block(result if isinstance(result, str) else str(result))
        return {
            "provider_used": provider_used,
            "test_code": test_code or str(result),
            "tokens_in": ti,
            "tokens_out": to,
        }
    except ProviderConfigError as e:
        if os.getenv("ALLOW_FAKE_AI", "0") == "1":
            stub = '''import pytest\nfrom target import *\n\ndef test_basic():\n    assert True\n'''
            return {"provider_used": "dev-fake", "test_code": stub, "tokens_in": 0, "tokens_out": 0}
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/report")
async def generate_report_endpoint(req: ReportReq):
    report = build_session_report(
        title=req.title,
        language=req.language,
        task=req.task,
        original_code=req.original_code,
        optimized_code=req.optimized_code,
        provider_used=req.provider_used,
        inspection=req.inspection,
        verification=req.verification,
        test_results=req.test_results,
    )
    fmt = (req.format or "json").lower()
    if fmt == "html":
        return HTMLResponse(render_html_report(report))
    if fmt == "json":
        return JSONResponse(report)
    body = render_json_report(report)
    return StreamingResponse(
        iter([body.encode("utf-8")]),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="report.json"'},
    )


@router.get("/provider-status")
async def provider_status():
    keys = {
        "openai": bool(os.getenv("OPENAI_API_KEY")),
        "anthropic": bool(os.getenv("ANTHROPIC_API_KEY")),
        "google": bool(os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")),
    }
    fake_mode = os.getenv("ALLOW_FAKE_AI", "0") == "1"
    return {
        "providers": keys,
        "any_configured": any(keys.values()),
        "fake_ai_mode": fake_mode,
        "fake_ai_visible": fake_mode and os.getenv("APP_ENV", "development") != "production",
    }


class ImportLocalReq(BaseModel):
    local_path: str = Field(..., description="Absolute path to local directory")
    compress: bool = True

@router.post("/import-repo/local", dependencies=[Depends(rate_limit_ai)])
async def import_local_repo(req: ImportLocalReq):
    if os.getenv("APP_ENV", "development") == "production":
        raise HTTPException(status_code=403, detail="Local repository import is disabled in production environments.")

    if not os.path.isdir(req.local_path):
        raise HTTPException(status_code=400, detail="Invalid directory path")

    files = read_local_directory(req.local_path)
    if not files:
        raise HTTPException(status_code=400, detail="No readable files found in directory (or all ignored)")

    result = process_imported_repo(files, compress=req.compress)
    return result

@router.post("/import-repo/zip", dependencies=[Depends(rate_limit_ai)])
async def import_zip_repo(file: UploadFile = File(...), compress: bool = True):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Must be a .zip file")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="ZIP file exceeds 10MB upload limit")

    files = []
    total_decompressed_size = 0

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            for zip_info in z.infolist():
                if zip_info.is_dir():
                    continue
                # Zip-slip protection
                if ".." in zip_info.filename or zip_info.filename.startswith("/") or zip_info.filename.startswith("\\"):
                    continue
                # basic exclusions
                if any(skip in zip_info.filename for skip in ["node_modules/", ".git/", "__pycache__/"]):
                    continue

                total_decompressed_size += zip_info.file_size
                if total_decompressed_size > 30 * 1024 * 1024:  # 30 MB limit
                    raise HTTPException(status_code=400, detail="Decompressed contents exceed 30MB limit")
                if len(files) >= 1000:
                    raise HTTPException(status_code=400, detail="Too many files in ZIP (max 1000)")

                try:
                    file_content = z.read(zip_info).decode('utf-8')
                    files.append({
                        "path": zip_info.filename,
                        "content": file_content
                    })
                except Exception:
                    pass
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid zip file")

    if not files:
        raise HTTPException(status_code=400, detail="No readable text files found in zip")

    result = process_imported_repo(files, compress=compress)
    return result
