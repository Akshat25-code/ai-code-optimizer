from fastapi import APIRouter
from models.request_models import CodeRequest
from models.response_models import AIResponse
from services.ai_engine import process_code_with_ai

router = APIRouter()

@router.post("/analyze", response_model=AIResponse)
async def analyze_code(req: CodeRequest):
    result = await process_code_with_ai(req.code, mode="analyze")
    return {"output": result}

@router.post("/optimize", response_model=AIResponse)
async def optimize_code(req: CodeRequest):
    result = await process_code_with_ai(req.code, mode="optimize")
    return {"output": result}
