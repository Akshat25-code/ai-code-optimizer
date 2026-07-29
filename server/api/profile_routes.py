"""
Profile management routes
Endpoints for viewing/updating profile, preferences, password changes,
connected accounts, avatar upload, export, and account deletion.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi import status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import io
import os
import json
import secrets
import shutil
import time

from core.database import get_database, redact_user, serialize_doc
from api.auth_routes import get_current_user
from models.database import MongoUser
from api.auth_routes import normalize_phone
from models.database import MongoPhoneOTP
from core.security import SessionManager, PasswordManager
from services.sms_service import send_sms
from core.config import settings

router = APIRouter(prefix="/profile", tags=["Profile"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[EmailStr] = None
    bio: Optional[str] = Field(default=None, max_length=500)


class LocationUpdate(BaseModel):
    city: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)
    timezone: Optional[str] = Field(default=None, max_length=50)


class ProfessionalUpdate(BaseModel):
    job_title: Optional[str] = Field(default=None, max_length=100)
    company: Optional[str] = Field(default=None, max_length=100)
    experience_level: Optional[str] = Field(default=None, description="Beginner|Intermediate|Advanced|Expert")


class SocialLinksUpdate(BaseModel):
    github: Optional[str] = Field(default=None, max_length=200)
    linkedin: Optional[str] = Field(default=None, max_length=200)
    twitter: Optional[str] = Field(default=None, max_length=200)
    website: Optional[str] = Field(default=None, max_length=200)


class PreferencesUpdate(BaseModel):
    theme: Optional[str] = Field(default=None, description="light|dark|system")
    language: Optional[str] = None
    editor: Optional[Dict[str, Any]] = None
    ai: Optional[Dict[str, Any]] = None
    notifications: Optional[Dict[str, Any]] = None


class ChangePasswordReq(BaseModel):
    current_password: str
    new_password: str


def _avatars_dir() -> str:
    base = os.path.join(os.path.dirname(__file__), "uploads", "avatars")
    os.makedirs(base, exist_ok=True)
    return base


def _calculate_account_age_days(created_at) -> int:
    """Calculate account age in days, handling timezone awareness"""
    if not created_at:
        return 0

    now = datetime.now(timezone.utc)

    # If created_at is naive (no timezone), assume it's UTC
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    # Calculate the difference
    age_delta = now - created_at
    return max(0, age_delta.days)


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    # Calculate profile completion percentage
    completion_fields = [
        current_user.get("name"),
        current_user.get("email"),
        current_user.get("bio"),
        current_user.get("phone"),
        current_user.get("location", {}).get("city"),
        current_user.get("professional", {}).get("job_title"),
        current_user.get("social_links", {}).get("github")
    ]
    completed = sum(1 for field in completion_fields if field)
    completion_percentage = int((completed / len(completion_fields)) * 100)

    return {
        "id": current_user["id"],
        "name": current_user.get("name"),
        "email": current_user.get("email"),
        "bio": current_user.get("bio"),
        "is_verified": current_user.get("is_verified", False),
        "phone": current_user.get("phone"),
        "phone_verified": current_user.get("phone_verified", False),
        "profile_picture": current_user.get("profile_picture"),
        "location": current_user.get("location", {}),
        "professional": current_user.get("professional", {}),
        "social_links": current_user.get("social_links", {}),
        "preferences": current_user.get("preferences", {}),
        "profile_completion": completion_percentage,
        "created_at": current_user.get("created_at"),
        "updated_at": current_user.get("updated_at"),
    }


@router.put("/me")
async def update_me(payload: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    updates: Dict[str, Any] = {}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.bio is not None:
        updates["bio"] = payload.bio.strip()
    if payload.email is not None and payload.email != current_user.get("email"):
        # Ensure email not taken
        existing = await db.users.find_one({"email": str(payload.email)})
        if existing and str(existing.get("_id")) != current_user["id"]:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates["email"] = str(payload.email)
    if not updates:
        return {"message": "No changes"}
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": updates})
    # Return merged view
    return {**current_user, **updates}


# Enhanced Profile Management Endpoints

@router.put("/location")
async def update_location(payload: LocationUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    updates = {}
    if payload.city is not None:
        updates["location.city"] = payload.city.strip()
    if payload.country is not None:
        updates["location.country"] = payload.country.strip()
    if payload.timezone is not None:
        updates["location.timezone"] = payload.timezone.strip()

    if not updates:
        return {"message": "No changes"}

    updates["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": updates})
    return {"message": "Location updated successfully"}


@router.put("/professional")
async def update_professional(payload: ProfessionalUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    updates = {}
    if payload.job_title is not None:
        updates["professional.job_title"] = payload.job_title.strip()
    if payload.company is not None:
        updates["professional.company"] = payload.company.strip()
    if payload.experience_level is not None:
        updates["professional.experience_level"] = payload.experience_level

    if not updates:
        return {"message": "No changes"}

    updates["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": updates})
    return {"message": "Professional info updated successfully"}


@router.put("/social-links")
async def update_social_links(payload: SocialLinksUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    updates = {}

    # Validate URLs if provided
    import re
    url_pattern = re.compile(r'^https?://')

    if payload.github is not None:
        if payload.github and not url_pattern.match(payload.github):
            payload.github = f"https://github.com/{payload.github.strip('/')}"
        updates["social_links.github"] = payload.github

    if payload.linkedin is not None:
        if payload.linkedin and not url_pattern.match(payload.linkedin):
            payload.linkedin = f"https://linkedin.com/in/{payload.linkedin.strip('/')}"
        updates["social_links.linkedin"] = payload.linkedin

    if payload.twitter is not None:
        if payload.twitter and not url_pattern.match(payload.twitter):
            payload.twitter = f"https://twitter.com/{payload.twitter.strip('/')}"
        updates["social_links.twitter"] = payload.twitter

    if payload.website is not None:
        if payload.website and not url_pattern.match(payload.website):
            payload.website = f"https://{payload.website}"
        updates["social_links.website"] = payload.website

    if not updates:
        return {"message": "No changes"}

    updates["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": updates})
    return {"message": "Social links updated successfully"}


# Phone management
class PhoneSetRequest(BaseModel):
    phone: str

class PhoneVerifyRequest(BaseModel):
    phone: str
    otp: str

OTP_CODE_LENGTH = int(os.getenv("OTP_CODE_LENGTH", "6"))
OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "5"))
PHONE_OTP_RATE_WINDOW = int(os.getenv("PHONE_OTP_RATE_WINDOW", "300"))  # seconds
PHONE_OTP_MAX_PER_WINDOW = int(os.getenv("PHONE_OTP_MAX_PER_WINDOW", "5"))
_phone_profile_rate_cache = {}

def _rate_limit_phone(phone: str):
    now = time.time(); window_start = now - PHONE_OTP_RATE_WINDOW
    hist = _phone_profile_rate_cache.get(phone, [])
    hist = [t for t in hist if t >= window_start]
    if len(hist) >= PHONE_OTP_MAX_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Try later")
    hist.append(now)
    _phone_profile_rate_cache[phone] = hist

@router.post("/phone/set")
async def set_phone(payload: PhoneSetRequest, current_user: dict = Depends(get_current_user)):
    phone_norm = normalize_phone(payload.phone)
    if not phone_norm:
        raise HTTPException(status_code=400, detail="Invalid phone format")
    db = get_database()
    existing = await db.users.find_one({"phone": phone_norm})
    if existing and str(existing.get("_id")) != current_user["id"]:
        raise HTTPException(status_code=400, detail="Phone already in use")
    await db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": {"phone": phone_norm, "phone_verified": False, "updated_at": datetime.now(timezone.utc)}})
    # Auto send verification OTP. The plaintext code is only sent over SMS;
    # it is NEVER stored on the server (hash only).
    _rate_limit_phone(phone_norm)
    code = ''.join(secrets.choice('0123456789') for _ in range(OTP_CODE_LENGTH))
    code_hash = SessionManager.hash_token(code)
    await MongoPhoneOTP.create_otp(phone_norm, code_hash, ttl_minutes=OTP_TTL_MINUTES)
    await send_sms(phone_norm, f"Verify your number: {code} (expires in {OTP_TTL_MINUTES}m)")
    return {"message": "Phone set. Verification code sent."}

@router.post("/phone/resend")
async def resend_phone_otp(current_user: dict = Depends(get_current_user)):
    phone_norm = current_user.get("phone")
    if not phone_norm:
        raise HTTPException(status_code=400, detail="No phone set")
    if current_user.get("phone_verified"):
        return {"message": "Phone already verified"}
    _rate_limit_phone(phone_norm)
    code = ''.join(secrets.choice('0123456789') for _ in range(OTP_CODE_LENGTH))
    code_hash = SessionManager.hash_token(code)
    await MongoPhoneOTP.create_otp(phone_norm, code_hash, ttl_minutes=OTP_TTL_MINUTES)
    await send_sms(phone_norm, f"Verify your number: {code} (expires in {OTP_TTL_MINUTES}m)")
    return {"message": "Verification code sent"}

@router.post("/phone/verify")
async def verify_phone(payload: PhoneVerifyRequest, current_user: dict = Depends(get_current_user)):
    phone_norm = normalize_phone(payload.phone)
    if not phone_norm or phone_norm != current_user.get("phone"):
        raise HTTPException(status_code=400, detail="Phone mismatch")
    otp_hash = SessionManager.hash_token(payload.otp)
    ok = await MongoPhoneOTP.verify_otp(phone_norm, otp_hash)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    db = get_database()
    await db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": {"phone_verified": True, "updated_at": datetime.now(timezone.utc)}})
    return {"message": "Phone verified"}


@router.patch("/preferences")
async def update_preferences(payload: PreferencesUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    prefs = current_user.get("preferences", {}) or {}
    incoming = payload.dict(exclude_unset=True)
    # Shallow merge
    prefs.update({k: v for k, v in incoming.items() if v is not None})
    await db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": {"preferences": prefs, "updated_at": datetime.now(timezone.utc)}})
    return {"preferences": prefs}


@router.post("/change-password")
async def change_password(payload: ChangePasswordReq, current_user: dict = Depends(get_current_user)):
    db = get_database()
    # Fetch fresh user to verify hash
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not PasswordManager.verify_password(payload.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password too short")
    new_hash = PasswordManager.hash_password(payload.new_password)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc)}})
    return {"message": "Password updated"}


@router.get("/connected-accounts")
async def list_connected_accounts(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cur = db.oauth_providers.find({"user_id": current_user["id"]})
    items: List[Dict[str, Any]] = []
    async for d in cur:
        items.append({
            "provider": d.get("provider"),
            "linked_at": d.get("created_at"),
        })
    return {"accounts": items}


@router.delete("/connected-accounts/{provider}")
async def unlink_connected_account(provider: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    res = await db.oauth_providers.delete_one({"user_id": current_user["id"], "provider": provider})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Provider link not found")
    return {"message": "Provider unlinked"}


@router.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Lazy import Pillow to avoid hard dependency; we fall back gracefully if missing
    PIL_available = False
    try:
        from PIL import Image  # type: ignore
        PIL_available = True
    except Exception:
        PIL_available = False
    # Basic type + size validation
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    max_size = 2 * 1024 * 1024  # 2MB
    # Peek at size by reading content into memory up to max
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="Image too large (max 2MB)")

    # Determine extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".png", ".jpg", ".jpeg", ".webp"}:
        ext = ".png"
    filename = f"{current_user['id']}{ext}"
    dest_dir = _avatars_dir()
    dest_path = os.path.join(dest_dir, filename)

    # Downscale/thumbnail if Pillow is available
    if PIL_available:
        try:
            from io import BytesIO
            im = Image.open(BytesIO(contents))
            im = im.convert('RGB')
            im.thumbnail((256, 256))
            im.save(dest_path, format='PNG', optimize=True)
        except Exception:
            # Fallback to raw save
            with open(dest_path, 'wb') as out:
                out.write(contents)
    else:
        with open(dest_path, 'wb') as out:
            out.write(contents)

    public_path = f"/uploads/avatars/{filename}"
    db = get_database()
    await db.users.update_one({"_id": ObjectId(current_user["id"])}, {"$set": {"profile_picture": public_path, "updated_at": datetime.now(timezone.utc)}})
    return {"profile_picture": public_path}


# Login History and Analytics

@router.get("/login-history")
async def get_login_history(current_user: dict = Depends(get_current_user), limit: int = 20):
    db = get_database()
    cursor = db.login_history.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(min(limit, 100))
    history = []
    async for record in cursor:
        history.append({
            "id": str(record["_id"]),
            "ip_address": record.get("ip_address"),
            "user_agent": record.get("user_agent"),
            "device_info": record.get("device_info", {}),
            "location_info": record.get("location_info", {}),
            "success": record.get("success", True),
            "created_at": record.get("created_at")
        })
    return {"login_history": history}


@router.get("/analytics")
async def get_user_analytics(current_user: dict = Depends(get_current_user)):
    db = get_database()

    # Get user analytics record
    analytics = await db.user_analytics.find_one({"user_id": current_user["id"]})
    if not analytics:
        # Create initial analytics record
        initial_analytics = {
            "user_id": current_user["id"],
            "total_sessions": 0,
            "total_optimizations": 0,
            "languages_used": {},
            "ai_providers_used": {},
            "monthly_usage": {},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.user_analytics.insert_one(initial_analytics)
        analytics = initial_analytics

    # Get recent sessions count
    recent_sessions = await db.optimize_sessions.count_documents({
        "user_id": current_user["id"],
        "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=30)}
    })

    # Get total sessions count
    total_sessions = await db.optimize_sessions.count_documents({"user_id": current_user["id"]})

    return {
        "total_sessions": total_sessions,
        "recent_sessions": recent_sessions,
        "total_optimizations": analytics.get("total_optimizations", 0),
        "languages_used": analytics.get("languages_used", {}),
        "ai_providers_used": analytics.get("ai_providers_used", {}),
        "monthly_usage": analytics.get("monthly_usage", {}),
        "profile_completion": 0,  # Will be calculated in /me endpoint
        "account_age_days": _calculate_account_age_days(current_user.get("created_at")),
        "last_active": analytics.get("updated_at")
    }


@router.get("/active-sessions")
async def get_active_sessions(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_database()
    # The "current" indicator needs the requester's session_id. We accept it
    # as a header because httpOnly cookies are not readable from JS.
    current_sid = request.headers.get("X-Session-Id")
    cursor = db.user_sessions.find({
        "user_id": current_user["id"],
        "is_active": True,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    }).sort("created_at", -1)

    sessions = []
    async for session in cursor:
        sessions.append({
            "id": str(session["_id"]),
            "session_id": session.get("session_id"),
            "device_info": session.get("device_info", {}),
            "ip_address": session.get("ip_address"),
            "user_agent": session.get("user_agent"),
            "location": session.get("location", {}),
            "current": bool(current_sid) and session.get("session_id") == current_sid,
            "created_at": session.get("created_at"),
            "last_activity": session.get("last_accessed_at"),
            "expires_at": session.get("expires_at")
        })

    return {"active_sessions": sessions}


@router.delete("/active-sessions/{session_id}")
async def terminate_session(session_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    result = await db.user_sessions.update_one(
        {"_id": ObjectId(session_id), "user_id": current_user["id"]},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session terminated successfully"}


@router.get("/export")
async def export_profile(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Remove sensitive fields
    user_export = {
        "id": str(user.get("_id")),
        "name": user.get("name"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "phone_verified": user.get("phone_verified", False),
        "preferences": user.get("preferences", {}),
        "profile_picture": user.get("profile_picture"),
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }
    buf = io.BytesIO(json.dumps(user_export, default=str, indent=2).encode("utf-8"))
    filename = f"profile_export_{current_user['id']}.json"
    return StreamingResponse(buf, media_type="application/json", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/export-pdf")
async def export_profile_pdf(current_user: dict = Depends(get_current_user)):
    """Export comprehensive user data as a beautifully formatted PDF"""
    from services.reports.pdf_report_service import pdf_export_service

    db = get_database()

    # Gather all user data
    try:
        # 1. User basic data
        user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Redact all sensitive fields from the user document before passing it
        # to the PDF generator. This prevents accidental leaks of password_hash,
        # OAuth tokens, password-reset tokens, etc. into a downloadable file.
        safe_user = redact_user(serialize_doc(dict(user))) or {}

        # 2. Profile data (enhanced profile fields)
        profile_data = {
            "bio": user.get("bio"),
            "location": user.get("location", {}),
            "professional": user.get("professional", {}),
            "social_links": user.get("social_links", {})
        }

        # 3. Sessions data
        sessions_cursor = db.optimize_sessions.find({"user_id": current_user["id"]}).sort("created_at", -1)
        sessions_data = []
        async for session in sessions_cursor:
            session_dict = dict(session)
            session_dict["id"] = str(session_dict.pop("_id"))
            sessions_data.append(session_dict)

        # 4. Analytics data
        analytics = await db.user_analytics.find_one({"user_id": current_user["id"]})
        if not analytics:
            analytics = {
                "total_sessions": 0,
                "recent_sessions": 0,
                "total_optimizations": 0,
                "languages_used": {},
                "ai_providers_used": {},
                "account_age_days": 0,
                "profile_completion": 0
            }

        # Calculate recent sessions
        recent_sessions = await db.optimize_sessions.count_documents({
            "user_id": current_user["id"],
            "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=30)}
        })
        analytics["recent_sessions"] = recent_sessions

        # Calculate account age
        if user.get("created_at"):
            account_age = (datetime.now(timezone.utc) - user["created_at"]).days
            analytics["account_age_days"] = account_age

        # 5. Login history
        login_cursor = db.login_history.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(20)
        login_history = []
        async for record in login_cursor:
            login_dict = dict(record)
            login_dict["id"] = str(login_dict.pop("_id"))
            login_history.append(login_dict)

        # 6. Active sessions â€” strip token hashes
        active_cursor = db.user_sessions.find({
            "user_id": current_user["id"],
            "is_active": True,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        }).sort("created_at", -1)
        active_sessions = []
        async for session in active_cursor:
            session_dict = dict(session)
            session_dict["id"] = str(session_dict.pop("_id"))
            for k in ("access_token_hash", "refresh_token_hash"):
                session_dict.pop(k, None)
            active_sessions.append(session_dict)

        # Generate PDF using the redacted user document
        pdf_buffer = pdf_export_service.generate_comprehensive_export(
            user_data=safe_user,
            profile_data=profile_data,
            sessions_data=sessions_data,
            analytics_data=analytics,
            login_history=login_history,
            active_sessions=active_sessions
        )

        # Return PDF
        filename = f"ai_code_optimizer_export_{current_user['id']}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        print(f"PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF export: {str(e)}")


@router.get("/export-pdf-demo")
async def export_demo_pdf():
    """Generate a demo PDF export for testing purposes"""
    from services.reports.pdf_report_service import pdf_export_service

    # Sample demo data
    demo_user_data = {
        "name": "Demo User",
        "email": "demo@example.com",
        "phone": "+1234567890",
        "phone_verified": True,
        "created_at": datetime.now(timezone.utc) - timedelta(days=30),
        "updated_at": datetime.now(timezone.utc)
    }

    demo_profile_data = {
        "bio": "Full-stack developer passionate about AI and code optimization",
        "location": {
            "city": "San Francisco",
            "country": "USA",
            "timezone": "America/Los_Angeles"
        },
        "professional": {
            "job_title": "Senior Software Engineer",
            "company": "TechCorp Inc.",
            "experience_level": "Advanced"
        },
        "social_links": {
            "github": "https://github.com/demo-user",
            "linkedin": "https://linkedin.com/in/demo-user"
        }
    }

    demo_sessions_data = [
        {
            "id": "1",
            "title": "Optimize Python sorting algorithm",
            "language": "python",
            "task": "optimization",
            "provider_used": "openai",
            "code": "def sort_list(arr):\n    return sorted(arr)",
            "result": "Optimized using Timsort algorithm for better performance",
            "created_at": datetime.now(timezone.utc) - timedelta(days=5)
        },
        {
            "id": "2",
            "title": "Improve JavaScript function",
            "language": "javascript",
            "task": "analysis",
            "provider_used": "claude",
            "code": "function fibonacci(n) { if(n<=1) return n; return fibonacci(n-1)+fibonacci(n-2); }",
            "result": "Added memoization to reduce time complexity from O(2^n) to O(n)",
            "created_at": datetime.now(timezone.utc) - timedelta(days=2)
        }
    ]

    demo_analytics_data = {
        "total_sessions": 15,
        "recent_sessions": 8,
        "total_optimizations": 12,
        "languages_used": {"python": 8, "javascript": 4, "java": 2, "cpp": 1},
        "ai_providers_used": {"openai": 10, "claude": 5},
        "account_age_days": 30,
        "profile_completion": 85
    }

    demo_login_history = [
        {
            "id": "1",
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0 Chrome/91.0",
            "device_info": {"device": "Chrome on Windows"},
            "location_info": {"city": "San Francisco", "country": "USA"},
            "success": True,
            "created_at": datetime.now(timezone.utc) - timedelta(hours=2)
        }
    ]

    demo_active_sessions = [
        {
            "id": "1",
            "device_info": {"device": "Chrome on Windows"},
            "ip_address": "192.168.1.100",
            "location": {"city": "San Francisco", "country": "USA"},
            "current": True,
            "created_at": datetime.now(timezone.utc) - timedelta(hours=2),
            "last_activity": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7)
        }
    ]

    try:
        # Generate demo PDF
        pdf_buffer = pdf_export_service.generate_comprehensive_export(
            user_data=demo_user_data,
            profile_data=demo_profile_data,
            sessions_data=demo_sessions_data,
            analytics_data=demo_analytics_data,
            login_history=demo_login_history,
            active_sessions=demo_active_sessions
        )

        # Return PDF
        filename = f"demo_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        print(f"Demo PDF Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate demo PDF: {str(e)}")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["id"]
    # Cascade-delete every collection that references this user. Each delete
    # is independent so a missing collection (e.g. user_analytics has not
    # been written yet) does not block the rest.
    cascade_targets = [
        ("user_sessions", {"user_id": user_id}),
        ("oauth_providers", {"user_id": user_id}),
        ("password_reset_tokens", {"user_id": user_id}),
        ("phone_login_otps", {"phone": current_user.get("phone")}) if current_user.get("phone") else None,
        ("email_verification_tokens", {"user_id": user_id}),
        ("login_history", {"user_id": user_id}),
        ("user_analytics", {"user_id": user_id}),
        ("optimize_sessions", {"user_id": user_id}),
        ("oauth_oauth_audit", {"user_id": user_id}),
    ]
    for entry in cascade_targets:
        if entry is None:
            continue
        collection, query = entry
        try:
            await db[collection].delete_many(query)
        except Exception:
            # Collection may not exist yet; ignore.
            pass
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return None
