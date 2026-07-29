"""Tests for project_analyzer â€” file indexing, dependency graph, metrics."""
from __future__ import annotations

import pytest

from services.analysis.project_analyzer import (
    detect_language,
    index_files,
    build_dependency_graph,
    impact_of,
    aggregate_metrics,
)


# ---------------------------------------------------------------------------
# Sample project fixtures
# ---------------------------------------------------------------------------

PYTHON_PROJECT = [
    {"path": "main.py", "content": "from utils import helper\nimport math\n\ndef main():\n    print(helper.greet())\n\nmain()\n"},
    {"path": "utils/helper.py", "content": "from utils.constants import GREETING\n\ndef greet():\n    return GREETING\n"},
    {"path": "utils/__init__.py", "content": ""},
    {"path": "utils/constants.py", "content": "GREETING = 'Hello, World!'\n"},
    {"path": "tests/test_main.py", "content": "from main import main\n\ndef test_main():\n    pass\n"},
]

JS_PROJECT = [
    {"path": "src/index.js", "content": "import { greet } from './utils/helper';\nconsole.log(greet());\n"},
    {"path": "src/utils/helper.js", "content": "import { GREETING } from './constants';\nexport const greet = () => GREETING;\n"},
    {"path": "src/utils/constants.js", "content": "export const GREETING = 'Hello';\n"},
    {"path": "package.json", "content": '{"name": "test"}'},
]

CYCLE_PROJECT = [
    {"path": "a.py", "content": "from b import foo\ndef bar(): pass\n"},
    {"path": "b.py", "content": "from a import bar\ndef foo(): pass\n"},
]


# ---------------------------------------------------------------------------
# Language detection
# ---------------------------------------------------------------------------

class TestDetectLanguage:
    def test_python(self):
        assert detect_language("main.py") == "python"

    def test_javascript(self):
        assert detect_language("src/app.js") == "javascript"

    def test_typescript(self):
        assert detect_language("app.tsx") == "typescript"

    def test_java(self):
        assert detect_language("Main.java") == "java"

    def test_unknown(self):
        assert detect_language("Makefile") is None

    def test_case_insensitive_extension(self):
        assert detect_language("APP.PY") == "python"


# ---------------------------------------------------------------------------
# File tree indexing
# ---------------------------------------------------------------------------

class TestIndexFiles:
    def test_basic_tree_structure(self):
        result = index_files(PYTHON_PROJECT)
        assert result["total_files"] == 5
        assert result["total_lines"] > 0

        tree = result["tree"]
        # Root should have directories and files
        names = {node["name"] for node in tree}
        assert "main.py" in names
        assert "utils" in names
        assert "tests" in names

    def test_directory_nodes_have_children(self):
        result = index_files(PYTHON_PROJECT)
        tree = result["tree"]
        utils_dir = next(n for n in tree if n["name"] == "utils")
        assert utils_dir["type"] == "directory"
        assert len(utils_dir["children"]) == 3  # __init__.py, constants.py, helper.py

    def test_file_nodes_have_metadata(self):
        result = index_files(PYTHON_PROJECT)
        flat = result["flat"]
        assert "main.py" in flat
        assert flat["main.py"]["language"] == "python"
        assert flat["main.py"]["lines"] > 0

    def test_empty_project(self):
        result = index_files([{"path": "empty.py", "content": ""}])
        assert result["total_files"] == 1

    def test_windows_path_normalized(self):
        files = [{"path": "src\\utils\\helper.py", "content": "x = 1\n"}]
        result = index_files(files)
        assert "src/utils/helper.py" in result["flat"]

    def test_directories_sorted_before_files(self):
        result = index_files(PYTHON_PROJECT)
        tree = result["tree"]
        types = [n["type"] for n in tree]
        # All directories should come before files
        dir_indices = [i for i, t in enumerate(types) if t == "directory"]
        file_indices = [i for i, t in enumerate(types) if t == "file"]
        if dir_indices and file_indices:
            assert max(dir_indices) < min(file_indices)


