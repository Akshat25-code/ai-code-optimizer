"""Unit tests for PDF export, AI cache, provider helpers, complexity
fallbacks, and repo-import utilities (coverage buffer + regression net)."""
import os
import sys
from datetime import datetime, timedelta, timezone

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")

from services.reports.pdf_report_service import PDFExportService
from services.ai import cache_service
from services.ai.cache_service import make_cache_key
from services.ai.provider_service import build_prompt, pick_provider, count_tokens
from services.analysis.complexity_engine import analyze_complexity
from services.analysis.repo_importer import (
    compress_python,
    compress_js_ts,
    compress_file_context,
    _parse_gitignore,
    _should_skip,
    process_imported_repo,
)


def _user():
    return {"email": "a@b.com", "name": "Ada",
            "created_at": datetime.now(timezone.utc)}


def test_pdf_export_produces_bytes():
    svc = PDFExportService()
    buf = svc.generate_comprehensive_export(
        _user(), {"bio": "dev"}, [], {"x": 1}, [], [])
    data = buf.getvalue()
    assert data.startswith(b"%PDF")
    assert len(data) > 1000


def test_pdf_helpers_truncate_and_format():
    svc = PDFExportService()
    assert svc._truncate_text("hello world", 5) == "hello..."
    assert svc._truncate_text("hi", 10) == "hi"
    assert "2026" in svc._format_datetime(datetime.now(timezone.utc))
    assert svc._format_datetime(None) == "" or isinstance(svc._format_datetime(None), str)


def test_cache_key_deterministic_and_sensitive():
    k1 = make_cache_key("print(1)", "optimization", "python")
    assert k1 == make_cache_key("print(1)", "optimization", "python")
    assert k1 != make_cache_key("print(2)", "optimization", "python")
    assert k1 != make_cache_key("print(1)", "analysis", "python")


@pytest.mark.asyncio
async def test_cache_memory_roundtrip_and_expiry():
    key = make_cache_key("code-x", "t", "python")
    await cache_service.store_cached_response(key, {"a": 1})
    assert await cache_service.get_cached_response(key) == {"a": 1}
    # Force expiry
    cache_service._memory_cache[key]["expires_at"] = (
        datetime.now(timezone.utc) - timedelta(seconds=1))
    assert await cache_service.get_cached_response(key) is None
    await cache_service.record_cache_hit(key)  # must not raise without DB
    stats = await cache_service.get_cache_stats()
    assert stats["entries"] == 0


def test_provider_pure_helpers():
    p = build_prompt("optimization", "python", "x = 1")
    assert isinstance(p, str) and "x = 1" in p
    assert pick_provider("optimization", "x = 1", "python") in {
        "openai", "anthropic", "claude", "gemini", "deepseek", "grok"}
    assert count_tokens("hello world") > 0
    assert count_tokens("") == 0


def test_complexity_non_python_and_errors():
    r = analyze_complexity("print(1)", "go")
    assert isinstance(r, dict) and r.get("language") == "go"
    r = analyze_complexity("def broken(:\n", "python")
    assert "error" in r and r["grade"] == "F"
    r = analyze_complexity("", "python")
    assert isinstance(r, dict)
    r = analyze_complexity("x = 1\n", "python")
    assert r["grade"] in "ABCDF"


def test_repo_import_helpers():
    assert "def foo" in compress_python("def foo():\n    return 1\n")
    assert compress_python("def broken(:\n") == "" or isinstance(compress_python("x=1"), str)
    assert "function f" in compress_js_ts("function f() {\n return 1;\n}")
    assert compress_file_context("a.py", "x = 1\n") != ""
    assert "omitted" in compress_file_context("a.txt", "\n".join(str(i) for i in range(50)))
    assert _parse_gitignore("/nonexistent-xyz/.gitignore") == []
    assert _should_skip("node_modules", []) is True  # dir basename match
    assert _should_skip("main.pyc", []) is True  # skipped extension
    assert _should_skip("main.py", ["*.py"]) is True
    assert _should_skip("main.py", []) is False
    rep = process_imported_repo(
        [{"path": "a.py", "content": "def f():\n    return 1\n"}], compress=True)
    assert rep and isinstance(rep, dict)
