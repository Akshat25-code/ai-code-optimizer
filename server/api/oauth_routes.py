"""
OAuth routes for social login: Google and GitHub.
Uses MongoDB user/session models and issues our JWT tokens on success.
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse, JSONResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import os
import httpx
import secrets
import base64
import json

from dotenv import load_dotenv
load_dotenv()

from models.database import MongoUser, MongoUserSession, MongoOAuthProvider, create_user_session
from core.security import PasswordManager, SessionManager, create_tokens_for_user
from core.config import settings

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])


def _is_origin_allowed(origin: Optional[str]) -> bool:
    """Strict allowlist check for OAuth postMessage targets and redirect URIs."""
    if not origin:
        return False
    origin = origin.strip().rstrip("/")
    allowed = settings.oauth_allowed_origins or []
    if not allowed:
        # No allowlist configured: refuse. This prevents the historical
        # postMessage('*') / open-redirect behavior.
        return False
    return any(o.rstrip("/") == origin for o in allowed)


def _validate_redirect_uri(url: Optional[str]) -> Optional[str]:
    """
    If the URL is provided, it must match an allowed origin (scheme+host+port).
    Returns the normalized URL or None.
    """
    if not url:
        return None
    if not _is_origin_allowed(url):
        raise HTTPException(status_code=400, detail="redirect_uri not in allowlist")
    return url


class OAuthResult(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    user: dict


def _build_redirect_uri(request: Request, provider: str) -> str:
    """
    Build the absolute callback URL.
    Prefer OAUTH_BASE_URL if set to avoid localhost/127.0.0.1 or http/https mismatches.
    Fallback to reconstructing from the incoming request.
    """
    base = os.getenv("OAUTH_BASE_URL")
    if base:
        return f"{base.rstrip('/')}/auth/oauth/{provider}/callback"
    # Reconstruct absolute callback URL based on current request
    url = request.url.replace(path=f"/auth/oauth/{provider}/callback", query="")
    return str(url)


def _encode_state(data: Dict[str, Any]) -> str:
        try:
                raw = json.dumps(data).encode()
                return base64.urlsafe_b64encode(raw).decode().rstrip("=")
        except Exception:
                return ""


def _decode_state(state: Optional[str]) -> Dict[str, Any]:
        if not state:
                return {}
        try:
                # pad base64
                padding = '=' * (-len(state) % 4)
                raw = base64.urlsafe_b64decode((state + padding).encode())
                return json.loads(raw.decode())
        except Exception:
                return {}


def _popup_html(tokens: Dict[str, Any]) -> str:
        # Minimal page that posts tokens to opener and closes.
        # Origin lockdown: we post only to the configured allowlist; we never
        # postMessage('*') since the popup is opened from the same origin and
        # we only want the actual app origin listening.
        payload = json.dumps(tokens)
        allowed = settings.oauth_allowed_origins or []
        targets = [o for o in allowed if o]
        return f"""
<!doctype html>
<html><head><meta charset=\"utf-8\"><title>Signing you inâ€¦</title></head>
<body>
<script>
    (function() {{
        try {{
            var payload = {payload};
            var targets = {json.dumps(targets)};
            if (window.opener && !window.opener.closed) {{
                for (var i = 0; i < targets.length; i++) {{
                    try {{ window.opener.postMessage({{ source: 'oauth', payload: payload }}, targets[i]); }} catch (_) {{}}
                }}
            }}
        }} catch (e) {{ console.error(e); }}
        window.close();
    }})();
