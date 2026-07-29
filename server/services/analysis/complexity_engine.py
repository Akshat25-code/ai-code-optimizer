"""
Full AST-based code complexity analysis engine.

Pure computer science â€” zero AI. YOUR algorithms analyze code structure.

Features:
- Cognitive complexity (SonarQube-style)
- Cyclomatic complexity per function
- Halstead metrics (volume, difficulty, effort)
- Maintainability Index (MI)
- Dead code detection (unused functions/variables)
- Call graph builder
- Time/space complexity estimation
- Per-function and aggregate scoring
"""
from __future__ import annotations

import ast
import math
from dataclasses import dataclass, field, asdict
from typing import Any

from utils.code_utils import estimate_complexity


# ---------------------------------------------------------------------------
# Data classes for structured output
# ---------------------------------------------------------------------------

@dataclass
class FunctionMetrics:
    name: str
    line: int
    end_line: int
    loc: int
    args: list[str]
    is_async: bool
    has_docstring: bool
    cyclomatic_complexity: int = 0
    cognitive_complexity: int = 0
    time_complexity: str = "O(1)"
    space_complexity: str = "O(1)"
    complexity_explanation: str = ""
    halstead: dict[str, float] = field(default_factory=dict)
    maintainability_index: float = 100.0
    is_recursive: bool = False
    calls: list[str] = field(default_factory=list)
    called_by: list[str] = field(default_factory=list)
    grade: str = "A"


@dataclass
class DeadCodeItem:
    kind: str  # "function", "variable", "import"
    name: str
    line: int
    reason: str


@dataclass
class ComplexityReport:
    language: str
    total_lines: int
    non_empty_lines: int
    functions: list[FunctionMetrics]
    classes: list[dict]
    imports: list[str]
    dead_code: list[DeadCodeItem]
    call_graph: dict[str, list[str]]
    aggregate: dict[str, Any]
    grade: str
    score: int  # 0-100
    recommendations: list[str]


# ---------------------------------------------------------------------------
# Cognitive Complexity (SonarQube-style)
# ---------------------------------------------------------------------------

def _cognitive_complexity(node: ast.AST) -> int:
    """Calculate cognitive complexity per SonarQube spec.

    Rules:
    - +1 for each break in linear flow (if, for, while, except, etc.)
    - +1 for each nesting level of these structures
    - +1 for boolean sequences (and/or chains)
    - No increment for else without nested conditions
    """
    total = 0

    def walk(n: ast.AST, nesting: int = 0) -> None:
        nonlocal total

        # Structures that add complexity AND increase nesting
        flow_breakers = (
            ast.If, ast.For, ast.AsyncFor, ast.While,
            ast.ExceptHandler,
        )

        for child in ast.iter_child_nodes(n):
            if isinstance(child, flow_breakers):
                total += 1 + nesting  # +1 inherent + nesting penalty
                walk(child, nesting + 1)
            elif isinstance(child, (ast.BoolOp,)):
                # Each boolean operator chain adds 1
                total += 1
                walk(child, nesting)
            elif isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                # Nested function increases nesting but doesn't add to parent
                walk(child, nesting + 1)
            elif isinstance(child, ast.Lambda):
                total += 1 + nesting
                walk(child, nesting + 1)
            elif isinstance(child, (ast.IfExp,)):
                # Ternary expression
                total += 1 + nesting
                walk(child, nesting)
            elif isinstance(child, (ast.Try,)):
                walk(child, nesting)
            else:
                walk(child, nesting)

    walk(node)
    return total


# ---------------------------------------------------------------------------
# Cyclomatic Complexity
# ---------------------------------------------------------------------------

def _cyclomatic_complexity(node: ast.AST) -> int:
    """Classic cyclomatic complexity: 1 + number of decision points."""
    cc = 1
    for child in ast.walk(node):
        if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor,
                              ast.ExceptHandler, ast.With, ast.AsyncWith,
                              ast.Assert)):
            cc += 1
        elif isinstance(child, ast.BoolOp):
            # Each and/or adds a path
            cc += len(child.values) - 1
    return cc


