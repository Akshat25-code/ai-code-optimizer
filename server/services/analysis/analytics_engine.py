"""Historical Analytics & Quality Tracking Engine.

Weighted quality scoring, tech-debt estimation, and trend analysis.
All computations are deterministic â€” no AI.

Quality Score Weights (documented):
    30%  Complexity (inverted â€” lower complexity â†’ higher score)
    25%  Rule compliance
    20%  Test coverage proxy (functions with docstrings as proxy)
    15%  Documentation coverage
    10%  Duplication (inverted)

Tech-Debt Hour Model:
    High-complexity function (cyclomatic > 10):  2h each
    Security violation (Critical/High):          4h each
    Rule violation (Medium/Low):                 0.5h each
    Missing test (function without docstring):   1h each
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional


def compute_quality_score(report: dict) -> float:
    """Compute a weighted 0â€“100 quality score from an inspection report.

    Parameters
    ----------
    report : dict
        An inspection report as returned by ``inspect_code_quality`` plus
        the ``rule_violations`` list and ``compliance_score`` injected by
        the rules engine.

    Returns
    -------
    float
        Score clamped to [0, 100].
    """
    # ---- Extract raw metrics ----
    summary = report.get("summary", {})
    total_lines = summary.get("lines", 0) or 1
    total_functions = summary.get("functions", 0) or 1
    max_complexity = summary.get("max_complexity", 0) or 0
    findings_count = summary.get("findings", 0) or 0

    rule_violations = report.get("rule_violations", [])
    compliance_score = report.get("compliance_score", 100)

    # ---- Sub-scores (each 0-100) ----

    # 1. Complexity score (inverted: 0 complexity â†’ 100)
    #    Cap at 30 for worst-case so it doesn't dominate
    complexity_raw = min(max_complexity, 30)
    complexity_score = max(0, 100 - (complexity_raw / 30) * 100)

    # 2. Rule compliance score (already 0-100 from rules engine)
    compliance = compliance_score

    # 3. Test coverage proxy: ratio of documented functions
    doc_count = 0
    for badge in report.get("proof_badges", []):
        if badge.get("status") == "passed":
            doc_count += 1
    total_badges = max(len(report.get("proof_badges", [])), 1)
    test_proxy_score = (doc_count / total_badges) * 100

    # 4. Documentation coverage: presence of docstrings
    doc_coverage_score = test_proxy_score  # Reuse proof badges as proxy

    # 5. Duplication score (fewer findings = better)
    #    Cap at 20 findings for worst-case
    duplication_raw = min(findings_count, 20)
    duplication_score = max(0, 100 - (duplication_raw / 20) * 100)

    # ---- Weighted average ----
    score = (
        0.30 * complexity_score
        + 0.25 * compliance
        + 0.20 * test_proxy_score
        + 0.15 * doc_coverage_score
        + 0.10 * duplication_score
    )

    return round(max(0, min(100, score)), 1)


def estimate_tech_debt(report: dict) -> dict:
    """Estimate tech debt in hours using a documented model.

    Returns
    -------
    dict
        ``{total_hours, by_category: {complexity, security, rules, testing}}``
    """
    summary = report.get("summary", {})
    rule_violations = report.get("rule_violations", [])

    # Complexity debt: each high-complexity function costs 2h
    max_complexity = summary.get("max_complexity", 0)
    # Rough estimate: assume 1 high-complexity function per 5 max-complexity points above 10
    high_complexity_fns = max(0, (max_complexity - 10) // 5) + (1 if max_complexity > 10 else 0)
    complexity_hours = high_complexity_fns * 2

    # Security debt: Critical/High violations cost 4h each
    security_hours = 0
    rules_hours = 0
    for v in rule_violations:
        severity = v.get("severity", "Low") if isinstance(v, dict) else getattr(v, "severity", "Low")
        if severity in ("Critical", "High"):
            security_hours += 4
        else:
            rules_hours += 0.5

    # Testing debt: functions without tests cost 1h each
    total_functions = summary.get("functions", 0)
    tested_count = 0
    for badge in report.get("proof_badges", []):
        if badge.get("status") == "passed":
            tested_count += 1
    untested = max(0, total_functions - tested_count)
    testing_hours = untested * 1

    total = complexity_hours + security_hours + rules_hours + testing_hours

    return {
        "total_hours": round(total, 1),
        "by_category": {
            "complexity": round(complexity_hours, 1),
            "security": round(security_hours, 1),
            "rules": round(rules_hours, 1),
            "testing": round(testing_hours, 1),
        }
    }


def trend(snapshots: List[dict], days: int = 30) -> dict:
    """Compute quality score trend over a time range.

    Parameters
    ----------
    snapshots : list[dict]
        Each snapshot has ``{score, ts}`` where ``ts`` is a datetime or ISO string.

    days : int
        Number of days to look back.

    Returns
    -------
    dict
        ``{series: [{date, score}], slope, direction}``
    """
    if not snapshots:
        return {"series": [], "slope": 0.0, "direction": "stable"}

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    filtered = []
    for s in snapshots:
        ts = s.get("ts")
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if ts and ts >= cutoff:
            filtered.append({"date": ts.isoformat(), "score": s.get("score", 0)})

    if not filtered:
        return {"series": [], "slope": 0.0, "direction": "stable"}

    # Sort by date
    filtered.sort(key=lambda x: x["date"])

    # Calculate slope via simple linear regression
    n = len(filtered)
    if n < 2:
        return {"series": filtered, "slope": 0.0, "direction": "stable"}

    scores = [f["score"] for f in filtered]
    x_vals = list(range(n))
    x_mean = sum(x_vals) / n
    y_mean = sum(scores) / n

    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, scores))
    denominator = sum((x - x_mean) ** 2 for x in x_vals)

    slope = numerator / denominator if denominator != 0 else 0.0

    if slope > 0.5:
        direction = "improving"
    elif slope < -0.5:
        direction = "degrading"
    else:
        direction = "stable"

    return {
        "series": filtered,
        "slope": round(slope, 3),
        "direction": direction,
    }


def diff_snapshots(a: dict, b: dict) -> dict:
    """Compare two quality snapshots and return per-metric deltas.

    Parameters
    ----------
    a, b : dict
        Snapshot dicts with ``score``, ``metrics`` sub-dict.

    Returns
    -------
    dict
        ``{score_delta, metric_deltas: {metric: delta}}``
    """
    score_a = a.get("score", 0)
    score_b = b.get("score", 0)

    metrics_a = a.get("metrics", {})
    metrics_b = b.get("metrics", {})

    all_keys = set(list(metrics_a.keys()) + list(metrics_b.keys()))
    metric_deltas = {}
    for key in sorted(all_keys):
        val_a = metrics_a.get(key, 0)
        val_b = metrics_b.get(key, 0)
        if isinstance(val_a, (int, float)) and isinstance(val_b, (int, float)):
            metric_deltas[key] = round(val_b - val_a, 2)

    return {
        "score_delta": round(score_b - score_a, 1),
        "metric_deltas": metric_deltas,
    }


def build_snapshot(report: dict, user_id: str = "", project_id: str = "") -> dict:
    """Build a quality snapshot document ready for MongoDB insertion."""
    score = compute_quality_score(report)
    debt = estimate_tech_debt(report)
    summary = report.get("summary", {})

    return {
        "user_id": user_id,
        "project_id": project_id,
        "score": score,
        "tech_debt_hours": debt["total_hours"],
        "metrics": {
            "lines": summary.get("lines", 0),
            "functions": summary.get("functions", 0),
            "max_complexity": summary.get("max_complexity", 0),
            "findings": summary.get("findings", 0),
            "compliance_score": report.get("compliance_score", 100),
            "violations_count": len(report.get("rule_violations", [])),
        },
        "ts": datetime.now(timezone.utc),
    }