# ---------------------------------------------------------------------------
# Dependency graph
# ---------------------------------------------------------------------------

class TestDependencyGraph:
    def test_python_imports_resolved(self):
        dep = build_dependency_graph(PYTHON_PROJECT)
        graph = dep["graph"]
        # main.py imports from utils (which resolves to utils/__init__.py or utils/helper.py)
        # The exact resolution depends on import name
        assert "main.py" in graph

    def test_reverse_graph(self):
        dep = build_dependency_graph(PYTHON_PROJECT)
        reverse = dep["reverse_graph"]
        # utils/constants.py is imported by utils/helper.py
        assert "utils/constants.py" in reverse
        assert "utils/helper.py" in reverse["utils/constants.py"]

    def test_cycle_detection(self):
        dep = build_dependency_graph(CYCLE_PROJECT)
        assert len(dep["cycles"]) > 0
        # Cycle should involve a.py and b.py
        cycle_files = set()
        for cycle in dep["cycles"]:
            cycle_files.update(cycle)
        assert "a.py" in cycle_files
        assert "b.py" in cycle_files

    def test_js_imports_resolved(self):
        dep = build_dependency_graph(JS_PROJECT)
        graph = dep["graph"]
        assert "src/index.js" in graph
        assert "src/utils/helper.js" in graph["src/index.js"]

    def test_js_transitive_deps(self):
        dep = build_dependency_graph(JS_PROJECT)
        graph = dep["graph"]
        # helper.js â†’ constants.js
        assert "src/utils/constants.js" in graph["src/utils/helper.js"]

    def test_self_import_excluded(self):
        files = [{"path": "a.py", "content": "import a\n"}]
        dep = build_dependency_graph(files)
        assert "a.py" not in dep["graph"].get("a.py", [])

    def test_no_dependencies(self):
        files = [{"path": "standalone.py", "content": "print('hello')\n"}]
        dep = build_dependency_graph(files)
        assert dep["graph"]["standalone.py"] == []
        assert dep["cycles"] == []


# ---------------------------------------------------------------------------
# Impact analysis
# ---------------------------------------------------------------------------

class TestImpactOf:
    def test_impact_returns_dependents(self):
        dep = build_dependency_graph(PYTHON_PROJECT)
        impacted = impact_of("utils/constants.py", dep["reverse_graph"])
        assert "utils/helper.py" in impacted

    def test_impact_of_leaf_file(self):
        dep = build_dependency_graph(PYTHON_PROJECT)
        impacted = impact_of("tests/test_main.py", dep["reverse_graph"])
        assert impacted == []

    def test_impact_of_unknown_file(self):
        dep = build_dependency_graph(PYTHON_PROJECT)
        impacted = impact_of("nonexistent.py", dep["reverse_graph"])
        assert impacted == []


# ---------------------------------------------------------------------------
# Aggregate metrics
# ---------------------------------------------------------------------------

class TestAggregateMetrics:
    def test_basic_aggregation(self):
        metrics = aggregate_metrics(PYTHON_PROJECT)
        assert metrics["total_files"] == 5
        assert metrics["total_lines"] > 0
        assert "python" in metrics["language_breakdown"]
        assert isinstance(metrics["avg_score"], float)

    def test_hotspots_capped_at_5(self):
        # Create 10 files
        files = [
            {"path": f"file_{i}.py", "content": f"x = {i}\n" * (i + 1)}
            for i in range(10)
        ]
        metrics = aggregate_metrics(files)
        assert len(metrics["hotspots"]) <= 5

    def test_per_file_has_scores(self):
        metrics = aggregate_metrics(PYTHON_PROJECT)
        for path, data in metrics["per_file"].items():
            if data.get("language") == "python" and path != "utils/__init__.py":
                assert "score" in data

    def test_non_code_files_marked(self):
        files = [
            {"path": "README.md", "content": "# Hello\n"},
            {"path": "data.json", "content": "{}"},
        ]
        metrics = aggregate_metrics(files)
        for path, data in metrics["per_file"].items():
            assert data["health"] == "non-code"