</script>
Signing you inâ€¦ You can close this window.
</body></html>
"""


async def _ensure_user(email: str, name: str, picture: Optional[str]) -> dict:
    # Try to find user by email, otherwise create with random password
    user = await MongoUser.find_user_by_email(email)
    if user:
        return user
    random_pw = PasswordManager.generate_reset_token()
    hashed = PasswordManager.hash_password(random_pw)
    new_user = await MongoUser.create_user({
        "name": name or email.split("@")[0],
        "email": email,
        "password_hash": hashed
    })
    return new_user


async def _issue_tokens_for_user(user: dict) -> dict:
    tokens = create_tokens_for_user(user["id"], user["email"], user.get("name") or user["email"])
    await create_user_session(
        user_id=user["id"],
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"]
    )
    return {
        **tokens,
        "user": {
            "id": user["id"],
            "name": user.get("name"),
            "email": user.get("email"),
            "is_verified": user.get("is_verified", True)
        }
    }


# ------------------------ Google ------------------------
@router.get("/google/start")
async def google_start(request: Request):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    redirect_uri = _build_redirect_uri(request, "google")
    mode = request.query_params.get("mode")  # 'popup' or None
    return_to = _validate_redirect_uri(request.query_params.get("redirect_uri"))  # validated against allowlist
    state_payload = {"nonce": secrets.token_urlsafe(8), "mode": mode, "redirect_uri": return_to}
    state = _encode_state(state_payload)
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        "&response_type=code&access_type=online"
        "&scope=openid%20email%20profile"
        f"&state={state}"
    )
    return RedirectResponse(auth_url)


@router.get("/google/callback", response_model=OAuthResult)
async def google_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    if not code:
        # Surface provider errors for easier debugging
        if error:
            raise HTTPException(status_code=400, detail=f"Google OAuth error: {error} - {error_description or ''}".strip())
        raise HTTPException(status_code=400, detail="Missing code")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    redirect_uri = _build_redirect_uri(request, "google")

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Google token error: {token_resp.text}")
        token_json = token_resp.json()
        id_token = token_json.get("id_token")
        access_token = token_json.get("access_token")
        if not id_token:
            raise HTTPException(status_code=400, detail="No id_token from Google")

        # Validate id_token via tokeninfo (sufficient for dev; can switch to google-auth later)
        v = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token})
        if v.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google id_token")
        info = v.json()
        if info.get("aud") != client_id:
            raise HTTPException(status_code=400, detail="Google token audience mismatch")
        email = info.get("email")
        name = info.get("name")
        picture = info.get("picture")
        provider_id = info.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Google did not return email")

    user = await _ensure_user(email, name, picture)
    # Link provider
    try:
        if access_token and provider_id:
            await MongoOAuthProvider.create_oauth_link(user["id"], "google", provider_id, access_token)
    except Exception:
        pass
    result = await _issue_tokens_for_user(user)
    st = _decode_state(state)
    mode = st.get("mode") if isinstance(st, dict) else None
    return_to = st.get("redirect_uri") if isinstance(st, dict) else None
    if mode == "popup":
        return HTMLResponse(_popup_html(result))
    if return_to:
        # Validate again on the way out (state may have been tampered with between /start and /callback).
        return_to = _validate_redirect_uri(return_to)
        if not return_to:
            return result
        # Redirect with tokens in URL fragment (avoid logs); base64 encode user
        user_b64 = _encode_state(result.get("user", {}))
        url = (
            f"{return_to}#access_token={result['access_token']}&refresh_token={result['refresh_token']}"
            f"&token_type={result.get('token_type','bearer')}&expires_in={result.get('expires_in',0)}&user={user_b64}"
        )
        return RedirectResponse(url)
    return result


# ------------------------ GitHub ------------------------
@router.get("/github/start")
async def github_start(request: Request):
    client_id = os.getenv("GITHUB_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    redirect_uri = _build_redirect_uri(request, "github")
    mode = request.query_params.get("mode")
    return_to = _validate_redirect_uri(request.query_params.get("redirect_uri"))
    state = _encode_state({"nonce": secrets.token_urlsafe(8), "mode": mode, "redirect_uri": return_to})
    auth_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        "&scope=read:user%20user:email"
        f"&state={state}"
    )
    return RedirectResponse(auth_url)


@router.get("/github/callback", response_model=OAuthResult)
async def github_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    if not code:
        if error:
            raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {error} - {error_description or ''}".strip())
        raise HTTPException(status_code=400, detail="Missing code")
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    redirect_uri = _build_redirect_uri(request, "github")

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"}
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"GitHub token error: {token_resp.text}")
        token_json = token_resp.json()
        access_token = token_json.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Missing GitHub access_token")

        # Get user info
        u = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
        )
        if u.status_code != 200:
            raise HTTPException(status_code=400, detail="GitHub user info error")
        ujson = u.json()
        name = ujson.get("name") or ujson.get("login")
        provider_id = str(ujson.get("id") or "")
        # Email may be null; fetch primary verified email
        email = ujson.get("email")
        if not email:
            em = await client.get("https://api.github.com/user/emails", headers={"Authorization": f"Bearer {access_token}"})
            if em.status_code == 200:
                for e in em.json():
                    if e.get("primary") and e.get("verified"):
                        email = e.get("email")
                        break
        if not email:
            raise HTTPException(status_code=400, detail="GitHub did not return a verified email")

    user = await _ensure_user(email, name, None)
    try:
        if access_token and provider_id:
            await MongoOAuthProvider.create_oauth_link(user["id"], "github", provider_id, access_token)
    except Exception:
        pass
    result = await _issue_tokens_for_user(user)
    st = _decode_state(state)
    mode = st.get("mode") if isinstance(st, dict) else None
    return_to = st.get("redirect_uri") if isinstance(st, dict) else None
    if mode == "popup":
        return HTMLResponse(_popup_html(result))
    if return_to:
        return_to = _validate_redirect_uri(return_to)
        if not return_to:
            return result
        user_b64 = _encode_state(result.get("user", {}))
        url = (
            f"{return_to}#access_token={result['access_token']}&refresh_token={result['refresh_token']}"
            f"&token_type={result.get('token_type','bearer')}&expires_in={result.get('expires_in',0)}&user={user_b64}"
        )
        return RedirectResponse(url)
    return result


# ------------------------ Facebook ------------------------
@router.get("/facebook/start")
async def facebook_start(request: Request):
    raise HTTPException(status_code=404, detail="Facebook login is disabled")


@router.get("/facebook/callback", response_model=OAuthResult)
async def facebook_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    raise HTTPException(status_code=404, detail="Facebook login is disabled")


# ------------------------ LinkedIn ------------------------
@router.get("/linkedin/start")
async def linkedin_start(request: Request):
    raise HTTPException(status_code=404, detail="LinkedIn login is disabled")


@router.get("/linkedin/callback", response_model=OAuthResult)
async def linkedin_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    raise HTTPException(status_code=404, detail="LinkedIn login is disabled")
