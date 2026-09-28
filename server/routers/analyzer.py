"""DEPRECATED — single routing convention is server/api/*.

This module is kept as a thin shim so any stale imports fail loudly with
guidance instead of silently diverging. Do not add new routes here;
use server/api/analysis_routes.py (canonical: /analyze-code, /inspect-code).
"""
import warnings

warnings.warn(
    "server.routers.analyzer is deprecated; use server.api.analysis_routes instead.",
    DeprecationWarning,
    stacklevel=2,
)

from fastapi import APIRouter
from models.request_models import CodeRequest
from models.response_models import AIResponse
from services.ai_engine import process_code_with_ai

router = APIRouter(
    deprecated=True,
    tags=["deprecated-analyzer"],
)


@router.post("/analyze", response_model=AIResponse, deprecated=True)
async def analyze_code(req: CodeRequest):
    result = await process_code_with_ai(req.code, mode="analyze")
    return {"output": result}


@router.post("/optimize", response_model=AIResponse, deprecated=True)
async def optimize_code(req: CodeRequest):
    result = await process_code_with_ai(req.code, mode="optimize")
    return {"output": result}
