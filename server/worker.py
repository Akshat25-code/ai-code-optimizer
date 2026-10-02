# worker.py — isolated code-execution worker.
#
# Runs UNTRUSTED code; never handles auth, billing, or user data beyond the
# snippet itself. Deploy as its own container with the docker socket mounted
# and NO published ports (see docker-compose.yml `executor` service).
# The API container calls it over the compose network when EXECUTOR_URL set.
from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

EXECUTOR_API_KEY = os.getenv("EXECUTOR_API_KEY", "")

app = FastAPI(title="AI Code Optimizer Executor", version="0.1.0")


def _require_key(provided: str | None) -> None:
    """Shared-secret auth between API and worker. Missing server-side key
    refuses boot (see bottom); wrong client key gets 401."""
    import secrets as _secrets

    if not EXECUTOR_API_KEY:
        raise HTTPException(status_code=503, detail="Executor not configured")
    if not provided or not _secrets.compare_digest(provided, EXECUTOR_API_KEY):
        raise HTTPException(status_code=401, detail="Bad executor key")


class ExecuteReq(BaseModel):
    code: str = Field(..., max_length=200000)
    language: str = "python"
    stdin_text: str = ""
    timeout_ms: int = Field(default=5000, le=30000)
    raw: bool = False


class ProfileReq(BaseModel):
    code: str = Field(..., max_length=200000)
    language: str = "python"
    timeout_ms: int = Field(default=10000, le=30000)


@app.get("/health")
async def health():
    from services.execution.docker_runner import should_use_docker
    return {"status": "ok", "docker": should_use_docker()}


@app.post("/execute")
async def execute(req: ExecuteReq, x_executor_key: str | None = Header(default=None)):
    _require_key(x_executor_key)
    from services.execution.docker_runner import should_use_docker
    if not should_use_docker():
        raise HTTPException(
            status_code=503,
            detail="Docker sandbox unavailable on executor; refusing to run.",
        )
    from services.execution.sandbox_runner import run_code, to_dict
    try:
        result = run_code(req.code, req.language, stdin_text=req.stdin_text,
                          timeout_ms=req.timeout_ms, raw=req.raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")
    return to_dict(result)


@app.post("/profile")
async def profile(req: ProfileReq, x_executor_key: str | None = Header(default=None)):
    _require_key(x_executor_key)
    from services.execution.docker_runner import should_use_docker
    if not should_use_docker():
        raise HTTPException(
            status_code=503,
            detail="Docker sandbox unavailable on executor; refusing to run.",
        )
    from services.execution.performance_profiler import profile_code
    try:
        return profile_code(req.code, req.language, timeout_ms=req.timeout_ms)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profiling failed: {e}")


if __name__ == "__main__":
    import uvicorn

    if not EXECUTOR_API_KEY and os.getenv("APP_ENV", "development").lower() not in ("development", "testing"):
        raise RuntimeError("EXECUTOR_API_KEY is required outside dev/test")
    port = int(os.getenv("EXECUTOR_PORT", "8002"))
    uvicorn.run(app, host="127.0.0.1", port=port)
