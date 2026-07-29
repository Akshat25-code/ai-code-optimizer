"""Fernet symmetric encryption for user API keys at rest."""
from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet

    raw = os.getenv("ENCRYPTION_KEY", "")
    if not raw:
        # Dev fallback: derive from JWT secret so keys survive restarts
        jwt_secret = os.getenv("JWT_SECRET_KEY", "dev-fallback-key")
        raw = base64.urlsafe_b64encode(
            hashlib.sha256(jwt_secret.encode()).digest()
        ).decode()

    # Ensure valid 32-byte url-safe base64 key
    try:
        _fernet = Fernet(raw.encode() if isinstance(raw, str) else raw)
    except (ValueError, Exception):
        # Raw value isn't valid Fernet key â€” derive one
        derived = base64.urlsafe_b64encode(
            hashlib.sha256(raw.encode()).digest()
        )
        _fernet = Fernet(derived)

    return _fernet


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value. Returns base64-encoded ciphertext."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a ciphertext string. Raises ValueError on failure."""
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        raise ValueError("Failed to decrypt â€” key may have been rotated")
