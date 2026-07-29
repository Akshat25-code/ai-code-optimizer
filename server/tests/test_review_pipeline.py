"""Tests for the Multi-Stage Review Pipeline."""
import pytest
import asyncio
from services.analysis.review_pipeline import (
    Finding,
    StaticAnalysisStage,
    SecurityScanStage,
    PerformanceStage,
    AggregationStage,
    ReviewPipeline,
)


def test_aggregation_deduplication_and_boosting():
    """Test that AggregationStage merges duplicates and boosts confidence."""
    stage = AggregationStage()

    findings = [
        Finding(stage="Static", category="security", severity="High", confidence=0.8, line=10, message="SQL Injection"),
        Finding(stage="Security", category="security", severity="High", confidence=0.9, line=10, message="SQL Injection vulnerability"),
    ]

    aggregated = stage.execute(findings)

    # Should dedupe to 1 finding because line=10 and category=security match
    assert len(aggregated) == 1

    f = aggregated[0]
    # Confidence formula: 1 - (1-0.8)*(1-0.9) = 1 - 0.2*0.1 = 1 - 0.02 = 0.98
    assert f.confidence == pytest.approx(0.98)
    assert "Static" in f.stage and "Security" in f.stage


def test_aggregation_ranking():
    """Test that AggregationStage ranks by severity * confidence."""
    stage = AggregationStage()

    findings = [
        Finding(stage="A", category="complexity", severity="Low", confidence=0.9, line=1, message="Msg"),
        Finding(stage="A", category="security", severity="Critical", confidence=0.8, line=2, message="Msg"),
        Finding(stage="A", category="performance", severity="Medium", confidence=0.5, line=3, message="Msg"),
    ]

    aggregated = stage.execute(findings)
    assert len(aggregated) == 3

    # Critical (1.0 * 0.8 = 0.8) should be first
    assert aggregated[0].severity == "Critical"
    # Low (0.2 * 0.9 = 0.18) vs Medium (0.5 * 0.5 = 0.25). Medium should be second.
    assert aggregated[1].severity == "Medium"
    assert aggregated[2].severity == "Low"


@pytest.mark.asyncio
async def test_pipeline_quick_review():
    """Test that a Quick Review skips AI and runs without error."""
    pipeline = ReviewPipeline()

    code = """
def complex_func(a, b):
    # This function has O(N) loops and some dead code
    unused_var = 42
    for i in range(a):
        for j in range(b):
            print(i, j)
    """

    report = await pipeline.run(code, "python", skip_ai=True)

    assert "total_findings" in report
    assert "findings_by_category" in report
    assert "ranked_findings" in report

    # Ensure AI stage was skipped (findings won't have 'AI Review' as a stage unless mocked differently,
    # but at least it shouldn't error out trying to call an invalid API key).
    for f in report["ranked_findings"]:
        assert "AI Review" not in f["stage"]