# ---------------------------------------------------------------------------
# Halstead Metrics
# ---------------------------------------------------------------------------

def _halstead_metrics(node: ast.AST) -> dict[str, float]:
    """Calculate Halstead complexity metrics from AST.

    Returns: n1 (unique operators), n2 (unique operands),
             N1 (total operators), N2 (total operands),
             vocabulary, length, volume, difficulty, effort, bugs_estimate
    """
    operators: list[str] = []
    operands: list[str] = []

    for child in ast.walk(node):
        # Operators
        if isinstance(child, ast.BinOp):
            operators.append(type(child.op).__name__)
        elif isinstance(child, ast.UnaryOp):
            operators.append(type(child.op).__name__)
        elif isinstance(child, ast.BoolOp):
            operators.append(type(child.op).__name__)
        elif isinstance(child, ast.Compare):
            for op in child.ops:
                operators.append(type(op).__name__)
        elif isinstance(child, ast.AugAssign):
            operators.append(type(child.op).__name__ + "=")
        elif isinstance(child, ast.Assign):
            operators.append("=")
        elif isinstance(child, ast.Call):
            operators.append("()")
        elif isinstance(child, ast.Subscript):
            operators.append("[]")
        elif isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
            operators.append(type(child).__name__.lower())
        elif isinstance(child, ast.Return):
            operators.append("return")
        elif isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
            operators.append("def")

        # Operands
        if isinstance(child, ast.Name):
            operands.append(child.id)
        elif isinstance(child, ast.Constant):
            operands.append(str(child.value))
        elif isinstance(child, ast.Attribute):
            operands.append(child.attr)

    n1 = len(set(operators))
    n2 = len(set(operands))
    N1 = len(operators)
    N2 = len(operands)

    vocabulary = n1 + n2
    length = N1 + N2

    if vocabulary == 0:
        return {
            "n1": 0, "n2": 0, "N1": 0, "N2": 0,
            "vocabulary": 0, "length": 0, "volume": 0,
            "difficulty": 0, "effort": 0, "bugs_estimate": 0,
        }

    volume = length * math.log2(max(vocabulary, 1))
    difficulty = (n1 / 2.0) * (N2 / max(n2, 1))
    effort = volume * difficulty
    bugs_estimate = volume / 3000.0

    return {
        "n1": n1, "n2": n2, "N1": N1, "N2": N2,
        "vocabulary": vocabulary,
        "length": length,
        "volume": round(volume, 2),
        "difficulty": round(difficulty, 2),
        "effort": round(effort, 2),
        "bugs_estimate": round(bugs_estimate, 3),
    }


# ---------------------------------------------------------------------------
# Maintainability Index
# ---------------------------------------------------------------------------

def _maintainability_index(
    halstead_volume: float,
    cyclomatic: int,
    loc: int,
    comment_ratio: float = 0.0,
) -> float:
    """Calculate Maintainability Index (MI).

    MI = 171 - 5.2 * ln(V) - 0.23 * CC - 16.2 * ln(LOC) + 50 * sin(sqrt(2.4 * CM))

    Where V = Halstead Volume, CC = Cyclomatic Complexity,
    LOC = Lines of Code, CM = Comment ratio (0-1).
    """
    if loc <= 0 or halstead_volume <= 0:
        return 100.0

    mi = (
        171.0
        - 5.2 * math.log(max(halstead_volume, 1))
        - 0.23 * cyclomatic
        - 16.2 * math.log(max(loc, 1))
        + 50.0 * math.sin(math.sqrt(2.4 * comment_ratio))
    )
    # Normalize to 0-100
    return max(0.0, min(100.0, round(mi, 2)))


# ---------------------------------------------------------------------------
# Dead Code Detection
# ---------------------------------------------------------------------------

