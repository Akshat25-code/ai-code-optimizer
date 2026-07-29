"""
CSRF double-submit pattern helpers.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from typing import Optional

from fastapi import HTTPException, Request, status

CSRF_COOKIE = "aco_csrf"
CSRF_HEADER = "X-CSRF-Token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def issue_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_csrf(request: Request) -> None:
    """
    Double-submit check: cookie value (hashed) must match header value.
    Only enforced for unsafe methods (POST/PUT/PATCH/DELETE).
    """
    if request.method in SAFE_METHODS:
        return
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get(CSRF_HEADER)
    if not cookie or not header:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token missing")
    if not hmac.compare_digest(_hash_token(cookie), _hash_token(header)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token invalid")
