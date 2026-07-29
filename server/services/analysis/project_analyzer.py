"""Multi-file project analysis engine.

YOUR code â€” no AI. Parses file trees, builds dependency graphs from
import/require statements, aggregates quality metrics per file, and
computes change-impact analysis.
"""
from __future__ import annotations

import os
import re
from typing import Any


# Language detection by file extension
_EXT_TO_LANG: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".java": "java",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".go": "go",
    ".rb": "ruby",
    ".php": "php",
    ".rs": "rust",
    ".swift": "swift",
    ".kt": "kotlin",
    ".cs": "csharp",
    ".r": "r",
    ".sh": "bash",
    ".html": "html",
    ".css": "css",
    ".sql": "sql",
    ".md": "markdown",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".xml": "xml",
    ".toml": "toml",
}

# File-type icon hints for frontend
_LANG_ICONS: dict[str, str] = {
    "python": "ðŸ",
    "javascript": "âš¡",
    "typescript": "ðŸ“˜",
    "java": "â˜•",
    "c": "ðŸ”§",
    "cpp": "ðŸ”§",
    "go": "ðŸ¹",
    "ruby": "ðŸ’Ž",
    "rust": "ðŸ¦€",
    "php": "ðŸ˜",
    "html": "ðŸŒ",
    "css": "ðŸŽ¨",
    "json": "ðŸ“‹",
    "markdown": "ðŸ“",
}


def detect_language(filepath: str) -> str | None:
    """Detect programming language from file extension."""
    _, ext = os.path.splitext(filepath.lower())
    return _EXT_TO_LANG.get(ext)


def get_language_icon(lang: str | None) -> str:
    """Return an icon hint for a language."""
    return _LANG_ICONS.get(lang or "", "ðŸ“„")


# ---------------------------------------------------------------------------
# File tree indexing
# ---------------------------------------------------------------------------

def index_files(files: list[dict[str, str]]) -> dict[str, Any]:
    """Build a nested tree structure from a flat file list.

    Args:
        files: list of {path, content} dicts.

    Returns:
        {
            "tree": nested tree structure,
            "flat": {path: {language, lines, size}},
            "total_lines": int,
            "total_files": int,
        }
    """
    flat: dict[str, dict[str, Any]] = {}
    for f in files:
        path = f["path"].replace("\\", "/").lstrip("/")
        content = f.get("content", "")
        lang = detect_language(path)
        lines = content.count("\n") + (1 if content and not content.endswith("\n") else 0)
        flat[path] = {
            "language": lang,
            "lines": lines,
            "size": len(content.encode("utf-8", errors="replace")),
            "icon": get_language_icon(lang),
        }

    # Build nested tree
    root: dict[str, Any] = {"name": "", "path": "", "type": "directory", "children": {}}
    for path, meta in flat.items():
        parts = path.split("/")
        node = root
        for i, part in enumerate(parts):
            current_path = "/".join(parts[: i + 1])
            if i == len(parts) - 1:
                # Leaf file
                node["children"][part] = {
                    "name": part,
                    "path": current_path,
                    "type": "file",
                    "language": meta["language"],
                    "lines": meta["lines"],
                    "size": meta["size"],
                    "icon": meta["icon"],
                }
            else:
                # Directory
                if part not in node["children"]:
                    node["children"][part] = {
                        "name": part,
                        "path": current_path,
                        "type": "directory",
                        "children": {},
                    }
                node = node["children"][part]

    total_lines = sum(m["lines"] for m in flat.values())

    return {
        "tree": _tree_to_list(root),
        "flat": flat,
        "total_lines": total_lines,
        "total_files": len(flat),
    }


def _tree_to_list(node: dict[str, Any]) -> list[dict[str, Any]]:
    """Convert children-dict tree into sorted children-list tree."""
    children = node.get("children", {})
    result: list[dict[str, Any]] = []
    # Sort: directories first, then files, alphabetical within each group
    sorted_items = sorted(
        children.values(),
        key=lambda x: (0 if x["type"] == "directory" else 1, x["name"].lower()),
    )
    for child in sorted_items:
        entry: dict[str, Any] = {
            "name": child["name"],
            "path": child["path"],
            "type": child["type"],
        }
        if child["type"] == "file":
            entry["language"] = child.get("language")
            entry["lines"] = child.get("lines")
            entry["size"] = child.get("size")
            entry["icon"] = child.get("icon", "ðŸ“„")
        else:
            entry["children"] = _tree_to_list(child)
        result.append(entry)
    return result


