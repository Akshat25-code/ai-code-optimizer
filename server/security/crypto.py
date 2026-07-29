"""
Symmetric encryption helpers for secrets at rest (OAuth tokens, etc.).
Uses Fernet (AES-128-CBC + HMAC-SHA256). Key derived from JWT_SECRET_KEY via HKDF-SHA256.
"""
from __future__ import annotations

import base64
import hashlib
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

# Use a stable salt so the derived key is deterministic across restarts.
_HKDF_SALT = b"aco-secrets-v1"
_HKDF_INFO = b"fernet-key"
_CONTEXT = b"ai-code-optimizer"


def _derive_fernet_key(master_key: str) -> bytes:
    """Derive a 32-byte Fernet key from the master JWT secret via HKDF-SHA256."""
    if not master_key:
        raise ValueError("Master key must be non-empty")
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_HKDF_SALT,
        info=_HKDF_INFO + _CONTEXT,
    )
    raw = hkdf.derive(master_key.encode("utf-8"))
    return base64.urlsafe_b64encode(raw)


_fernet: Optional[Fernet] = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        from settings import settings  # late import to avoid circular
        master = settings.jwt_secret_key
        if not master or master == "your-secret-key-change-in-production" or master == "change_me":
            # In dev only, fall back to a stable key derived from machine id so restarts work.
            # Production refuses to start (enforced in settings.check_required_secrets()).
            import platform
            seed = f"dev-fallback::{platform.node()}::{os.getpid() // 4}".encode()
            master = "dev::" + hashlib.sha256(seed).hexdigest()
        _fernet = Fernet(_derive_fernet_key(master))
    return _fernet


def encrypt_str(plaintext: str) -> str:
    """Encrypt a string, return url-safe base64 token."""
    if plaintext is None:
        return None
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_str(token: str) -> Optional[str]:
    """Decrypt a token produced by encrypt_str. Returns None on failure."""
    if not token:
        return None
    try:
        return _get_fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, TypeError):
        return None
