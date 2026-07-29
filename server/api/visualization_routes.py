"""Algorithm visualization and tracing routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.execution.step_executor import StepExecutor
from api.execution_routes import _is_code_execution_allowed

router = APIRouter(prefix="/sandbox", tags=["Visualization"])


class TraceReq(BaseModel):
    code: str = Field(..., max_length=50000)
    timeout_ms: int = Field(default=8000, le=30000)


@router.post("/trace")
async def trace_algorithm(req: TraceReq, request: Request):
    """Trace code execution step-by-step for visualization."""
    allowed, reason = _is_code_execution_allowed(request)
    if not allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Code execution disabled ({reason}). Set ENABLE_CODE_EXECUTION=1."
        )

    # Currently only python is supported for tracing
    result = StepExecutor.trace(req.code, timeout_ms=req.timeout_ms)

    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result["error"])

    return result
