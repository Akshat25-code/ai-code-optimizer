"""
JWT Token Management Utilities
Cookie-based session + access token. Refresh tokens rotate on every refresh.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from passlib.context import CryptContext

from core.config import settings

JWT_ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class JWTManager:
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_ttl_min))
        to_encode.update({"exp": expire, "type": "access", "iat": datetime.now(timezone.utc)})
        return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)

    @staticmethod
    def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        # Add a unique jti so refresh tokens are single-use after rotation.
        to_encode["jti"] = secrets.token_urlsafe(16)
        expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=settings.refresh_token_ttl_days))
        to_encode.update({"exp": expire, "type": "refresh", "iat": datetime.now(timezone.utc)})
        return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)

    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.PyJWTError:
            return None
        if payload.get("type") != token_type:
            return None
        return payload

    @staticmethod
    def get_token_payload(token: str) -> Optional[Dict[str, Any]]:
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except jwt.PyJWTError:
            return None


class PasswordManager:
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False

    @staticmethod
    def generate_reset_token() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def generate_verification_token() -> str:
        return secrets.token_urlsafe(32)


class SessionManager:
    @staticmethod
    def generate_session_id() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def create_token_pair(user_data: Dict[str, Any]) -> Dict[str, str]:
        return {
            "access_token": JWTManager.create_access_token(user_data),
            "refresh_token": JWTManager.create_refresh_token(user_data),
            "token_type": "bearer",
            "expires_in": settings.access_token_ttl_min * 60,
        }


def create_tokens_for_user(user_id: str, email: str | None, name: str) -> Dict[str, str]:
    return SessionManager.create_token_pair(
        {"sub": str(user_id), "email": email or "", "name": name, "iat": datetime.now(timezone.utc)}
    )


def extract_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    payload = JWTManager.verify_token(token, "access")
    if not payload:
        return None
    return {"id": payload.get("sub"), "email": payload.get("email"), "name": payload.get("name")}


def is_token_valid(token: str, token_type: str = "access") -> bool:
    return JWTManager.verify_token(token, token_type) is not None


def get_token_expiry(token: str) -> Optional[datetime]:
    payload = JWTManager.get_token_payload(token)
    if payload and "exp" in payload:
        return datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    return None


# Compatibility constants for legacy imports
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_ttl_min
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_ttl_days
JWT_SECRET_KEY = settings.jwt_secret_key
