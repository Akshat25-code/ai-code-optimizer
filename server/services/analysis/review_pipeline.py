"""
AI Review Pipeline (Multi-Stage) - Feature 8

Orchestrates 5 stages of code review:
1. Static Analysis
2. Security Scan
3. Performance
4. AI Review
5. Aggregation
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional

from services.analysis.complexity_engine import analyze_complexity
from services.analysis.bug_scanner import scan_python, scan_javascript
from utils.code_utils import estimate_complexity
from services.ai.provider_service import ask_ai
from core.websocket import manager


@dataclass
class Finding:
    stage: str
    category: str  # e.g., 'security', 'complexity', 'logic', 'performance'
    severity: str  # Critical, High, Medium, Low
    confidence: float  # 0.0 to 1.0
    line: Optional[int]
    message: str
    autofix: Optional[str] = None

    def to_dict(self):
        return asdict(self)


class Stage:
    name = "Base Stage"

    async def execute(self, code: str, language: str) -> List[Finding]:
        raise NotImplementedError()


class StaticAnalysisStage(Stage):
    name = "Static Analysis"

    async def execute(self, code: str, language: str) -> List[Finding]:
        findings = []
        if language.lower() != "python":
            return findings

        try:
            report = analyze_complexity(code)

            # Convert dead code to findings
            for item in report.dead_code:
                findings.append(Finding(
                    stage=self.name,
                    category="dead_code",
                    severity="Low",
                    confidence=0.95,
                    line=item.line,
                    message=f"Dead {item.kind}: {item.name} - {item.reason}"
                ))

            # Convert high complexity to findings
            for func in report.functions:
                if func.cyclomatic_complexity > 10:
                    findings.append(Finding(
                        stage=self.name,
                        category="complexity",
                        severity="Medium" if func.cyclomatic_complexity < 20 else "High",
                        confidence=0.95,
                        line=func.line,
                        message=f"Function '{func.name}' has high cyclomatic complexity ({func.cyclomatic_complexity})."
                    ))
        except Exception:
            pass

        return findings


class SecurityScanStage(Stage):
    name = "Security Scan"

    async def execute(self, code: str, language: str) -> List[Finding]:
        findings = []
        try:
            # Re-use our bug_scanner
            report = scan_python(code) if language.lower() == "python" else scan_javascript(code)
            issues = report.get("issues", [])
            for issue in issues:
                findings.append(Finding(
                    stage=self.name,
                    category=issue.get("category", "security"),
                    severity=issue.get("severity", "Medium"),
                    confidence=0.90,  # Regex/AST based, fairly confident
                    line=issue.get("line"),
                    message=issue.get("message", ""),
                    autofix=issue.get("suggested_fix")
                ))
        except Exception:
            pass

        return findings


class PerformanceStage(Stage):
    name = "Performance & Big-O"

    async def execute(self, code: str, language: str) -> List[Finding]:
        findings = []
        try:
            # We can re-use the simple estimate_complexity util which returns time/space estimates
            time_c, space_c = estimate_complexity(code, language)

            if time_c not in ("O(1)", "O(log N)", "O(N)"):
                findings.append(Finding(
                    stage=self.name,
                    category="performance",
                    severity="Medium",
                    confidence=0.85,
                    line=None,
                    message=f"Overall time complexity estimated at {time_c}. Consider optimizing nested loops.",
                ))

        except Exception:
            pass

        return findings


class AIReviewStage(Stage):
    name = "AI Review"

    async def execute(self, code: str, language: str, prior_findings: List[Finding] = None) -> List[Finding]:
        findings = []
        prior_findings = prior_findings or []

        # Build prompt with prior context
        context_str = "\n".join([f"- Line {f.line or '?'}: [{f.severity}] {f.message}" for f in prior_findings])

        prompt = (
            f"Review this {language} code for logic flaws, race conditions, or architecture issues.\n"
            f"Here are findings from automated tools. Do NOT repeat these unless you have a specific fix:\n"
            f"{context_str}\n\n"
            "Return a JSON array of objects with keys: {category, severity, line (int or null), message, autofix (optional)}.\n"
            "Severity must be Critical, High, Medium, or Low.\n"
            f"Code:\n{code}"
        )

        try:
            # Using ask_ai (which already parses JSON if we ask it to)
            result_json = await ask_ai(prompt, task="bug-detection")

            # If the response isn't a list directly (maybe it's wrapped), try to extract
            import json
            import re

            # Simple extraction if ask_ai returned markdown block
            if isinstance(result_json, str):
                match = re.search(r'\[\s*\{.*?\}\s*\]', result_json, re.DOTALL)
                if match:
                    parsed = json.loads(match.group(0))
                else:
                    parsed = []
            else:
                parsed = result_json if isinstance(result_json, list) else result_json.get("issues", [])

            for item in parsed:
                findings.append(Finding(
                    stage=self.name,
                    category=item.get("category", "logic"),
                    severity=item.get("severity", "Medium"),
                    confidence=0.75,  # AI is less confident
                    line=item.get("line"),
                    message=item.get("message", "AI flagged an issue"),
                    autofix=item.get("autofix")
                ))
        except Exception:
            pass

        return findings


class AggregationStage:
    name = "Aggregation & Ranking"

    SEVERITY_WEIGHTS = {
        "Critical": 1.0,
        "High": 0.8,
        "Medium": 0.5,
        "Low": 0.2
    }

    def execute(self, findings: List[Finding]) -> List[Finding]:
        # Deduplicate and boost confidence
        # Key by (line, category) - approximate deduplication
        merged: Dict[str, Finding] = {}

        for f in findings:
            key = f"{f.line}-{f.category}"
            if key in merged:
                existing = merged[key]
                # Boost confidence since multiple stages found the same issue
                # e.g., 1 - (1-0.9)*(1-0.75) = 0.975
                existing.confidence = 1 - ((1 - existing.confidence) * (1 - f.confidence))
                # Append stage attribution
                if f.stage not in existing.stage:
                    existing.stage += f", {f.stage}"
                # Keep highest severity
                if self.SEVERITY_WEIGHTS.get(f.severity, 0) > self.SEVERITY_WEIGHTS.get(existing.severity, 0):
                    existing.severity = f.severity
            else:
                merged[key] = f

        # Rank by severity_weight * confidence
        final_list = list(merged.values())
        final_list.sort(
            key=lambda x: self.SEVERITY_WEIGHTS.get(x.severity, 0.2) * x.confidence,
            reverse=True
        )

        return final_list


class ReviewPipeline:
    def __init__(self, session_id: str = None):
        self.session_id = session_id

        self.stages = [
            StaticAnalysisStage(),
            SecurityScanStage(),
            PerformanceStage(),
        ]
        self.ai_stage = AIReviewStage()
        self.agg_stage = AggregationStage()

    async def _emit_progress(self, stage_name: str, status: str):
        if self.session_id:
            try:
                await manager.broadcast_to_room(
                    self.session_id,
                    {"type": "pipeline_progress", "stage": stage_name, "status": status},
                )
            except Exception:
                pass

    async def run(self, code: str, language: str, skip_ai: bool = False) -> Dict[str, Any]:
        all_findings: List[Finding] = []

        # 1. Run Stages 1-3 in parallel
        for s in self.stages:
            await self._emit_progress(s.name, "running")

        results = await asyncio.gather(*[s.execute(code, language) for s in self.stages], return_exceptions=True)

        for i, s in enumerate(self.stages):
            if isinstance(results[i], list):
                all_findings.extend(results[i])
            await self._emit_progress(s.name, "complete")

        # 2. Run AI Stage sequentially (needs prior findings context)
        if not skip_ai:
            await self._emit_progress(self.ai_stage.name, "running")
            ai_findings = await self.ai_stage.execute(code, language, prior_findings=all_findings)
            all_findings.extend(ai_findings)
            await self._emit_progress(self.ai_stage.name, "complete")
        else:
            await self._emit_progress(self.ai_stage.name, "skipped")

        # 3. Aggregate
        await self._emit_progress(self.agg_stage.name, "running")
        final_findings = self.agg_stage.execute(all_findings)
        await self._emit_progress(self.agg_stage.name, "complete")

        # Group by category for UI convenience
        grouped = {}
        for f in final_findings:
            cat = f.category
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(f.to_dict())

        return {
            "total_findings": len(final_findings),
            "findings_by_category": grouped,
            "ranked_findings": [f.to_dict() for f in final_findings]
        }