def _detect_dead_code(tree: ast.Module) -> list[DeadCodeItem]:
    """Find functions and variables that are defined but never used."""
    dead: list[DeadCodeItem] = []

    # Collect all defined names
    defined_functions: dict[str, int] = {}
    defined_variables: dict[str, int] = {}
    imported_names: dict[str, int] = {}

    # Collect all referenced names
    referenced: set[str] = set()

    for node in ast.walk(tree):
        # Definitions
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # Skip dunder methods and test functions
            if not node.name.startswith("_") or node.name.startswith("__"):
                if not node.name.startswith("__"):
                    defined_functions[node.name] = node.lineno
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and not target.id.startswith("_"):
                    defined_variables[target.id] = node.lineno
        elif isinstance(node, ast.Import):
            for alias in node.names:
                name = alias.asname or alias.name
                imported_names[name] = node.lineno
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                name = alias.asname or alias.name
                imported_names[name] = node.lineno

    # Collect references (usages)
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            referenced.add(node.id)
        elif isinstance(node, ast.Attribute):
            # a.b â€” 'a' is referenced
            if isinstance(node.value, ast.Name):
                referenced.add(node.value.id)
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                referenced.add(node.func.id)
            elif isinstance(node.func, ast.Attribute):
                referenced.add(node.func.attr)
        # Decorators reference names
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            for dec in node.decorator_list:
                if isinstance(dec, ast.Name):
                    referenced.add(dec.id)
                elif isinstance(dec, ast.Attribute):
                    if isinstance(dec.value, ast.Name):
                        referenced.add(dec.value.id)
                elif isinstance(dec, ast.Call):
                    if isinstance(dec.func, ast.Name):
                        referenced.add(dec.func.id)

    # Find unused functions
    for name, line in defined_functions.items():
        if name not in referenced and name != "main":
            dead.append(DeadCodeItem(
                kind="function",
                name=name,
                line=line,
                reason=f"Function '{name}' is defined but never called",
            ))

    # Find unused imports
    for name, line in imported_names.items():
        # Skip wildcard and package-level imports
        if name == "*":
            continue
        base_name = name.split(".")[0]
        if base_name not in referenced and name not in referenced:
            dead.append(DeadCodeItem(
                kind="import",
                name=name,
                line=line,
                reason=f"Import '{name}' is never used",
            ))

    # Find unused top-level variables (be conservative)
    for name, line in defined_variables.items():
        if name not in referenced and name.upper() != name:  # skip constants
            dead.append(DeadCodeItem(
                kind="variable",
                name=name,
                line=line,
                reason=f"Variable '{name}' is assigned but never read",
            ))

    return sorted(dead, key=lambda d: d.line)


# ---------------------------------------------------------------------------
# Call Graph Builder
# ---------------------------------------------------------------------------

def _build_call_graph(tree: ast.Module) -> dict[str, list[str]]:
    """Build a function call graph: {caller: [callees]}."""
    graph: dict[str, list[str]] = {}

    # Get all defined function names
    defined = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            defined.add(node.name)

    # Walk each function and find calls to other defined functions
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            calls: list[str] = []
            for child in ast.walk(node):
                if isinstance(child, ast.Call):
                    callee = ""
                    if isinstance(child.func, ast.Name):
                        callee = child.func.id
                    elif isinstance(child.func, ast.Attribute):
                        callee = child.func.attr
                    if callee and callee in defined and callee != node.name:
                        if callee not in calls:
                            calls.append(callee)
            graph[node.name] = calls

    return graph


# ---------------------------------------------------------------------------
# Grading
# ---------------------------------------------------------------------------

