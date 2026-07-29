"""Review Pipeline Routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.auth_routes import get_current_user
from services.analysis.review_pipeline import ReviewPipeline


from core.rate_limit import rate_limit_ai, enforce_daily_quota
from api.auth_routes import get_optional_user

router = APIRouter(prefix="/review", tags=["Review"])


class PipelineReq(BaseModel):
    code: str
    language: str
    skip_ai: bool = False
    session_id: str = Field(None, description="WebSocket session ID for live progress")


@router.post(
    "/pipeline",
    dependencies=[Depends(rate_limit_ai), Depends(enforce_daily_quota)],
)
async def run_pipeline(
    req: PipelineReq,
    current_user: dict | None = Depends(get_optional_user),
):
    """Run the multi-stage review pipeline."""
    try:
        pipeline = ReviewPipeline(session_id=req.session_id)
        report = await pipeline.run(req.code, req.language, skip_ai=req.skip_ai)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