# ---------------------------------------------------------------------------
# Dependency graph builder
# ---------------------------------------------------------------------------

# Import patterns per language
_PYTHON_IMPORT_RE = re.compile(
    r"^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))", re.MULTILINE
)
_JS_IMPORT_RE = re.compile(
    r"""(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|"""
    r"""require\s*\(\s*['"]([^'"]+)['"]\s*\))""",
    re.MULTILINE,
)
_JAVA_IMPORT_RE = re.compile(r"^\s*import\s+([\w.]+);", re.MULTILINE)
_GO_IMPORT_RE = re.compile(r'^\s*"([^"]+)"', re.MULTILINE)
_CPP_INCLUDE_RE = re.compile(r'^\s*#include\s*"([^"]+)"', re.MULTILINE)


def _parse_imports(content: str, language: str | None) -> list[str]:
    """Extract import targets from source code for a given language."""
    if not language or not content:
        return []

    if language == "python":
        return [
            (m.group(1) or m.group(2))
            for m in _PYTHON_IMPORT_RE.finditer(content)
        ]
    if language in ("javascript", "typescript"):
        return [
            (m.group(1) or m.group(2))
            for m in _JS_IMPORT_RE.finditer(content)
        ]
    if language == "java":
        return [m.group(1) for m in _JAVA_IMPORT_RE.finditer(content)]
    if language == "go":
        return [m.group(1) for m in _GO_IMPORT_RE.finditer(content)]
    if language in ("c", "cpp"):
        return [m.group(1) for m in _CPP_INCLUDE_RE.finditer(content)]

    return []


def _resolve_import(
    import_target: str,
    source_path: str,
    all_paths: set[str],
    language: str | None,
) -> str | None:
    """Try to resolve an import string to an internal project file path."""
    if not language:
        return None

    if language == "python":
        # Convert dotted module to path: "utils.helpers" â†’ "utils/helpers.py"
        parts = import_target.replace(".", "/")
        candidates = [
            f"{parts}.py",
            f"{parts}/__init__.py",
        ]
        # Also try relative to source directory
        source_dir = os.path.dirname(source_path)
        if source_dir:
            candidates.extend([
                f"{source_dir}/{parts}.py",
                f"{source_dir}/{parts}/__init__.py",
            ])
        for c in candidates:
            normalized = c.replace("\\", "/").lstrip("/")
            if normalized in all_paths:
                return normalized

    elif language in ("javascript", "typescript"):
        # Resolve relative imports: "./utils" â†’ "src/utils.js"
        if import_target.startswith("."):
            source_dir = os.path.dirname(source_path)
            base = os.path.normpath(os.path.join(source_dir, import_target))
            base = base.replace("\\", "/")
            extensions = [".js", ".jsx", ".ts", ".tsx", "/index.js", "/index.ts"]
            # Try exact path first
            if base in all_paths:
                return base
            for ext in extensions:
                candidate = base + ext
                if candidate in all_paths:
                    return candidate

    elif language == "java":
        # "com.example.Foo" â†’ "com/example/Foo.java"
        candidate = import_target.replace(".", "/") + ".java"
        if candidate in all_paths:
            return candidate

    elif language in ("c", "cpp"):
        # Direct include path
        if import_target in all_paths:
            return import_target
        source_dir = os.path.dirname(source_path)
        if source_dir:
            candidate = f"{source_dir}/{import_target}"
            if candidate in all_paths:
                return candidate

    return None


def build_dependency_graph(
    files: list[dict[str, str]],
) -> dict[str, Any]:
    """Build cross-file dependency graph from import/require statements.

    Returns:
        {
            "graph": {file: [files it depends on]},
            "reverse_graph": {file: [files that depend on it]},
            "cycles": [[file1, file2, ...]],
        }
    """
    all_paths: set[str] = set()
    file_map: dict[str, dict[str, str]] = {}
    for f in files:
        path = f["path"].replace("\\", "/").lstrip("/")
        all_paths.add(path)
        file_map[path] = f

    graph: dict[str, list[str]] = {}
    reverse_graph: dict[str, list[str]] = {p: [] for p in all_paths}

    for path in all_paths:
        content = file_map[path].get("content", "")
        lang = detect_language(path)
        raw_imports = _parse_imports(content, lang)

        deps: list[str] = []
        for imp in raw_imports:
            resolved = _resolve_import(imp, path, all_paths, lang)
            if resolved and resolved != path:
                deps.append(resolved)

        graph[path] = sorted(set(deps))
        for dep in graph[path]:
            if dep in reverse_graph:
                reverse_graph[dep].append(path)

    # Sort reverse graph entries
    for key in reverse_graph:
        reverse_graph[key] = sorted(set(reverse_graph[key]))

    cycles = _detect_cycles(graph)

    return {
        "graph": graph,
        "reverse_graph": reverse_graph,
        "cycles": cycles,
    }