def _grade_function(fm: FunctionMetrics) -> str:
    """Assign letter grade A-F to a function based on its metrics."""
    score = 100

    # Cyclomatic complexity penalties
    if fm.cyclomatic_complexity > 15:
        score -= 30
    elif fm.cyclomatic_complexity > 10:
        score -= 20
    elif fm.cyclomatic_complexity > 6:
        score -= 10

    # Cognitive complexity penalties
    if fm.cognitive_complexity > 20:
        score -= 25
    elif fm.cognitive_complexity > 12:
        score -= 15
    elif fm.cognitive_complexity > 7:
        score -= 8

    # LOC penalties
    if fm.loc > 80:
        score -= 15
    elif fm.loc > 50:
        score -= 8
    elif fm.loc > 30:
        score -= 3

    # Missing docstring
    if not fm.has_docstring and fm.loc > 5:
        score -= 5

    # Maintainability Index
    if fm.maintainability_index < 20:
        score -= 20
    elif fm.maintainability_index < 40:
        score -= 10

    if score >= 90:
        return "A"
    elif score >= 75:
        return "B"
    elif score >= 60:
        return "C"
    elif score >= 40:
        return "D"
    return "F"


def _grade_overall(functions: list[FunctionMetrics], dead_count: int) -> tuple[str, int]:
    """Overall project grade based on function grades and dead code."""
    if not functions:
        return "A", 95

    grade_scores = {"A": 95, "B": 80, "C": 65, "D": 45, "F": 20}
    total = sum(grade_scores.get(f.grade, 50) for f in functions)
    avg = total / len(functions)

    # Penalty for dead code
    avg -= min(dead_count * 3, 15)

    avg = max(0, min(100, avg))

    if avg >= 90:
        grade = "A"
    elif avg >= 75:
        grade = "B"
    elif avg >= 60:
        grade = "C"
    elif avg >= 40:
        grade = "D"
    else:
        grade = "F"

    return grade, int(avg)


# ---------------------------------------------------------------------------
# Recommendations Generator
# ---------------------------------------------------------------------------

def _generate_recommendations(report: ComplexityReport) -> list[str]:
    recs: list[str] = []

    # High complexity functions
    high_cc = [f for f in report.functions if f.cyclomatic_complexity > 10]
    if high_cc:
        names = ", ".join(f.name for f in high_cc[:3])
        recs.append(f"Reduce cyclomatic complexity in: {names}. Split into smaller functions.")

    high_cog = [f for f in report.functions if f.cognitive_complexity > 15]
    if high_cog:
        names = ", ".join(f.name for f in high_cog[:3])
        recs.append(f"Simplify cognitive complexity in: {names}. Reduce nesting and boolean chains.")

    # Long functions
    long_fns = [f for f in report.functions if f.loc > 50]
    if long_fns:
        names = ", ".join(f.name for f in long_fns[:3])
        recs.append(f"Extract smaller functions from: {names} ({long_fns[0].loc}+ lines).")

    # Missing docstrings
    no_doc = [f for f in report.functions if not f.has_docstring and f.loc > 5]
    if no_doc:
        recs.append(f"{len(no_doc)} function(s) lack docstrings. Add documentation for public APIs.")

    # Dead code
    if report.dead_code:
        recs.append(f"Remove {len(report.dead_code)} unused item(s): {', '.join(d.name for d in report.dead_code[:5])}.")

    # Low maintainability
    low_mi = [f for f in report.functions if f.maintainability_index < 40]
    if low_mi:
        names = ", ".join(f.name for f in low_mi[:3])
        recs.append(f"Low maintainability index in: {names}. Consider refactoring.")

    # Exponential complexity
    exp = [f for f in report.functions if "2^n" in f.time_complexity or "n!" in f.time_complexity]
    if exp:
        names = ", ".join(f.name for f in exp[:3])
        recs.append(f"Exponential time complexity in: {names}. Add memoization or use iterative approach.")

    if not recs:
        recs.append("Code quality looks solid. Consider adding runtime tests to verify.")

    return recs[:8]


# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------

