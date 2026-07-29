"""Team Collaboration & Workspace Routes."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from bson import ObjectId

from api.auth_routes import get_current_user
from core.database import get_database

router = APIRouter(prefix="/teams", tags=["Teams"])


class CreateTeamReq(BaseModel):
    name: str

class InviteUserReq(BaseModel):
    email: str
    role: str = "viewer"  # owner, editor, viewer

class ShareSessionReq(BaseModel):
    session_id: str
    expires_in_hours: int = 24
    read_only: bool = True
    snapshot_data: dict  # Code and config at the time of sharing


@router.post("/")
async def create_team(req: CreateTeamReq, user=Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    team_doc = {
        "name": req.name,
        "owner_id": str(user["_id"]),
        "members": [
            {"user_id": str(user["_id"]), "role": "owner", "email": user.get("email")}
        ],
        "created_at": datetime.now(timezone.utc),
    }

    res = await db.teams.insert_one(team_doc)
    return {"team_id": str(res.inserted_id), "name": req.name}


@router.post("/{team_id}/invite")
async def invite_to_team(team_id: str, req: InviteUserReq, user=Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    team = await db.teams.find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Only owners can invite
    is_owner = any(m["user_id"] == str(user["_id"]) and m["role"] == "owner" for m in team.get("members", []))
    if not is_owner:
        raise HTTPException(status_code=403, detail="Only owners can invite members")

    # Find user by email
    invitee = await db.users.find_one({"email": req.email})
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")

    invitee_id = str(invitee["_id"])

    # Check if already in team
    if any(m["user_id"] == invitee_id for m in team.get("members", [])):
        raise HTTPException(status_code=400, detail="User already in team")

    await db.teams.update_one(
        {"_id": ObjectId(team_id)},
        {"$push": {"members": {"user_id": invitee_id, "role": req.role, "email": req.email}}}
    )

    return {"status": "invited", "email": req.email, "role": req.role}


@router.get("/{team_id}/analytics")
async def get_team_analytics(team_id: str, user=Depends(get_current_user)):
    """Fetch aggregated team quality metrics (combining all members)."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    team = await db.teams.find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Verify membership
    if not any(m["user_id"] == str(user["_id"]) for m in team.get("members", [])):
        raise HTTPException(status_code=403, detail="Not a team member")

    member_ids = [m["user_id"] for m in team.get("members", [])]

    # Aggregate quality snapshots for these members
    pipeline = [
        {"$match": {"user_id": {"$in": member_ids}}},
        {"$sort": {"ts": -1}},
        {"$group": {
            "_id": "$user_id",
            "latest_score": {"$first": "$score"},
            "latest_debt": {"$first": "$tech_debt_hours"}
        }},
        {"$group": {
            "_id": None,
            "avg_score": {"$avg": "$latest_score"},
            "total_debt": {"$sum": "$latest_debt"}
        }}
    ]

    results = await db.quality_snapshots.aggregate(pipeline).to_list(length=1)
    if not results:
        return {"avg_score": 0, "total_debt": 0}

    return {
        "avg_score": round(results[0]["avg_score"], 1),
        "total_debt": round(results[0]["total_debt"], 1)
    }


# Share endpoints (separated visually)
share_router = APIRouter(prefix="/share", tags=["Share"])

@share_router.post("/")
async def create_share_link(req: ShareSessionReq, user=Depends(get_current_user)):
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Generate an unguessable token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=req.expires_in_hours)

    doc = {
        "token": token,
        "session_id": req.session_id,
        "owner_id": str(user["_id"]),
        "read_only": req.read_only,
        "snapshot_data": req.snapshot_data,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    }

    await db.shared_sessions.insert_one(doc)
    return {"token": token, "expires_at": expires_at.isoformat()}


@share_router.get("/{token}")
async def get_shared_session(token: str):
    """Unauthenticated read-only endpoint for shared snapshots."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Find the token
    doc = await db.shared_sessions.find_one({"token": token})
    if not doc:
        raise HTTPException(status_code=404, detail="Invalid share token")

    # Check expiry
    expires_at = doc.get("expires_at")
    if expires_at:
        # handle offset-naive vs aware
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=410, detail="Share link has expired")

    # Strip out sensitive backend metadata, only return exactly what they need
    return {
        "session_id": doc["session_id"],
        "read_only": doc["read_only"],
        "snapshot_data": doc["snapshot_data"],
        "expires_at": doc.get("expires_at")
    }

router.include_router(share_router)
