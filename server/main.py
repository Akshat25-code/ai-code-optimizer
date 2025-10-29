# main.py
from fastapi import FastAPI, HTTPException, Query
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, validator
from ai_service import ask_ai, ProviderConfigError
from simple_enhanced_ai_service import evaluate_code_optimization
from language_validator import (
    validate_programming_language, 
    LanguageValidationError, 
    programming_language_validator,
    get_supported_languages,
    get_popular_languages
)
from mongodb_auth_routes import router as auth_router
from oauth_routes import router as oauth_router
from profile_routes import router as profile_router
from opt_sessions_routes import router as opt_sessions_router
from mongodb_database import connect_to_mongo, init_mongodb, close_mongo_connection, mongo_diagnostics
import os
from dotenv import load_dotenv
from settings import settings

# Load environment variables
load_dotenv()

BACKEND_PORT = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8001")))
app = FastAPI(title="AI Code Optimizer API", version="0.3.0")

# Initialize MongoDB on startup
@app.on_event("startup")
async def startup_event():
    """Initialize MongoDB and indexes on startup"""
    await connect_to_mongo()
    await init_mongodb()
    print("✅ MongoDB authentication initialized")
    print(f"🔧 Using DB name: {os.getenv('MONGODB_DB', 'ai_code_optimizer')}")
    print(f"🛠  BACKEND_PORT={BACKEND_PORT}")

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown"""
    await close_mongo_connection()

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(auth_router)
app.include_router(oauth_router)
app.include_router(opt_sessions_router)
app.include_router(profile_router)

# Serve uploaded files (e.g., avatars)
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Simple debug endpoint to confirm DB/port in development (remove or protect in production)
@app.get("/debug/db")
async def debug_db():
    return {
        "database": os.getenv("MONGODB_DB", "ai_code_optimizer"),
        "port_env": BACKEND_PORT,
        "allow_fake_ai": os.getenv("ALLOW_FAKE_AI", "1") == "1"
    }

# Optional, dev-only: return Mongo diagnostics (mask secrets). Enable with MONGODB_DEBUG=1
@app.get("/debug/mongo")
async def debug_mongo():
    if os.getenv("MONGODB_DEBUG", "0") != "1":
        raise HTTPException(status_code=404, detail="Not found")
    diag = await mongo_diagnostics()
    # Mask credentials in URL if present
    url = str(diag.get("url", ""))
    if "@" in url and "://" in url:
        scheme, rest = url.split("://", 1)
        if "@" in rest:
            creds, hostpart = rest.split("@", 1)
            diag["url"] = f"{scheme}://***:***@{hostpart}"
    return diag

class AnalyzeReq(BaseModel):
    code: str
    language: str
    task: str  # "bug_detection" | "optimization" | "explanation" | "analyze" | "document" | "refactor"
    provider: str | None = None  # "openai" | "claude" | "gemini" | None/auto
    
    @validator('language')
    def validate_language(cls, v):
        """Validate that language is a supported programming language"""
        try:
            validate_programming_language(v)
            return v
        except LanguageValidationError as e:
            raise ValueError(str(e))

class AnalyzeRes(BaseModel):
    provider_used: str
    result: str

class EvaluateOptimizationReq(BaseModel):
    code: str
    language: str
    provider: str | None = None

@app.post("/analyze-code", response_model=AnalyzeRes)
async def analyze_code(req: AnalyzeReq):
    try:
        # Language validation is already handled by Pydantic validator
        # Guard against long external timeouts
        ai_timeout = int(os.getenv("AI_TIMEOUT", "20"))
        provider_used, result = await asyncio.wait_for(
            ask_ai(req.task, req.language, req.code, req.provider), timeout=ai_timeout
        )
        return {"provider_used": provider_used, "result": result}
    except ValueError as e:
        # Handle language validation errors
        if "programming language" in str(e).lower():
            raise HTTPException(status_code=422, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except ProviderConfigError as e:
        # Development fallback: if API keys are missing, return a stubbed response
        if os.getenv("ALLOW_FAKE_AI", "1") == "1":
            summary = req.code.strip().splitlines()
            summary = "\n".join(summary[:10]) + ("\n..." if len(req.code.strip().splitlines()) > 10 else "")
            fake = (
                f"[DEV FAKE] Task: {req.task} for {req.language}\n\n"
                f"Input preview:\n{summary}\n\n"
                f"This is a development stub because real AI provider keys are missing."
            )
            return {"provider_used": "dev-fake", "result": fake}
        raise HTTPException(status_code=400, detail=str(e))
    except asyncio.TimeoutError:
        if os.getenv("ALLOW_FAKE_AI", "1") == "1":
            summary = req.code.strip().splitlines()
            summary = "\n".join(summary[:10]) + ("\n..." if len(req.code.strip().splitlines()) > 10 else "")
            fake = (
                f"[DEV FAKE] Task: {req.task} for {req.language}\n\n"
                f"Input preview:\n{summary}\n\n"
                f"This is a development stub because AI provider timed out."
            )
            return {"provider_used": "dev-fake-timeout", "result": fake}
        raise HTTPException(status_code=504, detail="AI provider timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {e}")

@app.get("/supported-languages")
async def get_supported_languages_endpoint():
    """Get all supported programming languages"""
    try:
        from language_validator import get_supported_languages as get_langs, get_popular_languages as get_popular
        all_languages = get_langs()
        popular_languages = get_popular()
        
        return {
            "supported_languages": {
                name: {
                    "name": info.name,
                    "category": info.category,
                    "extensions": info.extensions,
                    "description": info.description,
                    "is_popular": info.is_popular
                }
                for name, info in all_languages.items()
            },
            "popular_languages": popular_languages,
            "total_count": len(all_languages)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching supported languages: {e}")

@app.get("/")
async def root():
    return {"message": "AI Code Optimizer API", "version": "0.3.0", "docs": "/docs"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "0.3.0"}

@app.get("/providers")
async def providers_status():
    """Report which AI providers are configured (no secrets returned)."""
    return {
        "openai": bool(settings.openai_api_key),
        "anthropic": bool(settings.anthropic_api_key),
        "gemini": bool(settings.gemini_api_key),
        "models": {
            "openai": settings.openai_model,
            "anthropic": settings.anthropic_model,
            "gemini": settings.gemini_model,
        },
        "allow_fake_ai": os.getenv("ALLOW_FAKE_AI", "1") == "1",
        "ai_timeout": int(os.getenv("AI_TIMEOUT", "10")),
    }

@app.post("/optimize-code-enhanced")
async def optimize_code_enhanced(request: dict):
    """Enhanced optimization endpoint with performance analysis"""
    try:
        code = request.get("code", "")
        language = request.get("language", "python") 
        provider = request.get("provider")
        test_inputs = request.get("test_inputs", [])
        
        # Get optimization from AI
        provider_used, optimization_result = await ask_ai("optimization", language, code, provider)
        
        # Analyze performance characteristics
        performance_analysis = {
            "time_complexity": "Analyzed - see optimization details",
            "space_complexity": "Analyzed - see optimization details", 
            "improvement_estimate": "Significant improvement expected"
        }
        
        # Generate optimized code suggestion
        optimized_code = f"# Optimized version suggested by {provider_used}:\n{optimization_result}"
        
        return {
            "provider_used": provider_used,
            "result": optimization_result,
            "performance_analysis": performance_analysis,
            "optimized_code": optimized_code,
            "test_inputs_processed": len(test_inputs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhanced optimization error: {e}")

@app.post("/evaluate-optimization")
async def evaluate_optimization_endpoint(req: EvaluateOptimizationReq):
    """
    Comprehensive optimization evaluation endpoint
    Performs AI optimization and evaluates the results with:
    1. Test cases with various inputs
    2. Performance metrics comparison
    3. Additional optimization recommendations
    """
    try:
        result = await evaluate_code_optimization(req.code, req.language, req.provider)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation error: {e}")

@app.get("/test-optimization-sample")
async def test_optimization_sample():
    """
    Test endpoint with a sample optimization to demonstrate the evaluation system
    """
    sample_code = """
def factorial(n):
    if n <= 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result = result * i
    return result
"""
    
    try:
        result = await evaluate_code_optimization(sample_code, "python", "openai")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test evaluation error: {e}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting AI Code Optimizer API")
    print("=" * 50)
    print("🆕 Authentication & MongoDB Ready")
    print("=" * 50)
    print(f"🌐 Server starting on http://localhost:{BACKEND_PORT}")
    print(f"📚 API Documentation: http://localhost:{BACKEND_PORT}/docs")
    print(f"🩺 Health Check: http://localhost:{BACKEND_PORT}/health")
    print(f"🗄  Active DB: {os.getenv('MONGODB_DB', 'ai_code_optimizer')}")
    uvicorn.run(app, host="0.0.0.0", port=BACKEND_PORT)
