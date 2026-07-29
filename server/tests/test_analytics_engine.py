"""Tests for the Analytics Engine."""
import pytest
from datetime import datetime, timezone, timedelta
from services.analysis.analytics_engine import (
    compute_quality_score,
    estimate_tech_debt,
    trend,
    diff_snapshots,
    build_snapshot,
)


def _make_report(
    lines=100, functions=5, max_complexity=5, findings=2,
    violations=None, compliance_score=100, badges_passed=3, badges_total=5,
):
    """Helper to build a realistic inspection report dict."""
    proof_badges = []
    for i in range(badges_total):
        proof_badges.append({
            "label": f"Check {i}",
            "status": "passed" if i < badges_passed else "failed",
        })
    return {
        "summary": {
            "lines": lines,
            "functions": functions,
            "max_complexity": max_complexity,
            "findings": findings,
        },
        "rule_violations": violations or [],
        "compliance_score": compliance_score,
        "proof_badges": proof_badges,
    }


# --------------- compute_quality_score ---------------

def test_quality_score_perfect():
    """Clean code should score close to 100."""
    report = _make_report(
        max_complexity=1, findings=0, compliance_score=100,
        badges_passed=5, badges_total=5,
    )
    score = compute_quality_score(report)
    assert 90 <= score <= 100


def test_quality_score_terrible():
    """Bad code should score well below 50."""
    report = _make_report(
        max_complexity=30, findings=20, compliance_score=0,
        badges_passed=0, badges_total=5,
        violations=[{"severity": "Critical"}] * 10,
    )
    score = compute_quality_score(report)
    assert score < 30


def test_quality_score_clamped():
    """Score should never exceed 100 or go below 0."""
    report_good = _make_report(max_complexity=0, findings=0, compliance_score=100,
                               badges_passed=5, badges_total=5)
    assert 0 <= compute_quality_score(report_good) <= 100

    report_bad = _make_report(max_complexity=100, findings=100, compliance_score=0,
                              badges_passed=0, badges_total=5)
    assert 0 <= compute_quality_score(report_bad) <= 100


# --------------- estimate_tech_debt ---------------

def test_tech_debt_clean():
    """Clean code should have minimal debt."""
    report = _make_report(max_complexity=5, badges_passed=5, badges_total=5)
    debt = estimate_tech_debt(report)
    assert debt["total_hours"] == 0
    assert debt["by_category"]["complexity"] == 0
    assert debt["by_category"]["security"] == 0


def test_tech_debt_with_violations():
    """Security violations should add 4h each."""
    report = _make_report(
        violations=[{"severity": "Critical"}, {"severity": "High"}],
        compliance_score=50,
    )
    debt = estimate_tech_debt(report)
    assert debt["by_category"]["security"] == 8  # 2 Ã— 4h


def test_tech_debt_with_complexity():
    """High complexity should add debt hours."""
    report = _make_report(max_complexity=25)
    debt = estimate_tech_debt(report)
    assert debt["by_category"]["complexity"] > 0


# --------------- trend ---------------

def test_trend_improving():
    """Improving scores should have positive slope."""
    now = datetime.now(timezone.utc)
    snapshots = [
        {"score": 40, "ts": now - timedelta(days=10)},
        {"score": 55, "ts": now - timedelta(days=7)},
        {"score": 70, "ts": now - timedelta(days=4)},
        {"score": 85, "ts": now - timedelta(days=1)},
    ]
    result = trend(snapshots, days=30)
    assert result["slope"] > 0
    assert result["direction"] == "improving"
    assert len(result["series"]) == 4


def test_trend_degrading():
    """Degrading scores should have negative slope."""
    now = datetime.now(timezone.utc)
    snapshots = [
        {"score": 90, "ts": now - timedelta(days=10)},
        {"score": 70, "ts": now - timedelta(days=7)},
        {"score": 50, "ts": now - timedelta(days=4)},
        {"score": 30, "ts": now - timedelta(days=1)},
    ]
    result = trend(snapshots, days=30)
    assert result["slope"] < 0
    assert result["direction"] == "degrading"


def test_trend_empty():
    """Empty snapshots should return stable."""
    result = trend([], days=30)
    assert result["direction"] == "stable"
    assert result["series"] == []


def test_trend_filters_by_range():
    """Only snapshots within range should be included."""
    now = datetime.now(timezone.utc)
    snapshots = [
        {"score": 50, "ts": now - timedelta(days=60)},  # outside 30d
        {"score": 80, "ts": now - timedelta(days=5)},   # inside 30d
    ]
    result = trend(snapshots, days=30)
    assert len(result["series"]) == 1


# --------------- diff_snapshots ---------------

def test_diff_snapshots():
    """Deltas should correctly compute differences."""
    a = {"score": 60, "metrics": {"lines": 100, "functions": 5, "max_complexity": 12}}
    b = {"score": 80, "metrics": {"lines": 90, "functions": 7, "max_complexity": 8}}

    result = diff_snapshots(a, b)
    assert result["score_delta"] == 20
    assert result["metric_deltas"]["lines"] == -10
    assert result["metric_deltas"]["functions"] == 2
    assert result["metric_deltas"]["max_complexity"] == -4


def test_diff_snapshots_missing_keys():
    """Missing metrics in one snapshot should still work."""
    a = {"score": 50, "metrics": {"lines": 100}}
    b = {"score": 70, "metrics": {"lines": 80, "functions": 3}}

    result = diff_snapshots(a, b)
    assert result["score_delta"] == 20
    assert "functions" in result["metric_deltas"]


# --------------- build_snapshot ---------------

def test_build_snapshot():
    """Snapshot should contain all required fields."""
    report = _make_report(max_complexity=15, findings=3, compliance_score=75)
    snapshot = build_snapshot(report, user_id="user123", project_id="proj456")

    assert snapshot["user_id"] == "user123"
    assert snapshot["project_id"] == "proj456"
    assert 0 <= snapshot["score"] <= 100
    assert snapshot["tech_debt_hours"] >= 0
    assert "ts" in snapshot
    assert "metrics" in snapshot
    assert snapshot["metrics"]["max_complexity"] == 15
