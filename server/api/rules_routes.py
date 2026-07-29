"""Custom Rules and Linting API Routes."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from api.auth_routes import get_current_user
from core.database import get_database
from services.analysis.rules_engine import RulesEngine, Rule, Violation, get_compliance_score
import json

router = APIRouter(prefix="/rules", tags=["Rules & Linting"])
rules_engine = RulesEngine()

class EvaluateReq(BaseModel):
    code: str
    language: str
    active_rules: List[Dict[str, Any]] = Field(default_factory=list)

@router.get("/packs")
async def get_rule_packs():
    """Get all pre-built rule packs and their rules."""
    packs = rules_engine.get_all_packs()
    # Serialize rules safely
    res = {}
    for pack_name, rules in packs.items():
        res[pack_name] = [
            {
                "name": r.name,
                "description": r.description,
                "severity": r.severity,
                "category": r.category,
                "languages": r.languages,
                "message": r.message,
                "autofix": r.autofix,
                "enabled_by_default": r.enabled_by_default
            } for r in rules
        ]
    return res

@router.get("/user")
async def get_user_rules(user = Depends(get_current_user)):
    """Get the active and custom rules for a user."""
    db = get_database()
    user_rules = await db.user_rules.find_one({"user_id": user["id"]})
    if not user_rules:
        # Default active rules
        return {"active_packs": ["security-owasp", "python-style", "clean-code"], "custom_rules": []}
    return {
        "active_packs": user_rules.get("active_packs", []),
        "custom_rules": user_rules.get("custom_rules", [])
    }

class UserRulesUpdate(BaseModel):
    active_packs: List[str]
    custom_rules: List[Dict[str, Any]]

@router.put("/user")
async def update_user_rules(update: UserRulesUpdate, user = Depends(get_current_user)):
    """Update active packs and custom rules for a user."""
    db = get_database()
    await db.user_rules.update_one(
        {"user_id": user["id"]},
        {"$set": {"active_packs": update.active_packs, "custom_rules": update.custom_rules}},
        upsert=True
    )
    return {"status": "success"}

@router.post("/evaluate")
async def evaluate_rules(req: EvaluateReq):
    """Evaluate specific code against a provided list of rules."""
    # Reconstruct Rule objects
    rules_to_run = rules_engine._parse_rules(req.active_rules)
    violations = rules_engine.evaluate(req.code, req.language, rules_to_run)
    score = get_compliance_score(violations)

    return {
        "violations": [v.to_dict() for v in violations],
        "compliance_score": score
    }