def analyze_complexity(code: str, language: str = "python") -> dict[str, Any]:
    """Full complexity analysis of source code. Returns structured report.

    This is the main entry point. Pure computer science, zero AI.
    """
    lang = (language or "").strip().lower()
    lines = code.splitlines()
    non_empty = [l for l in lines if l.strip()]

    if lang not in ("python", "py", "python3"):
        return _analyze_non_python(code, lang)

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {
            "error": f"Syntax error at line {e.lineno}: {e.msg}",
            "language": language,
            "grade": "F",
            "score": 0,
        }

    # Comment ratio for MI calculation
    comment_lines = sum(1 for l in lines if l.strip().startswith("#"))
    comment_ratio = comment_lines / max(len(non_empty), 1)

    # Analyze each function
    func_metrics: list[FunctionMetrics] = []
    func_asts: dict[str, ast.AST] = {}

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            end_line = getattr(node, "end_lineno", node.lineno)
            loc = max(1, end_line - node.lineno + 1)

            cc = _cyclomatic_complexity(node)
            cog = _cognitive_complexity(node)
            halstead = _halstead_metrics(node)

            # Get function source for complexity estimation
            func_source = "\n".join(lines[node.lineno - 1 : end_line])
            tc_result = estimate_complexity(func_source, "python")

            mi = _maintainability_index(
                halstead.get("volume", 0), cc, loc, comment_ratio
            )

            # Check recursion
            is_recursive = any(
                isinstance(child, ast.Call)
                and isinstance(child.func, ast.Name)
                and child.func.id == node.name
                for child in ast.walk(node)
            )

            fm = FunctionMetrics(
                name=node.name,
                line=node.lineno,
                end_line=end_line,
                loc=loc,
                args=[arg.arg for arg in node.args.args],
                is_async=isinstance(node, ast.AsyncFunctionDef),
                has_docstring=bool(ast.get_docstring(node)),
                cyclomatic_complexity=cc,
                cognitive_complexity=cog,
                time_complexity=tc_result.get("time_complexity", "O(1)"),
                space_complexity=tc_result.get("space_complexity", "O(1)"),
                complexity_explanation=tc_result.get("explanation", ""),
                halstead=halstead,
                maintainability_index=mi,
                is_recursive=is_recursive,
            )
            fm.grade = _grade_function(fm)
            func_metrics.append(fm)
            func_asts[node.name] = node

    # Classes
    classes = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            methods = [
                n.name for n in node.body
                if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
            ]
            classes.append({
                "name": node.name,
                "line": node.lineno,
                "method_count": len(methods),
                "methods": methods,
                "has_docstring": bool(ast.get_docstring(node)),
            })

    # Imports
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.append(node.module)

    # Dead code
    dead_code = _detect_dead_code(tree)

    # Call graph
    call_graph = _build_call_graph(tree)

    # Populate called_by from call_graph
    for caller, callees in call_graph.items():
        for callee in callees:
            for fm in func_metrics:
                if fm.name == caller:
                    fm.calls = call_graph.get(caller, [])
                if fm.name == callee:
                    if caller not in fm.called_by:
                        fm.called_by.append(caller)

    # Overall grade
    grade, score = _grade_overall(func_metrics, len(dead_code))

    # Aggregates
    ccs = [f.cyclomatic_complexity for f in func_metrics]
    cogs = [f.cognitive_complexity for f in func_metrics]
    mis = [f.maintainability_index for f in func_metrics]

    aggregate = {
        "total_functions": len(func_metrics),
        "total_classes": len(classes),
        "total_imports": len(imports),
        "total_loc": len(lines),
        "non_empty_loc": len(non_empty),
        "comment_lines": comment_lines,
        "comment_ratio": round(comment_ratio, 3),
        "max_cyclomatic": max(ccs) if ccs else 0,
        "avg_cyclomatic": round(sum(ccs) / max(len(ccs), 1), 2),
        "max_cognitive": max(cogs) if cogs else 0,
        "avg_cognitive": round(sum(cogs) / max(len(cogs), 1), 2),
        "avg_maintainability": round(sum(mis) / max(len(mis), 1), 2),
        "dead_code_count": len(dead_code),
        "grade_distribution": {
            g: len([f for f in func_metrics if f.grade == g])
            for g in ("A", "B", "C", "D", "F")
        },
    }

    report = ComplexityReport(
        language=language,
        total_lines=len(lines),
        non_empty_lines=len(non_empty),
        functions=func_metrics,
        classes=classes,
        imports=sorted(set(imports)),
        dead_code=dead_code,
        call_graph=call_graph,
        aggregate=aggregate,
        grade=grade,
        score=score,
        recommendations=[],
    )
    report.recommendations = _generate_recommendations(report)

    return _serialize_report(report)


