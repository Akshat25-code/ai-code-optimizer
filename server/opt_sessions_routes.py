from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, timezone

from mongodb_database import get_database
from mongodb_auth_routes import get_current_user
from fastapi.responses import StreamingResponse
import json

router = APIRouter(prefix="/opt-sessions", tags=["Optimize Sessions"])


class CreateSessionReq(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)
    code: str
    language: str
    task: str = "optimization"
    provider_used: Optional[str] = None
    result: Optional[Any] = None
    tokens_in: Optional[int] = 0
    tokens_out: Optional[int] = 0


class SessionItem(BaseModel):
    id: str
    title: Optional[str]
    language: str
    task: str
    provider_used: Optional[str]
    code: Optional[str] = None
    result: Optional[Any] = None
    created_at: datetime


@router.post("/", response_model=SessionItem, status_code=status.HTTP_201_CREATED)
async def create_session(payload: CreateSessionReq, current_user: dict = Depends(get_current_user)):
    db = get_database()
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": current_user["id"],
        "title": payload.title or None,
        "code": payload.code,
        "language": payload.language,
        "task": payload.task,
        "provider_used": payload.provider_used,
        "result": payload.result,
        "tokens_in": payload.tokens_in or 0,
        "tokens_out": payload.tokens_out or 0,
        "created_at": now,
        "updated_at": now,
    }
    res = await db.optimize_sessions.insert_one(doc)
    return SessionItem(
        id=str(res.inserted_id),
        title=doc["title"],
        language=doc["language"],
        task=doc["task"],
        provider_used=doc["provider_used"],
        code=doc.get("code"),
        result=doc.get("result"),
        created_at=doc["created_at"],
    )


@router.get("/", response_model=List[SessionItem])
async def list_sessions(current_user: dict = Depends(get_current_user), limit: int = 50):
    db = get_database()
    cur = db.optimize_sessions.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(max(1, min(limit, 200)))
    items: List[SessionItem] = []
    async for d in cur:
        items.append(SessionItem(
            id=str(d.get("_id")),
            title=d.get("title"),
            language=d.get("language"),
            task=d.get("task"),
            provider_used=d.get("provider_used"),
            code=d.get("code"),
            result=d.get("result"),
            created_at=d.get("created_at"),
        ))
    return items


@router.get("/{session_id}")
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session id")
    doc = await db.optimize_sessions.find_one({"_id": oid, "user_id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session id")
    res = await db.optimize_sessions.delete_one({"_id": oid, "user_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return None


@router.get("/export")
async def export_sessions(current_user: dict = Depends(get_current_user)):
    """Export all of the user's optimization sessions as a JSON array"""
    db = get_database()
    cur = db.optimize_sessions.find({"user_id": current_user["id"]}).sort("created_at", -1)
    items = []
    async for d in cur:
        d = dict(d)
        if d.get("_id"): d["id"] = str(d.pop("_id"))
        items.append(d)
    data = json.dumps(items, default=str, indent=2).encode("utf-8")
    return StreamingResponse(iter([data]), media_type="application/json", headers={
        "Content-Disposition": "attachment; filename=sessions_export.json"
    })

@router.get("/analytics/stats")
async def get_analytics_stats(current_user: dict = Depends(get_current_user)):
    """Aggregate token usage stats for the user"""
    db = get_database()
    pipeline = [
        {"$match": {"user_id": current_user["id"]}},
        {"$group": {
            "_id": "$provider_used",
            "total_tokens_in": {"$sum": "$tokens_in"},
            "total_tokens_out": {"$sum": "$tokens_out"},
            "session_count": {"$sum": 1}
        }}
    ]
    cursor = db.optimize_sessions.aggregate(pipeline)
    stats = []
    async for d in cursor:
        stats.append({
            "provider": d["_id"] or "unknown",
            "tokens_in": d["total_tokens_in"],
            "tokens_out": d["total_tokens_out"],
            "count": d["session_count"]
        })
    return stats
