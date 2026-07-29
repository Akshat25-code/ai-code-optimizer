"""Tests for Docker sandbox, output comparator, and performance profiler."""
import pytest
from services.execution.output_comparator import compare
from services.execution.docker_runner import should_use_docker, LANGUAGE_IMAGES


# --------------- Output comparator ---------------

def test_compare_exact_match():
    assert compare("hello\nworld", "hello\nworld", "exact")["match"] is True


def test_compare_exact_mismatch():
    result = compare("hello\nworld", "hello\nplanet", "exact")
    assert result["match"] is False
    assert "world" in result["diff_summary"]


def test_compare_exact_trailing_whitespace():
    """Trailing whitespace per line should be stripped."""
    assert compare("hello  \nworld", "hello\nworld", "exact")["match"] is True


def test_compare_numeric_tolerance_match():
    result = compare("3.14159", "3.14160", "numeric_tolerance", epsilon=0.001)
    assert result["match"] is True


def test_compare_numeric_tolerance_mismatch():
    result = compare("3.14159", "2.71828", "numeric_tolerance", epsilon=0.001)
    assert result["match"] is False


def test_compare_numeric_count_mismatch():
    result = compare("1 2 3", "1 2", "numeric_tolerance")
    assert result["match"] is False
    assert "count" in result["diff_summary"].lower()


def test_compare_order_independent_match():
    result = compare("banana\napple\ncherry", "cherry\napple\nbanana", "order_independent")
    assert result["match"] is True


def test_compare_order_independent_mismatch():
    result = compare("banana\napple", "cherry\napple", "order_independent")
    assert result["match"] is False


def test_compare_unknown_mode():
    result = compare("a", "b", "unknown_mode")
    assert result["match"] is False
    assert "Unknown" in result["diff_summary"]


# --------------- Docker runner ---------------

def test_language_images_populated():
    """All expected languages should have Docker images configured."""
    expected = {"python", "javascript", "java", "c", "cpp", "go", "ruby", "php"}
    assert expected.issubset(set(LANGUAGE_IMAGES.keys()))


def test_should_use_docker_respects_env(monkeypatch):
    """USE_DOCKER_SANDBOX=0 should disable Docker."""
    monkeypatch.setenv("USE_DOCKER_SANDBOX", "0")
    assert should_use_docker() is False


# --------------- Performance profiler (unit-level) ---------------

def test_profile_code_unsupported_language():
    from services.execution.performance_profiler import profile_code
    result = profile_code("x = 1", "rust")
    assert result["ok"] is False
    assert "not supported" in result["error"].lower()