def _analyze_non_python(code: str, lang: str) -> dict[str, Any]:
    """Basic analysis for non-Python languages using regex heuristics."""
    lines = code.splitlines()
    non_empty = [l for l in lines if l.strip()]
    tc_result = estimate_complexity(code, lang)

    # Count functions by regex
    import re
    if lang in ("javascript", "js", "typescript", "ts", "jsx", "tsx"):
        func_matches = re.findall(r"(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)", code)
        func_names = [next(g for g in m if g) for m in func_matches if any(m)]
    elif lang in ("java", "c", "cpp", "c++", "csharp", "c#"):
        func_matches = re.findall(r"(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(", code)
        func_names = func_matches
    elif lang in ("go", "golang"):
        func_matches = re.findall(r"func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(", code)
        func_names = func_matches
    elif lang in ("rust", "rs"):
        func_matches = re.findall(r"fn\s+(\w+)\s*[(<]", code)
        func_names = func_matches
    else:
        func_names = []

    # Count classes
    class_count = len(re.findall(r"\bclass\s+\w+", code))

    # Estimate loop depth for complexity
    max_depth = 0
    depth = 0
    for line in lines:
        stripped = line.strip()
        if re.match(r"^(for|while|do)\b", stripped):
            depth += 1
            max_depth = max(max_depth, depth)
        if "}" in stripped and depth:
            depth -= stripped.count("}")
            depth = max(0, depth)

    return {
        "language": lang,
        "total_lines": len(lines),
        "non_empty_lines": len(non_empty),
        "functions": [
            {
                "name": name,
                "line": None,
                "grade": "B",
                "cyclomatic_complexity": None,
                "cognitive_complexity": None,
                "time_complexity": tc_result.get("time_complexity", "Unknown"),
                "space_complexity": tc_result.get("space_complexity", "Unknown"),
            }
            for name in func_names
        ],
        "classes": [{"name": "detected", "count": class_count}] if class_count else [],
        "imports": [],
        "dead_code": [],
        "call_graph": {},
        "aggregate": {
            "total_functions": len(func_names),
            "total_classes": class_count,
            "total_loc": len(lines),
            "non_empty_loc": len(non_empty),
            "max_loop_depth": max_depth,
            "time_complexity": tc_result.get("time_complexity", "Unknown"),
            "space_complexity": tc_result.get("space_complexity", "Unknown"),
        },
        "grade": "B" if max_depth <= 2 else "C",
        "score": 75 if max_depth <= 2 else 55,
        "recommendations": [
            f"Full AST analysis available for Python. {lang} uses regex heuristics.",
            tc_result.get("explanation", ""),
        ],
    }


def _serialize_report(report: ComplexityReport) -> dict[str, Any]:
    """Convert dataclasses to JSON-serializable dict."""
    return {
        "engine": "complexity-engine-v1",
        "language": report.language,
        "total_lines": report.total_lines,
        "non_empty_lines": report.non_empty_lines,
        "grade": report.grade,
        "score": report.score,
        "functions": [asdict(f) for f in report.functions],
        "classes": report.classes,
        "imports": report.imports,
        "dead_code": [asdict(d) for d in report.dead_code],
        "call_graph": report.call_graph,
        "aggregate": report.aggregate,
        "recommendations": report.recommendations,
    }
