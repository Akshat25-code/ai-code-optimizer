"""Analytics & Quality Tracking API Routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from api.auth_routes import get_current_user
from core.database import get_database
from services.analysis.analytics_engine import (
    compute_quality_score,
    estimate_tech_debt,
    trend,
    diff_snapshots,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/trends")
async def get_trends(
    range: str = Query("30d", pattern=r"^\d+d$"),
    user=Depends(get_current_user),
):
    """Get quality score trend over time."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    days = int(range.replace("d", ""))

    cursor = db.quality_snapshots.find(
        {"user_id": str(user["_id"])},
        {"score": 1, "ts": 1, "_id": 0},
    ).sort("ts", -1).limit(500)

    snapshots = await cursor.to_list(length=500)
    result = trend(snapshots, days=days)
    return result


@router.get("/debt")
async def get_tech_debt(user=Depends(get_current_user)):
    """Get the latest tech-debt estimate."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    latest = await db.quality_snapshots.find_one(
        {"user_id": str(user["_id"])},
        sort=[("ts", -1)],
    )

    if not latest:
        return {"total_hours": 0, "by_category": {"complexity": 0, "security": 0, "rules": 0, "testing": 0}}

    # Re-estimate from the stored metrics
    mock_report = {
        "summary": latest.get("metrics", {}),
        "rule_violations": [{"severity": "Medium"}] * latest.get("metrics", {}).get("violations_count", 0),
        "compliance_score": latest.get("metrics", {}).get("compliance_score", 100),
        "proof_badges": [],
    }
    return estimate_tech_debt(mock_report)


@router.get("/compare")
async def compare_snapshots(
    from_id: str = Query(..., alias="from"),
    to_id: str = Query(..., alias="to"),
    user=Depends(get_current_user),
):
    """Compare two quality snapshots."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    from bson import ObjectId

    try:
        snap_a = await db.quality_snapshots.find_one({"_id": ObjectId(from_id), "user_id": str(user["_id"])})
        snap_b = await db.quality_snapshots.find_one({"_id": ObjectId(to_id), "user_id": str(user["_id"])})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid snapshot IDs")

    if not snap_a or not snap_b:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    return diff_snapshots(snap_a, snap_b)


@router.get("/leaderboard")
async def get_leaderboard(user=Depends(get_current_user)):
    """Get top quality scores (anonymized)."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    pipeline = [
        {"$sort": {"ts": -1}},
        {"$group": {"_id": "$user_id", "latest_score": {"$first": "$score"}, "latest_ts": {"$first": "$ts"}}},
        {"$sort": {"latest_score": -1}},
        {"$limit": 20},
        {"$project": {"_id": 0, "user_id": "$_id", "score": "$latest_score", "ts": "$latest_ts"}},
    ]

    results = await db.quality_snapshots.aggregate(pipeline).to_list(length=20)
    # Anonymize user IDs
    for i, r in enumerate(results):
        r["rank"] = i + 1
        r["user_id"] = f"dev-{r['user_id'][-4:]}" if r.get("user_id") else f"dev-{i}"

    return {"leaderboard": results}


@router.get("/history")
async def get_history(
    limit: int = Query(20, le=100),
    user=Depends(get_current_user),
):
    """Get recent quality snapshots for the user."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    cursor = db.quality_snapshots.find(
        {"user_id": str(user["_id"])},
    ).sort("ts", -1).limit(limit)

    snapshots = await cursor.to_list(length=limit)

    # Serialize ObjectIds
    for s in snapshots:
        s["_id"] = str(s["_id"])

    return {"snapshots": snapshots}