def _detect_cycles(graph: dict[str, list[str]]) -> list[list[str]]:
    """Detect cycles in the dependency graph using DFS."""
    visited: set[str] = set()
    in_stack: set[str] = set()
    stack: list[str] = []
    cycles: list[list[str]] = []

    def dfs(node: str) -> None:
        if node in in_stack:
            # Found a cycle â€” extract it
            cycle_start = stack.index(node)
            cycle = stack[cycle_start:] + [node]
            cycles.append(cycle)
            return
        if node in visited:
            return
        visited.add(node)
        in_stack.add(node)
        stack.append(node)
        for neighbor in graph.get(node, []):
            dfs(neighbor)
        stack.pop()
        in_stack.discard(node)

    for node in graph:
        if node not in visited:
            dfs(node)

    return cycles


def impact_of(path: str, reverse_graph: dict[str, list[str]]) -> list[str]:
    """Which files are impacted if this file changes (reverse dependencies)."""
    return reverse_graph.get(path, [])


# ---------------------------------------------------------------------------
# Project metrics aggregation
# ---------------------------------------------------------------------------

def aggregate_metrics(
    files: list[dict[str, str]],
) -> dict[str, Any]:
    """Run analysis on each file and aggregate project-level metrics.

    Returns per-file scores, language breakdown, avg score, and hotspots.
    """
    from services.analysis.code_intelligence import inspect_code_quality
    from utils.code_utils import estimate_complexity

    per_file: dict[str, dict[str, Any]] = {}
    language_counts: dict[str, int] = {}
    total_lines = 0
    scores: list[float] = []

    for f in files:
        path = f["path"].replace("\\", "/").lstrip("/")
        content = f.get("content", "")
        lang = detect_language(path)
        lines = content.count("\n") + (1 if content and not content.endswith("\n") else 0)
        total_lines += lines

        if lang:
            language_counts[lang] = language_counts.get(lang, 0) + 1

        file_data: dict[str, Any] = {
            "language": lang,
            "lines": lines,
            "size": len(content.encode("utf-8", errors="replace")),
        }

        # Only run deep analysis on code files (skip configs, docs, etc.)
        analyzable = lang in (
            "python", "javascript", "typescript", "java",
            "c", "cpp", "go", "ruby", "php", "rust",
        )
        if analyzable and content.strip():
            try:
                inspection = inspect_code_quality(content, lang)
                file_data["score"] = inspection.get("score", 0)
                file_data["health"] = inspection.get("summary", {}).get("health", "unknown")
                file_data["findings_count"] = inspection.get("severity_counts", {}).get("total", 0)
                file_data["max_complexity"] = inspection.get("summary", {}).get("max_complexity", 0)
                scores.append(file_data["score"])
            except Exception:
                file_data["score"] = 0
                file_data["health"] = "error"
                file_data["findings_count"] = 0

            try:
                complexity = estimate_complexity(content, lang or "python")
                file_data["time_complexity"] = complexity.get("time_complexity", "Unknown")
                file_data["space_complexity"] = complexity.get("space_complexity", "Unknown")
            except Exception:
                file_data["time_complexity"] = "Unknown"
                file_data["space_complexity"] = "Unknown"
        else:
            file_data["score"] = None
            file_data["health"] = "non-code"

        per_file[path] = file_data

    avg_score = round(sum(scores) / max(len(scores), 1), 1)

    # Hotspots: worst-scoring code files
    code_files = [
        {"path": p, **d}
        for p, d in per_file.items()
        if d.get("score") is not None
    ]
    hotspots = sorted(code_files, key=lambda x: x.get("score", 100))[:5]

    return {
        "total_lines": total_lines,
        "total_files": len(files),
        "language_breakdown": language_counts,
        "avg_score": avg_score,
        "hotspots": hotspots,
        "per_file": per_file,
    }
