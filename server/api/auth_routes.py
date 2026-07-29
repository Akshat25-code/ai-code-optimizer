"""
MongoDB Authentication API Routes
FastAPI endpoints using MongoDB with cookie-based session + JWT.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import time
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from core.security import (
    JWTManager,
    PasswordManager,
    SessionManager,
    create_tokens_for_user,
    extract_user_from_token,
)
from core.database import get_database, get_object_id
from models.database import (
    MongoPasswordResetToken,
    MongoPhoneOTP,
    MongoUser,
    MongoUserSession,
    authenticate_user,
    create_user_session,
)
from security.csrf import CSRF_COOKIE, CSRF_HEADER, issue_csrf_token, verify_csrf
from services.sms_service import (
    USE_TWILIO_VERIFY,
    check_phone_verification,
    send_sms,
    start_phone_verification,
)
from services.email_service import send_password_reset_email, send_welcome_email

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

OTP_CODE_LENGTH = int(os.getenv("OTP_CODE_LENGTH", "6"))
OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "5"))
OTP_REQUEST_WINDOW_SEC = int(os.getenv("OTP_REQUEST_WINDOW_SEC", "60"))
OTP_REQUEST_MAX_PER_WINDOW = int(os.getenv("OTP_REQUEST_MAX_PER_WINDOW", "3"))
PHONE_LOGIN_ENABLED = os.getenv("ENABLE_PHONE_LOGIN", "0") == "1"

# In-memory rate limiter (single-process). Use Redis in multi-worker.
_otp_rate_cache: dict = {}
_otp_login_tickets: dict = {}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class UserRegistration(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "password": "securepassword123",
            }
        }


class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    otp: Optional[str] = None
    name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user: dict


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    is_verified: bool
    created_at: datetime


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------
ACCESS_COOKIE = "aco_access"
REFRESH_COOKIE = "aco_refresh"
COOKIE_SECURE = os.getenv("APP_ENV", "development").lower() == "production"
COOKIE_SAMESITE = "lax"
ACCESS_COOKIE_MAX_AGE = 60 * 30  # 30 min
REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


def _set_auth_cookies(response, access_token: str, refresh_token: str):
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        max_age=ACCESS_COOKIE_MAX_AGE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )
    # CSRF cookie is NOT httponly â€” JS must read it.
    csrf = issue_csrf_token()
    response.set_cookie(
        key=CSRF_COOKIE,
        value=csrf,
        max_age=ACCESS_COOKIE_MAX_AGE,
        httponly=False,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )


def _clear_auth_cookies(response):
    for name in (ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE):
        response.delete_cookie(name, path="/")


def _extract_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """Accept token via Authorization header OR httpOnly cookie."""
    if credentials and credentials.credentials:
        return credentials.credentials
    return request.cookies.get(ACCESS_COOKIE)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def validate_password(password: str) -> bool:
    if len(password) < 8:
        return False
    if not re.search(r"[A-Za-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    return True


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------
async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db=Depends(get_database),
):
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    # Enforce CSRF for cookie-based auth on unsafe methods.
    if request.cookies.get(ACCESS_COOKIE):
        verify_csrf(request)

    user_data = extract_user_from_token(token)
    if not user_data or not user_data.get("id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = await MongoUser.find_user_by_id(str(user_data["id"]))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db=Depends(get_database),
):
    """Like get_current_user but returns None for anonymous requests."""
    token = _extract_token(request, credentials)
    if not token:
        return None
    try:
        if request.cookies.get(ACCESS_COOKIE):
            verify_csrf(request)
        user_data = extract_user_from_token(token)
        if not user_data or not user_data.get("id"):
            return None
        return await MongoUser.find_user_by_id(str(user_data["id"]))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Registration / Login / Logout
# ---------------------------------------------------------------------------
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegistration, request: Request, response: Response, db=Depends(get_database)):
    if not validate_password(user_data.password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters with letters and numbers")

    if await MongoUser.find_user_by_email(user_data.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = PasswordManager.hash_password(user_data.password)
    phone_norm = None
    if user_data.phone:
        phone_norm = normalize_phone(user_data.phone)
        if not phone_norm:
            raise HTTPException(status_code=400, detail="Invalid phone format. Use +countrycode number")
        if await MongoUser.find_user_by_phone(phone_norm):
            raise HTTPException(status_code=400, detail="Phone already registered")

    new_user_data = {
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": hashed_password,
        "phone": phone_norm,
    }
    new_user = await MongoUser.create_user(new_user_data)

    tokens = create_tokens_for_user(new_user["id"], new_user["email"], new_user["name"])
    await create_user_session(
        user_id=new_user["id"],
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])
    # Fire-and-forget welcome email
    import asyncio
    asyncio.ensure_future(send_welcome_email(new_user["email"], new_user["name"]))
    return TokenResponse(
        **tokens,
        user={
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "is_verified": new_user.get("is_verified", False),
            "phone_verified": False,
        },
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, request: Request, response: Response, db=Depends(get_database)):
    login_identifier = None
    user = None
    auth_debug = os.getenv("DEV_AUTH_DEBUG") == "1"
    fail_reason = None
    REQUIRE_PW = os.getenv("PHONE_LOGIN_REQUIRE_PASSWORD", "1") == "1"

    if user_data.email:
        user = await authenticate_user(user_data.email, user_data.password)
        login_identifier = user_data.email
    elif user_data.phone:
        if not PHONE_LOGIN_ENABLED:
            raise HTTPException(status_code=404, detail="Phone login is disabled")
        phone_norm = normalize_phone(user_data.phone)
        if not phone_norm:
            raise HTTPException(status_code=400, detail="Invalid phone format. Use E.164 like +15551234567")
        user = await MongoUser.find_user_by_phone(phone_norm)
        login_identifier = phone_norm
        if not user_data.otp:
            raise HTTPException(status_code=400, detail="OTP required for phone login")
        otp_hash = SessionManager.hash_token(user_data.otp)
        ticket = _otp_login_tickets.get(phone_norm)
        valid = None
        if ticket and ticket.get("exp", 0) >= time.time() and ticket.get("otp_hash") == otp_hash:
            valid = True
            _otp_login_tickets.pop(phone_norm, None)
        db_local = get_database()
        local_record = None if valid is True else await db_local.phone_login_otps.find_one(
            {"phone": phone_norm, "expires_at": {"$gt": datetime.now(timezone.utc)}}
        )
        if valid is not True and local_record:
            existing = await db_local.phone_login_otps.find_one(
                {
                    "phone": phone_norm,
                    "code_hash": otp_hash,
                    "expires_at": {"$gt": datetime.now(timezone.utc)},
                    "verified": True,
                }
            )
            if existing:
                valid = True
                await db_local.phone_login_otps.delete_one({"_id": existing["_id"]})
            else:
                valid = await MongoPhoneOTP.verify_otp(phone_norm, otp_hash)
                if valid:
                    await db_local.phone_login_otps.delete_many({"phone": phone_norm, "code_hash": otp_hash})
        elif valid is not True and USE_TWILIO_VERIFY:
            valid = await check_phone_verification(phone_norm, user_data.otp)
        if not valid:
            if auth_debug:
                raise HTTPException(status_code=400, detail="Invalid or expired OTP (otp_invalid)")
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

        if user:
            if REQUIRE_PW:
                if not user_data.password:
                    raise HTTPException(status_code=400, detail="Password required for phone login")
                if not PasswordManager.verify_password(user_data.password, user["password_hash"]):
                    fail_reason = "wrong_password"
                    raise HTTPException(status_code=401, detail=("Invalid credentials (wrong_password)" if auth_debug else "Invalid credentials"))
        else:
            if not user_data.name:
                raise HTTPException(status_code=400, detail="Name required to create account")
            if REQUIRE_PW and not user_data.password:
                raise HTTPException(status_code=400, detail="Password required to create account")
            if REQUIRE_PW and not validate_password(user_data.password or ""):
                raise HTTPException(status_code=400, detail="Password must be at least 8 characters with letters and numbers")
            hashed_password = PasswordManager.hash_password(user_data.password or "")
            try:
                created = await MongoUser.create_user(
                    {
                        "name": user_data.name,
                        "email": None,
                        "password_hash": hashed_password,
                        "phone": phone_norm,
                    }
                )
                user = created
                dbx = get_database()
                await dbx.users.update_one({"_id": get_object_id(user["id"])}, {"$set": {"phone_verified": True}})
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))
    else:
        raise HTTPException(status_code=400, detail="Provide email or phone for login")

    if not user:
        detail = "Invalid credentials"
        if auth_debug and fail_reason:
            detail = f"Invalid credentials ({fail_reason})"
        raise HTTPException(status_code=401, detail=detail)

    await MongoUser.update_last_login(user["id"])
    if user_data.phone and user_data.otp:
        db = get_database()
        await db.users.update_one({"_id": get_object_id(user["id"])}, {"$set": {"phone_verified": True}})

    tokens = create_tokens_for_user(user["id"], user.get("email"), user["name"])
    await MongoUserSession.deactivate_user_sessions(user["id"])
    await create_user_session(
        user_id=user["id"],
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    _set_auth_cookies(response, tokens["access_token"], tokens["refresh_token"])
    return TokenResponse(
        **tokens,
        user={
            "id": user["id"],
            "name": user["name"],
            "email": user.get("email", ""),
            "is_verified": user.get("is_verified", False),
        },
    )


@router.post("/refresh", response_model=dict)
async def refresh_token(request: Request, response: Response, payload: RefreshTokenRequest, db=Depends(get_database)):
    """Rotate refresh token (old one is invalidated)."""
    verify_csrf(request)
    decoded = JWTManager.verify_token(payload.refresh_token, "refresh")
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = str(decoded.get("sub"))
    refresh_token_hash = SessionManager.hash_token(payload.refresh_token)
    session = await MongoUserSession.find_session_by_refresh_token(user_id, refresh_token_hash)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found or inactive")

    user = await MongoUser.find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Rotate: deactivate this session, issue new pair
    await MongoUserSession.deactivate_session(session["session_id"])
    new_tokens = create_tokens_for_user(user["id"], user.get("email"), user["name"])
    await create_user_session(
        user_id=user["id"],
        access_token=new_tokens["access_token"],
        refresh_token=new_tokens["refresh_token"],
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "access_token": new_tokens["access_token"],
        "refresh_token": new_tokens["refresh_token"],
        "token_type": "bearer",
        "expires_in": 30 * 60,
    }


@router.post("/logout")
async def logout(
    request: Request,
    response=None,
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database),
):
    token = _extract_token(request, credentials)
    if token:
        token_hash = SessionManager.hash_token(token)
        session = await MongoUserSession.find_active_session(current_user["id"], token_hash)
        if session:
            await MongoUserSession.deactivate_session(session["session_id"])
    return {"message": "Successfully logged out"}


@router.post("/set-cookie")
async def set_cookie_from_tokens(request: Request, payload: RefreshTokenRequest):
    """
    Exchange a refresh token (from localStorage) for httpOnly cookies.
    Used by the frontend to upgrade a token-based session to a cookie-based one.
    """
    from fastapi.responses import JSONResponse
    decoded = JWTManager.verify_token(payload.refresh_token, "refresh")
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = str(decoded.get("sub"))
    refresh_token_hash = SessionManager.hash_token(payload.refresh_token)
    session = await MongoUserSession.find_session_by_refresh_token(user_id, refresh_token_hash)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")

    user = await MongoUser.find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_tokens = create_tokens_for_user(user["id"], user.get("email"), user["name"])
    await MongoUserSession.deactivate_session(session["session_id"])
    await create_user_session(
        user_id=user["id"],
        access_token=new_tokens["access_token"],
        refresh_token=new_tokens["refresh_token"],
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    resp = JSONResponse({"ok": True, "user": {"id": user["id"], "email": user.get("email"), "name": user.get("name")}})
    _set_auth_cookies(resp, new_tokens["access_token"], new_tokens["refresh_token"])
    return resp


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        is_verified=current_user.get("is_verified", False),
        created_at=current_user.get("created_at"),
    )


@router.get("/sessions")
async def get_user_sessions(current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    sessions = await MongoUserSession.get_user_sessions(current_user["id"])
    return {
        "sessions": [
            {
                "session_id": session["session_id"],
                "created_at": session.get("created_at"),
                "last_accessed_at": session.get("last_accessed_at"),
                "ip_address": session.get("ip_address"),
                "user_agent": session.get("user_agent"),
            }
            for session in sessions
        ]
    }


@router.post("/forgot-password")
async def forgot_password(email: EmailStr = Form(), db=Depends(get_database)):
    user = await MongoUser.find_user_by_email(email)
    if user:
        reset_token = PasswordManager.generate_reset_token()
        await MongoPasswordResetToken.create_reset_token(
            user["id"],
            SessionManager.hash_token(reset_token),
        )
        await send_password_reset_email(email, reset_token)
    # Always return generic message to avoid email enumeration.
    return {"message": "If email exists, password reset instructions were sent"}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db=Depends(get_database)):
    if not validate_password(payload.new_password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters with letters and numbers")
    token_hash = SessionManager.hash_token(payload.token)
    reset_entry = await MongoPasswordResetToken.find_valid_token(token_hash)
    if not reset_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user_id = reset_entry["user_id"]
    hashed = PasswordManager.hash_password(payload.new_password)
    db = get_database()
    await db.users.update_one(
        {"_id": get_object_id(user_id)},
        {"$set": {"password_hash": hashed, "updated_at": datetime.now(timezone.utc)}},
    )
    entry_id = reset_entry["id"] if "id" in reset_entry else reset_entry["_id"]
    await db.password_reset_tokens.update_one(
        {"_id": get_object_id(entry_id) if not isinstance(entry_id, ObjectId) else entry_id},
        {"$set": {"used": True}},
    )
    await MongoUserSession.deactivate_user_sessions(user_id)
    return {"message": "Password has been reset. Please login."}


# ---------------------------------------------------------------------------
# Phone OTP utilities
# ---------------------------------------------------------------------------
def normalize_phone(raw: str) -> Optional[str]:
    if not raw:
        return None
    cleaned = re.sub(r"[\s\-()]+", "", raw)
    if cleaned.startswith("+") and cleaned[1:].isdigit() and 8 <= len(cleaned) <= 16:
        return cleaned
    return None


@router.post("/phone/request-otp")
async def request_phone_otp(payload: dict, request: Request):
    if not PHONE_LOGIN_ENABLED:
        raise HTTPException(status_code=404, detail="Phone login is disabled")
    phone_raw = payload.get("phone") if isinstance(payload, dict) else getattr(payload, "phone", None)
    phone_norm = normalize_phone(phone_raw)
    if not phone_norm:
        raise HTTPException(status_code=400, detail="Invalid phone format")
    ip = request.client.host if request.client else "unknown"
    key = f"{ip}:{phone_norm}"
    now = time.time()
    window_start = now - OTP_REQUEST_WINDOW_SEC
    history = [t for t in _otp_rate_cache.get(key, []) if t >= window_start]
    if len(history) >= OTP_REQUEST_MAX_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Try later")
    history.append(now)
    _otp_rate_cache[key] = history

    if USE_TWILIO_VERIFY:
        ok = await start_phone_verification(phone_norm, "sms")
        if ok:
            return {"message": "If phone exists, OTP sent"}
        print("[OTP] Twilio Verify start failed; falling back to local OTP generation")

    code = "".join(secrets.choice("0123456789") for _ in range(OTP_CODE_LENGTH))
    code_hash = SessionManager.hash_token(code)
    # Never store plaintext. Even DEV_OTP_DEBUG does not bypass this.
    await MongoPhoneOTP.create_otp(phone_norm, code_hash, ttl_minutes=OTP_TTL_MINUTES)
    sent = await send_sms(phone_norm, f"Your verification code is {code}. It expires in {OTP_TTL_MINUTES} minutes.")
    if not sent:
        # In dev, log to console so the user can complete the flow.
        if os.getenv("APP_ENV", "development").lower() != "production":
            print(f"[DEV SMS] {phone_norm}: code={code} (expires in {OTP_TTL_MINUTES}m)")
    return {"message": "If phone exists, OTP sent"}


@router.post("/phone/verify-otp")
async def verify_phone_otp(payload: dict):
    if not PHONE_LOGIN_ENABLED:
        raise HTTPException(status_code=404, detail="Phone login is disabled")
    phone_raw = payload.get("phone") if isinstance(payload, dict) else getattr(payload, "phone", None)
    otp_raw = payload.get("otp") if isinstance(payload, dict) else getattr(payload, "otp", None)
    phone_norm = normalize_phone(phone_raw)
    if not phone_norm:
        raise HTTPException(status_code=400, detail="Invalid phone format")
    otp_hash = SessionManager.hash_token(otp_raw or "")
    db_local = get_database()
    local_exists = await db_local.phone_login_otps.find_one(
        {"phone": phone_norm, "expires_at": {"$gt": datetime.now(timezone.utc)}}
    )
    if local_exists:
        valid = await MongoPhoneOTP.verify_otp(phone_norm, otp_hash)
    elif USE_TWILIO_VERIFY:
        valid = await check_phone_verification(phone_norm, otp_raw)
    else:
        valid = False
    if not valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    ttl = int(os.getenv("OTP_LOGIN_TICKET_TTL_SEC", "180"))
    _otp_login_tickets[phone_norm] = {"otp_hash": otp_hash, "exp": time.time() + ttl}
    return {"message": "OTP verified. Continue with password login."}


@router.get("/health")
async def auth_health():
    return {
        "status": "healthy",
        "service": "mongodb-authentication",
        "timestamp": datetime.now(timezone.utc),
    }
