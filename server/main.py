# main.py â€” Application entry point. Routes live in api/*.py, models in models/*.py.
from contextlib import asynccontextmanager
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings, check_required_secrets
from core.database import connect_to_mongo, init_mongodb, close_mongo_connection, mongo_diagnostics
from core.websocket import manager

# Route modules
from api.analysis_routes import router as analysis_router
from api.execution_routes import router as execution_router
from api.streaming_routes import router as streaming_router
from api.auth_routes import router as auth_router
from api.oauth_routes import router as oauth_router
from api.profile_routes import router as profile_router
from api.session_routes import router as opt_sessions_router
from api.github_routes import router as github_router
from api.intelligence_routes import router as intelligence_router
from api.project_routes import router as project_router
from api.rules_routes import router as rules_router
from api.analytics_routes import router as analytics_router
from api.visualization_routes import router as visualization_router
from api.review_routes import router as review_router
from api.team_routes import router as team_router
from api.apikeys_routes import router as apikeys_router

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger("ai_code_optimizer")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

BACKEND_PORT = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8001")))
APP_ENV = os.getenv("APP_ENV", "development").lower()

# Validate required secrets on startup
check_required_secrets()


# --- Lifespan (replaces deprecated @app.on_event) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("SKIP_MONGO_INIT", "0") == "1":
        logger.warning("SKIP_MONGO_INIT=1: Skipping MongoDB initialization (dev-only)")
        logger.info(f"BACKEND_PORT={BACKEND_PORT}")
    else:
        await connect_to_mongo()
        await init_mongodb()
        logger.info("MongoDB authentication initialized")
        logger.info(f"Using DB name: {os.getenv('MONGODB_DB', 'ai_code_optimizer')}")
        logger.info(f"BACKEND_PORT={BACKEND_PORT}")
    yield
    await close_mongo_connection()


app = FastAPI(title="AI Code Optimizer API", version="0.4.0", lifespan=lifespan)

# CORS middleware
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(analysis_router)
app.include_router(execution_router)
app.include_router(streaming_router)
app.include_router(auth_router)
app.include_router(oauth_router)
app.include_router(opt_sessions_router)
app.include_router(github_router)
app.include_router(profile_router)
app.include_router(intelligence_router)
app.include_router(project_router)
app.include_router(rules_router)
app.include_router(analytics_router)
app.include_router(visualization_router)
app.include_router(review_router)
app.include_router(team_router)
app.include_router(apikeys_router)


# WebSocket for real-time session sync
@app.websocket("/ws/session/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(session_id, {"type": "session_update", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)


# Serve uploaded files with security headers
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)


class _SafeStaticFiles(StaticFiles):
    """StaticFiles subclass that adds defensive security headers."""

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        ct = response.headers.get("Content-Type", "")
        if not ct.startswith("image/") and path != "/":
            response.headers["Content-Disposition"] = "attachment"
        return response


app.mount("/uploads", _SafeStaticFiles(directory=uploads_dir), name="uploads")


# Root & health
@app.get("/")
async def root():
    return {"message": "AI Code Optimizer API", "version": "0.4.0", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "0.4.0"}


# Provider status
@app.get("/providers")
async def providers_status():
    """Report which AI providers are configured (no secrets returned)."""
    configured_default = os.getenv("PRIMARY_AI_PROVIDER", "auto").strip().lower()
    alias_map = {"claude": "anthropic"}
    if settings.experimental_providers_enabled:
        alias_map.update({"grok": "grok", "deepseek": "deepseek"})
    default_provider = alias_map.get(configured_default, configured_default)
    providers = [
        {"name": "openai", "healthy": bool(settings.openai_api_key), "configured": bool(settings.openai_api_key), "model": settings.openai_model},
        {"name": "anthropic", "healthy": bool(settings.anthropic_api_key), "configured": bool(settings.anthropic_api_key), "model": settings.anthropic_model},
        {"name": "gemini", "healthy": bool(settings.gemini_api_key), "configured": bool(settings.gemini_api_key), "model": settings.gemini_model},
    ]
    if settings.experimental_providers_enabled:
        providers.extend([
            {"name": "deepseek", "healthy": bool(settings.deepseek_api_key), "configured": bool(settings.deepseek_api_key), "model": settings.deepseek_model},
            {
                "name": "grok",
                "healthy": bool(settings.grok_api_key or settings.groq_api_key),
                "configured": bool(settings.grok_api_key or settings.groq_api_key),
                "model": settings.grok_model if settings.grok_api_key else settings.groq_model,
            },
        ])
    return {
        "providers": providers,
        "default_provider": default_provider,
        "openai": bool(settings.openai_api_key),
        "anthropic": bool(settings.anthropic_api_key),
        "gemini": bool(settings.gemini_api_key),
        "deepseek": bool(settings.experimental_providers_enabled and settings.deepseek_api_key),
        "grok": bool(settings.experimental_providers_enabled and (settings.grok_api_key or settings.groq_api_key)),
        "models": {
            "openai": settings.openai_model,
            "anthropic": settings.anthropic_model,
            "gemini": settings.gemini_model,
        },
        "allow_fake_ai": os.getenv("ALLOW_FAKE_AI", "1") == "1",
        "ai_timeout": int(os.getenv("AI_TIMEOUT", "10")),
        "ai_retries": int(os.getenv("AI_RETRIES", "1")),
        "experimental_providers_enabled": settings.experimental_providers_enabled,
    }


# Debug endpoints â€” dev only
@app.get("/debug/db")
async def debug_db():
    if APP_ENV == "production":
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "database": os.getenv("MONGODB_DB", "ai_code_optimizer"),
        "port_env": BACKEND_PORT,
        "allow_fake_ai": os.getenv("ALLOW_FAKE_AI", "1") == "1",
    }


@app.get("/debug/mongo")
async def debug_mongo():
    if APP_ENV == "production" or os.getenv("MONGODB_DEBUG", "0") != "1":
        raise HTTPException(status_code=404, detail="Not found")
    diag = await mongo_diagnostics()
    url = str(diag.get("url", ""))
    if "@" in url and "://" in url:
        scheme, rest = url.split("://", 1)
        if "@" in rest:
            creds, hostpart = rest.split("@", 1)
            diag["url"] = f"{scheme}://***:***@{hostpart}"
    return diag


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting AI Code Optimizer API")
    logger.info(f"Server starting on http://localhost:{BACKEND_PORT}")
    logger.info(f"API Documentation: http://localhost:{BACKEND_PORT}/docs")
    logger.info(f"Environment: {APP_ENV}")
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)
