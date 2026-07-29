"""Generate proof-based session reports in JSON and HTML."""
from __future__ import annotations

import html
import json
from datetime import datetime, timezone
from typing import Any


def build_session_report(
    *,
    title: str,
    language: str,
    task: str,
    original_code: str,
    optimized_code: str = "",
    provider_used: str = "",
    inspection: dict | None = None,
    verification: dict | None = None,
    test_results: dict | None = None,
    secrets_scan: dict | None = None,
    repo_scan: dict | None = None,
    diff_summary: str = "",
) -> dict[str, Any]:
    return {
        "report_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "title": title,
        "language": language,
        "task": task,
        "provider_used": provider_used,
        "original_code_summary": {
            "lines": len(original_code.splitlines()),
            "characters": len(original_code),
        },
        "optimized_code_summary": {
            "lines": len(optimized_code.splitlines()) if optimized_code else 0,
            "characters": len(optimized_code) if optimized_code else 0,
        },
        "issues_found": (inspection or {}).get("findings", [])[:20],
        "inspection": inspection,
        "verification": verification,
        "test_results": test_results,
        "secrets_scan": secrets_scan,
        "repo_scan": repo_scan,
        "diff_summary": diff_summary,
        "final_recommendation": _recommendation(verification, inspection, test_results),
        "limitations": [
            "Verification uses sandboxed execution with limited stdlib access.",
            "Benchmarks reflect single-run timing and may vary by machine load.",
            "Static analysis coverage varies by language.",
            "AI suggestions require human review before production use.",
        ],
    }


def _recommendation(verification, inspection, test_results) -> str:
    if verification and verification.get("verified"):
        gain = verification.get("proof_panel", {}).get("speed_gain_pct")
        if gain and gain > 0:
            return f"Verified optimization with {gain}% runtime improvement. Safe to review for merge."
        return "Output matches and both versions run successfully. Review diff before applying."
    if test_results and not test_results.get("passed"):
        return "Tests failed â€” do not apply optimization until tests pass."
    score = (inspection or {}).get("score", 0)
    if score < 60:
        return "Code quality score is low â€” address security and complexity findings first."
    return "Optimization is unverified or outputs differ. Manual review required."


def render_json_report(report: dict[str, Any]) -> str:
    return json.dumps(report, indent=2, default=str)


def render_html_report(report: dict[str, Any]) -> str:
    v = report.get("verification") or {}
    panel = v.get("proof_panel") or {}
    badges = v.get("proof_badges") or (report.get("inspection") or {}).get("proof_badges") or []
    findings = report.get("issues_found") or []

    badge_html = "".join(
        f'<span class="badge {b.get("status","unknown")}">{html.escape(b.get("label",""))}</span>'
        for b in badges
    )
    findings_html = "".join(
        f'<li><strong>{html.escape(f.get("severity",""))}</strong> â€” {html.escape(f.get("title",""))}: '
        f'{html.escape(f.get("detail","") or f.get("message",""))}</li>'
        for f in findings[:15]
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>{html.escape(report.get("title","Code Intelligence Report"))}</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #111; }}
    h1 {{ color: #0f766e; }}
    .meta {{ color: #555; font-size: 0.9rem; }}
    .badges {{ display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }}
    .badge {{ padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }}
    .badge.passed {{ background: #d1fae5; color: #065f46; }}
    .badge.failed {{ background: #fee2e2; color: #991b1b; }}
    .badge.warning {{ background: #fef3c7; color: #92400e; }}
    .panel {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }}
    pre {{ background: #1e293b; color: #e2e8f0; padding: 1rem; overflow-x: auto; border-radius: 6px; font-size: 0.8rem; }}
    ul {{ line-height: 1.6; }}
  </style>
</head>
<body>
  <h1>{html.escape(report.get("title","Code Intelligence Report"))}</h1>
  <p class="meta">Generated {html.escape(report.get("generated_at",""))} Â· {html.escape(report.get("language",""))} Â· {html.escape(report.get("task",""))}</p>
  <p><strong>Provider:</strong> {html.escape(report.get("provider_used") or "n/a")}</p>
  <div class="badges">{badge_html}</div>
  <div class="panel">
    <h2>Verification</h2>
    <p><strong>Status:</strong> {html.escape(panel.get("status") or v.get("status") or "n/a")}</p>
    <p><strong>Output match:</strong> {html.escape(str(panel.get("output_match", "n/a")))}</p>
    <p><strong>Original runtime:</strong> {html.escape(str(panel.get("original_runtime_ms", "n/a")))} ms</p>
    <p><strong>Optimized runtime:</strong> {html.escape(str(panel.get("optimized_runtime_ms", "n/a")))} ms</p>
    <p><strong>Speed gain:</strong> {html.escape(str(panel.get("speed_gain_pct", "n/a")))}%</p>
  </div>
  <h2>Issues Found</h2>
  <ul>{findings_html or "<li>No issues recorded</li>"}</ul>
  <h2>Recommendation</h2>
  <p>{html.escape(report.get("final_recommendation",""))}</p>
  <h2>Limitations</h2>
  <ul>{"".join(f"<li>{html.escape(x)}</li>" for x in report.get("limitations",[]))}</ul>
</body>
</html>"""
