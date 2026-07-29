from __future__ import annotations

import ast
import json
import re
from dataclasses import dataclass, asdict


@dataclass
class Issue:
    line: int | None
    column: int | None
    category: str  # compile_time | runtime | logic
    severity: str  # Critical | High | Medium | Low
    error_type: str
    error_name: str
    message: str
    code_snippet: str | None = None
    suggested_fix: str | None = None


def _get_line(code: str, line_no: int | None) -> str | None:
    if not line_no or line_no < 1:
        return None
    lines = code.splitlines()
    if line_no > len(lines):
        return None
    return lines[line_no - 1]


def _severity_counts(issues: list[Issue]) -> dict[str, int]:
    counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for i in issues:
        if i.severity in counts:
            counts[i.severity] += 1
    counts["total"] = len(issues)
    return counts


def scan_python(code: str) -> dict:
    issues: list[Issue] = []

    # 1) Compile-time / syntax
    try:
        ast.parse(code)
    except SyntaxError as e:
        line = int(getattr(e, "lineno", 0) or 0) or None
        col = int(getattr(e, "offset", 0) or 0) or None
        snippet = _get_line(code, line)
        issues.append(
            Issue(
                line=line,
                column=col,
                category="compile_time",
                severity="Critical",
                error_type="SyntaxError",
                error_name="SyntaxError",
                message=str(getattr(e, "msg", "Syntax error")),
                code_snippet=snippet,
                suggested_fix="Fix the syntax at the indicated line/column.",
            )
        )

        # If code doesn't parse, stop further analysis (line heuristics below may be misleading)
        return _build_report(issues, code)

    # 2) Common runtime risks (lightweight heuristics)
    # Division by literal zero
    for m in re.finditer(r"(^|[^\w])(/|//)\s*0(\D|$)", code):
        # approximate line/col from match index
        idx = m.start()
        line = code.count("\n", 0, idx) + 1
        col = idx - code.rfind("\n", 0, idx)
        issues.append(
            Issue(
                line=line,
                column=col,
                category="runtime",
                severity="High",
                error_type="ZeroDivisionError",
                error_name="Division by zero",
                message="Possible division by zero detected.",
                code_snippet=_get_line(code, line),
                suggested_fix="Guard the denominator (e.g., if denom == 0: ...).",
            )
        )

    # Bare except
    for i, line_text in enumerate(code.splitlines(), start=1):
        if re.match(r"^\s*except\s*:\s*(#.*)?$", line_text):
            issues.append(
                Issue(
                    line=i,
                    column=None,
                    category="runtime",
                    severity="Medium",
                    error_type="ExceptionHandling",
                    error_name="Bare except",
                    message="Bare `except:` catches all exceptions (including SystemExit/KeyboardInterrupt).",
                    code_snippet=line_text,
                    suggested_fix="Catch specific exceptions (e.g., except ValueError as e: ...).",
                )
            )

    # while True with no obvious break/return in body (best-effort)
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.While) and isinstance(node.test, ast.Constant) and node.test.value is True:
                has_terminator = any(isinstance(n, (ast.Break, ast.Return, ast.Raise)) for n in ast.walk(node))
                if not has_terminator:
                    issues.append(
                        Issue(
                            line=getattr(node, "lineno", None),
                            column=getattr(node, "col_offset", None),
                            category="logic",
                            severity="High",
                            error_type="LogicError",
                            error_name="Infinite loop risk",
                            message="`while True` loop has no `break`/`return`/`raise` inside; may run forever.",
                            code_snippet=_get_line(code, getattr(node, "lineno", None)),
                            suggested_fix="Add a terminating condition or a `break` when done.",
                        )
                    )
    except Exception:
        # Shouldn't happen since parsing succeeded, but keep resilient
        pass

    return _build_report(issues, code)


def _build_report(issues: list[Issue], code: str) -> dict:
    compile_time = [asdict(i) for i in issues if i.category == "compile_time"]
    runtime = [asdict(i) for i in issues if i.category == "runtime"]
    logic = [asdict(i) for i in issues if i.category == "logic"]

    # Frontend expects flat severity counters at summary level.
    total_counts = _severity_counts(issues)
    summary = {
        "Critical": total_counts["Critical"],
        "High": total_counts["High"],
        "Medium": total_counts["Medium"],
        "Low": total_counts["Low"],
        "total": total_counts["total"],
        "by_category": {
            "compile_time": _severity_counts([i for i in issues if i.category == "compile_time"]),
            "runtime": _severity_counts([i for i in issues if i.category == "runtime"]),
            "logic": _severity_counts([i for i in issues if i.category == "logic"]),
        },
    }

    top_priorities = []
    for sev in ("Critical", "High", "Medium", "Low"):
        for i in issues:
            if i.severity == sev:
                top_priorities.append(
                    {
                        "severity": i.severity,
                        "line": i.line,
                        "message": i.message,
                        "suggested_fix": i.suggested_fix,
                    }
                )
            if len(top_priorities) >= 3:
                break
        if len(top_priorities) >= 3:
            break

    return {
        "summary": summary,
        "compile_time_errors": compile_time,
        "runtime_errors": runtime,
        "logic_errors": logic,
        "top_priorities": top_priorities,
        "notes": {
            "engine": "static-python-v1",
            "limitations": "Static heuristics only; for deeper checks use runtime tests or language-specific linters.",
        },
    }


def to_json(report: dict) -> str:
    return json.dumps(report, ensure_ascii=False, indent=2)


def scan_javascript(code: str) -> dict:
    """Lightweight JavaScript static checks.

    This intentionally focuses on safe, deterministic heuristics without external linters.
    """
    issues: list[Issue] = []
    lines = code.splitlines()

    # Missing semicolon heuristic (can trigger ASI hazards in production code style).
    for i, line_text in enumerate(lines, start=1):
        stripped = line_text.strip()
        if not stripped:
            continue
        if stripped.startswith("//"):
            continue
        if stripped.endswith((";", "{", "}", ",", ":")):
            continue
        if re.match(r"^(if|for|while|switch|catch|function)\b", stripped):
            continue

        issues.append(
            Issue(
                line=i,
                column=None,
                category="logic",
                severity="Low",
                error_type="StyleRisk",
                error_name="Missing semicolon",
                message="Statement appears to be missing a semicolon; this can cause ASI-related bugs.",
                code_snippet=line_text,
                suggested_fix="Add ';' at the end of the statement.",
            )
        )

    return _build_report(issues, code)
