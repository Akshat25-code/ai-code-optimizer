"""Profile Service logic module.
Contains helper methods for profile completion calculations, user detail updates,
avatar directory resolution, and account age calculations.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from bson import ObjectId
from fastapi import HTTPException

from core.database import get_database


def get_avatars_dir() -> str:
    """Resolve and create local avatars storage directory."""
    base = os.path.join(os.path.dirname(__file__), "..", "uploads", "avatars")
    os.makedirs(base, exist_ok=True)
    return base


def calculate_account_age_days(created_at: Optional[datetime]) -> int:
    """Calculate account age in days handling timezone awareness."""
    if not created_at:
        return 0
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_delta = now - created_at
    return max(0, age_delta.days)


def calculate_profile_completion(user: dict) -> int:
    """Calculate profile completion percentage based on filled user profile fields."""
    completion_fields = [
        user.get("name"),
        user.get("email"),
        user.get("bio"),
        user.get("phone"),
        user.get("location", {}).get("city"),
        user.get("professional", {}).get("job_title"),
        user.get("social_links", {}).get("github"),
    ]
    completed = sum(1 for field in completion_fields if field)
    return int((completed / len(completion_fields)) * 100)


async def update_user_fields(user_id: str, updates: Dict[str, Any]) -> dict:
    """Update fields in MongoDB users collection and return updated dict."""
    if not updates:
        return {"message": "No changes"}

    db = get_database()
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    return {"message": "Updated successfully", "updates": updates}
