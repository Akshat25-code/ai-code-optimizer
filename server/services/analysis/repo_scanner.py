"""Repository-level static analysis from uploaded file trees."""
from __future__ import annotations

import hashlib
import os
import re
from collections import Counter
from typing import Any

from services.analysis.code_intelligence import inspect_code_quality
from services.analysis.secret_scanner import scan_secrets

LANG_BY_EXT = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
}

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "env", "dist", "build", ".pytest_cache"}
MAX_FILE_BYTES = 200_000
MAX_FILES = 500


def _detect_language(path: str) -> str:
    _, ext = os.path.splitext(path.lower())
    return LANG_BY_EXT.get(ext, "Unknown")


def _chunk_hash(content: str, min_lines: int = 6) -> str | None:
    lines = [ln.strip() for ln in content.splitlines() if ln.strip() and not ln.strip().startswith("#")]
    if len(lines) < min_lines:
        return None
    normalized = "\n".join(lines[: min_lines])
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def scan_repository(files: list[dict[str, str]]) -> dict[str, Any]:
    """Scan a list of {path, content} dicts."""
    if len(files) > MAX_FILES:
        files = files[:MAX_FILES]

    languages: Counter[str] = Counter()
    total_lines = 0
    issues: list[dict[str, Any]] = []
    file_scores: list[dict[str, Any]] = []
    secret_findings: list[dict[str, Any]] = []
    chunk_map: dict[str, list[str]] = {}
    files_without_tests: list[str] = []
    complexity_hotspots: list[dict[str, Any]] = []

    for item in files:
        path = item.get("path", "").replace("\\", "/")
        content = item.get("content", "")
        if not path or not content:
            continue
        parts = path.split("/")
        if any(p in SKIP_DIRS for p in parts):
            continue
        if len(content.encode("utf-8")) > MAX_FILE_BYTES:
            continue

        lang = _detect_language(path)
        languages[lang] += 1
        line_count = len(content.splitlines())
        total_lines += line_count

        secret_report = scan_secrets(content, path)
        secret_findings.extend(secret_report["findings"])

        if lang in {"Python", "JavaScript", "TypeScript"}:
            try:
                report = inspect_code_quality(content, lang)
                score = report.get("score", 0)
                file_scores.append({"path": path, "score": score, "language": lang})
                for finding in report.get("findings", [])[:5]:
                    issues.append({**finding, "file": path})
                max_cx = report.get("metrics", {}).get("max_complexity", 0)
                if max_cx >= 10:
                    complexity_hotspots.append({"path": path, "max_complexity": max_cx, "score": score})
            except Exception:
                pass

        h = _chunk_hash(content)
        if h:
            chunk_map.setdefault(h, []).append(path)

        if lang == "Python" and path.endswith(".py") and not path.startswith("test_") and "/test" not in path:
            base = os.path.splitext(os.path.basename(path))[0]
            test_candidates = {f"test_{base}.py", f"{base}_test.py"}
            has_test = any(
                os.path.basename(f.get("path", "")) in test_candidates for f in files
            )
            if not has_test and "test" not in base.lower():
                files_without_tests.append(path)

    duplicates = [
        {"hash": h, "files": paths, "count": len(paths)}
        for h, paths in chunk_map.items()
        if len(paths) > 1
    ]
    duplicates.sort(key=lambda x: x["count"], reverse=True)

    avg_score = round(sum(f["score"] for f in file_scores) / max(1, len(file_scores)), 1)
    penalty = min(40, len(secret_findings) * 5 + len(complexity_hotspots) * 3 + len(duplicates) * 2)
    health = max(0, min(100, int(avg_score - penalty * 0.5)))

    file_scores.sort(key=lambda x: x["score"])
    risky_files = file_scores[:10]

    return {
        "engine": "repo-scanner-v1",
        "summary": {
            "file_count": len(file_scores),
            "total_lines": total_lines,
            "languages": dict(languages),
            "health_score": health,
        },
        "health_score": health,
        "issues": {
            "high_complexity": complexity_hotspots[:10],
            "possible_secrets": secret_findings[:20],
            "files_without_tests": files_without_tests[:20],
            "duplicated_blocks": duplicates[:10],
            "all_findings": issues[:30],
        },
        "risky_files": risky_files,
        "recommendations": _recommendations(health, secret_findings, complexity_hotspots, files_without_tests),
    }


def _recommendations(health, secrets, hotspots, no_tests) -> list[str]:
    recs: list[str] = []
    if secrets:
        recs.append(f"Redact or remove {len(secrets)} possible secret(s) before sharing code.")
    if hotspots:
        recs.append(f"Refactor {len(hotspots)} high-complexity function(s).")
    if no_tests:
        recs.append(f"Add tests for {len(no_tests)} untested file(s).")
    if health < 60:
        recs.append("Project health is below 60 â€” prioritize security and complexity fixes.")
    elif health >= 85:
        recs.append("Project health is strong â€” focus on targeted optimizations.")
    return recs or ["No critical repository issues detected."]
