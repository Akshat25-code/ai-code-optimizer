from __future__ import annotations

import ast
import hashlib
import re
from typing import Any

from services.analysis.ast_analyzer import calculate_complexity
from services.analysis.bug_scanner import scan_javascript, scan_python


SEVERITY_WEIGHT = {
    "Critical": 25,
    "High": 15,
    "Medium": 8,
    "Low": 3,
}


SECRET_RE = re.compile(
    r"""(?ix)
    (api[_-]?key|secret|token|password|private[_-]?key)
    \s*[:=]\s*
    ['"][^'"]{6,}['"]
    """
)


def _base_metrics(code: str) -> dict[str, Any]:
    lines = code.splitlines()
    non_empty = [line for line in lines if line.strip()]
    comment_lines = [
        line for line in lines
        if line.strip().startswith(("#", "//", "/*", "*"))
    ]
    long_lines = [idx for idx, line in enumerate(lines, start=1) if len(line) > 100]
    return {
        "lines": len(lines),
        "non_empty_lines": len(non_empty),
        "comment_lines": len(comment_lines),
        "comment_ratio": round(len(comment_lines) / max(1, len(non_empty)), 2),
        "characters": len(code),
        "long_lines": long_lines[:20],
        "long_line_count": len(long_lines),
    }


def _line_at(code: str, line_no: int | None) -> str | None:
    if not line_no or line_no < 1:
        return None
    lines = code.splitlines()
    if line_no > len(lines):
        return None
    return lines[line_no - 1].strip()


def _finding(
    *,
    category: str,
    severity: str,
    title: str,
    detail: str,
    suggestion: str,
    line: int | None = None,
    code_snippet: str | None = None,
) -> dict[str, Any]:
    digest = hashlib.sha1(f"{category}:{severity}:{title}:{line}".encode("utf-8")).hexdigest()[:10]
    return {
        "id": f"{category}:{severity}:{line or 'global'}:{digest}",
        "category": category,
        "severity": severity,
        "title": title,
        "detail": detail,
        "suggestion": suggestion,
        "line": line,
        "code_snippet": code_snippet,
    }


def _severity_counts(findings: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for finding in findings:
        severity = finding.get("severity")
        if severity in counts:
            counts[severity] += 1
    counts["total"] = len(findings)
    return counts


def _find_nested_loop_depth(node: ast.AST) -> int:
    max_depth = 0

    def visit(current: ast.AST, depth: int) -> None:
        nonlocal max_depth
        is_loop = isinstance(current, (ast.For, ast.AsyncFor, ast.While))
        next_depth = depth + 1 if is_loop else depth
        max_depth = max(max_depth, next_depth)
        for child in ast.iter_child_nodes(current):
            visit(child, next_depth)

    visit(node, 0)
    return max_depth


def _python_static_findings(code: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    findings: list[dict[str, Any]] = []
    metrics: dict[str, Any] = {
        "functions": [],
        "classes": [],
        "imports": [],
        "function_count": 0,
        "class_count": 0,
        "max_complexity": 0,
        "average_complexity": 0,
        "docstring_coverage": 0,
        "nested_loop_depth": 0,
        "syntax_valid": True,
    }

    bug_report = scan_python(code)
    for issue_group in ("compile_time_errors", "runtime_errors", "logic_errors"):
        for issue in bug_report.get(issue_group, []):
            findings.append(
                _finding(
                    category=issue.get("category", "bug"),
                    severity=issue.get("severity", "Medium"),
                    title=issue.get("error_name") or issue.get("error_type") or "Static issue",
                    detail=issue.get("message") or "Static analyzer found a potential issue.",
                    suggestion=issue.get("suggested_fix") or "Review this location.",
                    line=issue.get("line"),
                    code_snippet=issue.get("code_snippet"),
                )
            )

    if bug_report.get("compile_time_errors"):
        metrics["syntax_valid"] = False
        return metrics, findings

    try:
        tree = ast.parse(code)
    except SyntaxError:
        metrics["syntax_valid"] = False
        return metrics, findings

    complexities: list[int] = []
    docstring_targets = 1
    docstrings_present = 1 if ast.get_docstring(tree) else 0
    metrics["nested_loop_depth"] = _find_nested_loop_depth(tree)

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            metrics["imports"].extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            metrics["imports"].append(node.module)
        elif isinstance(node, ast.ClassDef):
            class_info = {
                "name": node.name,
                "line": node.lineno,
                "method_count": len([n for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]),
                "has_docstring": bool(ast.get_docstring(node)),
            }
            metrics["classes"].append(class_info)
            docstring_targets += 1
            docstrings_present += 1 if class_info["has_docstring"] else 0
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            complexity = calculate_complexity(node)
            complexities.append(complexity)
            end_line = getattr(node, "end_lineno", node.lineno)
            loc = max(1, end_line - node.lineno + 1)
            has_docstring = bool(ast.get_docstring(node))
            function_info = {
                "name": node.name,
                "line": node.lineno,
                "loc": loc,
                "complexity": complexity,
                "args": [arg.arg for arg in node.args.args],
                "is_async": isinstance(node, ast.AsyncFunctionDef),
                "has_docstring": has_docstring,
            }
            metrics["functions"].append(function_info)
            docstring_targets += 1
            docstrings_present += 1 if has_docstring else 0

            if complexity > 10:
                findings.append(
                    _finding(
                        category="maintainability",
                        severity="High",
                        title=f"High complexity in {node.name}",
                        detail=f"`{node.name}` has cyclomatic complexity {complexity}.",
                        suggestion="Split branches into smaller named functions and add focused tests.",
                        line=node.lineno,
                        code_snippet=_line_at(code, node.lineno),
                    )
                )
            elif complexity > 6:
                findings.append(
                    _finding(
                        category="maintainability",
                        severity="Medium",
                        title=f"Growing complexity in {node.name}",
                        detail=f"`{node.name}` has cyclomatic complexity {complexity}.",
                        suggestion="Consider extracting nested conditionals before this becomes hard to test.",
                        line=node.lineno,
                        code_snippet=_line_at(code, node.lineno),
                    )
                )

            if loc > 60:
                findings.append(
                    _finding(
                        category="maintainability",
                        severity="Medium",
                        title=f"Long function {node.name}",
                        detail=f"`{node.name}` is {loc} lines long.",
                        suggestion="Extract sections with separate responsibilities into smaller functions.",
                        line=node.lineno,
                        code_snippet=_line_at(code, node.lineno),
                    )
                )

            calls_itself = any(
                isinstance(child, ast.Call)
                and isinstance(child.func, ast.Name)
                and child.func.id == node.name
                for child in ast.walk(node)
            )
            if calls_itself:
                findings.append(
                    _finding(
                        category="performance",
                        severity="Medium",
                        title=f"Recursive function {node.name}",
                        detail="Direct recursion can be expensive without memoization or a clear base-case proof.",
                        suggestion="For repeated subproblems, add memoization or convert to an iterative algorithm.",
                        line=node.lineno,
                        code_snippet=_line_at(code, node.lineno),
                    )
                )

        elif isinstance(node, ast.Call):
            call_name = ""
            if isinstance(node.func, ast.Name):
                call_name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                call_name = node.func.attr

            if call_name in {"eval", "exec"}:
                findings.append(
                    _finding(
                        category="security",
                        severity="High",
                        title=f"Unsafe use of {call_name}",
                        detail=f"`{call_name}` can execute arbitrary input.",
                        suggestion="Replace dynamic execution with a parser, lookup table, or restricted evaluator.",
                        line=getattr(node, "lineno", None),
                        code_snippet=_line_at(code, getattr(node, "lineno", None)),
                    )
                )

            if call_name in {"run", "Popen", "call"}:
                shell_true = any(
                    kw.arg == "shell" and isinstance(kw.value, ast.Constant) and kw.value.value is True
                    for kw in node.keywords
                )
                if shell_true:
                    findings.append(
                        _finding(
                            category="security",
                            severity="High",
                            title="Shell command execution",
                            detail="Subprocess call uses shell=True, which can allow command injection.",
                            suggestion="Pass arguments as a list and keep shell=False unless absolutely required.",
                            line=getattr(node, "lineno", None),
                            code_snippet=_line_at(code, getattr(node, "lineno", None)),
                        )
                    )

    for match in SECRET_RE.finditer(code):
        line = code.count("\n", 0, match.start()) + 1
        findings.append(
            _finding(
                category="security",
                severity="High",
                title="Hardcoded secret",
                detail="A token, key, password, or secret appears to be hardcoded in source code.",
                suggestion="Move secrets to environment variables or a secret manager.",
                line=line,
                code_snippet=_line_at(code, line),
            )
        )

    if metrics["nested_loop_depth"] >= 3:
        findings.append(
            _finding(
                category="performance",
                severity="High",
                title="Deeply nested loops",
                detail=f"Detected loop nesting depth {metrics['nested_loop_depth']}.",
                suggestion="Consider indexing, precomputation, hashing, or changing the algorithm.",
            )
        )
    elif metrics["nested_loop_depth"] == 2:
        findings.append(
            _finding(
                category="performance",
                severity="Medium",
                title="Nested loops",
                detail="Detected nested loops, which may become O(n^2).",
                suggestion="Check input sizes and consider a set/map based algorithm when possible.",
            )
        )

    metrics["function_count"] = len(metrics["functions"])
    metrics["class_count"] = len(metrics["classes"])
    metrics["max_complexity"] = max(complexities) if complexities else 0
    metrics["average_complexity"] = round(sum(complexities) / max(1, len(complexities)), 2)
    metrics["docstring_coverage"] = round(docstrings_present / max(1, docstring_targets), 2)
    metrics["imports"] = sorted(set(metrics["imports"]))
    return metrics, findings


def _javascript_static_findings(code: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    findings: list[dict[str, Any]] = []
    metrics = {
        "function_count": len(re.findall(r"\bfunction\b|=>", code)),
        "class_count": len(re.findall(r"\bclass\s+\w+", code)),
        "max_complexity": 1 + len(re.findall(r"\b(if|for|while|catch|switch|case)\b|&&|\|\|", code)),
        "average_complexity": 0,
        "docstring_coverage": 0,
        "nested_loop_depth": 0,
        "syntax_valid": True,
    }
    metrics["average_complexity"] = metrics["max_complexity"]

    bug_report = scan_javascript(code)
    for issue in bug_report.get("logic_errors", []):
        findings.append(
            _finding(
                category=issue.get("category", "logic"),
                severity=issue.get("severity", "Low"),
                title=issue.get("error_name") or "JavaScript static issue",
                detail=issue.get("message") or "Static analyzer found a potential issue.",
                suggestion=issue.get("suggested_fix") or "Review this location.",
                line=issue.get("line"),
                code_snippet=issue.get("code_snippet"),
            )
        )

    for pattern, title, detail, suggestion, severity in [
        (r"\beval\s*\(", "Unsafe eval", "`eval` can execute arbitrary input.", "Use JSON parsing, a lookup table, or a constrained parser.", "High"),
        (r"\.innerHTML\s*=", "Unsafe innerHTML assignment", "Direct innerHTML writes can create XSS risk.", "Use textContent or sanitize trusted HTML.", "High"),
        (r"localStorage\.(setItem|getItem)\s*\(\s*['\"](?:token|auth|jwt)", "Token stored in localStorage", "Long-lived auth tokens in localStorage are vulnerable to XSS theft.", "Prefer httpOnly cookies for session tokens.", "Medium"),
    ]:
        for match in re.finditer(pattern, code, flags=re.IGNORECASE):
            line = code.count("\n", 0, match.start()) + 1
            findings.append(
                _finding(
                    category="security",
                    severity=severity,
                    title=title,
                    detail=detail,
                    suggestion=suggestion,
                    line=line,
                    code_snippet=_line_at(code, line),
                )
            )

    for match in SECRET_RE.finditer(code):
        line = code.count("\n", 0, match.start()) + 1
        findings.append(
            _finding(
                category="security",
                severity="High",
                title="Hardcoded secret",
                detail="A token, key, password, or secret appears to be hardcoded in source code.",
                suggestion="Move secrets to environment variables or a secret manager.",
                line=line,
                code_snippet=_line_at(code, line),
            )
        )

    max_loop_depth = 0
    depth = 0
    for line in code.splitlines():
        stripped = line.strip()
        if re.match(r"^(for|while)\b", stripped):
            depth += 1
            max_loop_depth = max(max_loop_depth, depth)
        if "}" in stripped and depth:
            depth -= stripped.count("}")
            depth = max(0, depth)
    metrics["nested_loop_depth"] = max_loop_depth
    if max_loop_depth >= 2:
        findings.append(
            _finding(
                category="performance",
                severity="Medium" if max_loop_depth == 2 else "High",
                title="Nested loops",
                detail=f"Detected loop nesting depth {max_loop_depth}.",
                suggestion="Check input size and consider map/set based lookup or sorting strategy.",
            )
        )

    return metrics, findings


def _generic_findings(code: str, metrics: dict[str, Any]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    if metrics["long_line_count"]:
        findings.append(
            _finding(
                category="readability",
                severity="Low",
                title="Long lines",
                detail=f"{metrics['long_line_count']} lines are over 100 characters.",
                suggestion="Wrap long expressions and keep dense logic readable in code review.",
                line=metrics["long_lines"][0] if metrics["long_lines"] else None,
                code_snippet=_line_at(code, metrics["long_lines"][0]) if metrics["long_lines"] else None,
            )
        )
    for idx, line in enumerate(code.splitlines(), start=1):
        if "TODO" in line or "FIXME" in line:
            findings.append(
                _finding(
                    category="maintainability",
                    severity="Low",
                    title="Unresolved TODO/FIXME",
                    detail="The code contains unresolved maintenance notes.",
                    suggestion="Convert this note into a tracked issue or finish the work before submission.",
                    line=idx,
                    code_snippet=line.strip(),
                )
            )
    return findings


def _quality_gates(metrics: dict[str, Any], findings: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    counts = _severity_counts(findings)
    security_high = [
        finding for finding in findings
        if finding["category"] == "security" and finding["severity"] in {"Critical", "High"}
    ]
    return {
        "syntax_valid": {
            "passed": bool(metrics.get("syntax_valid", True)),
            "detail": "Code parses successfully" if metrics.get("syntax_valid", True) else "Syntax errors must be fixed first",
        },
        "no_critical_findings": {
            "passed": counts["Critical"] == 0,
            "detail": f"{counts['Critical']} critical findings",
        },
        "security_review": {
            "passed": len(security_high) == 0,
            "detail": f"{len(security_high)} high-risk security findings",
        },
        "complexity_budget": {
            "passed": int(metrics.get("max_complexity", 0) or 0) <= 10,
            "detail": f"Max complexity {metrics.get('max_complexity', 0)}",
        },
        "documentation_signal": {
            "passed": metrics.get("function_count", 0) == 0 or metrics.get("docstring_coverage", 0) >= 0.5,
            "detail": f"Docstring coverage {int((metrics.get('docstring_coverage', 0) or 0) * 100)}%",
        },
    }


def _proof_badges(metrics: dict[str, Any], findings: list[dict[str, Any]]) -> list[dict[str, str]]:
    gates = _quality_gates(metrics, findings)
    counts = _severity_counts(findings)
    return [
        {
            "label": "Static scan",
            "status": "failed" if counts["Critical"] else ("warning" if counts["High"] or counts["Medium"] else "passed"),
            "detail": f"{counts['total']} findings",
        },
        {
            "label": "Complexity",
            "status": "passed" if gates["complexity_budget"]["passed"] else "warning",
            "detail": gates["complexity_budget"]["detail"],
        },
        {
            "label": "Security",
            "status": "passed" if gates["security_review"]["passed"] else "failed",
            "detail": gates["security_review"]["detail"],
        },
        {
            "label": "Documentation",
            "status": "passed" if gates["documentation_signal"]["passed"] else "warning",
            "detail": gates["documentation_signal"]["detail"],
        },
        {
            "label": "Runtime proof",
            "status": "not_run",
            "detail": "Run/Compare executes code separately",
        },
    ]


def _score(metrics: dict[str, Any], findings: list[dict[str, Any]]) -> int:
    score = 100
    for finding in findings:
        score -= SEVERITY_WEIGHT.get(finding.get("severity"), 5)
    if int(metrics.get("max_complexity", 0) or 0) > 10:
        score -= 10
    if metrics.get("function_count", 0) > 0 and metrics.get("docstring_coverage", 0) < 0.5:
        score -= 6
    if metrics.get("comment_ratio", 0) == 0 and metrics.get("non_empty_lines", 0) > 25:
        score -= 4
    return max(0, min(100, score))


def _recommendations(findings: list[dict[str, Any]], score: int) -> list[str]:
    if not findings and score >= 90:
        return [
            "Add runtime tests or benchmark proof to make the result defensible.",
            "Save this analysis with the session export for your project report.",
        ]

    ordered = sorted(
        findings,
        key=lambda item: SEVERITY_WEIGHT.get(item.get("severity"), 0),
        reverse=True,
    )
    recs = []
    seen = set()
    for finding in ordered:
        suggestion = finding.get("suggestion")
        if suggestion and suggestion not in seen:
            recs.append(suggestion)
            seen.add(suggestion)
        if len(recs) == 5:
            break
    if score < 70:
        recs.append("Fix high severity issues before asking the AI for style improvements.")
    return recs[:6]


def _inspect_single(code: str, language: str) -> dict[str, Any]:
    metrics = _base_metrics(code)
    language_key = (language or "").strip().lower()
    if language_key in {"python", "py", "python3"}:
        language_metrics, findings = _python_static_findings(code)
    elif language_key in {"javascript", "typescript", "js", "ts", "jsx", "tsx"}:
        language_metrics, findings = _javascript_static_findings(code)
    else:
        language_metrics, findings = ({}, [])
        findings.append(
            _finding(
                category="coverage",
                severity="Low",
                title="Limited local analyzer coverage",
                detail=f"Local static rules are limited for {language}.",
                suggestion="Use provider analysis plus language-specific tools for this language.",
            )
        )

    metrics.update(language_metrics)
    findings.extend(_generic_findings(code, metrics))
    counts = _severity_counts(findings)
    score = _score(metrics, findings)
    gates = _quality_gates(metrics, findings)
    return {
        "score": score,
        "score_10": round(score / 10, 1),
        "metrics": metrics,
        "severity_counts": counts,
        "quality_gates": gates,
        "proof_badges": _proof_badges(metrics, findings),
        "findings": sorted(
            findings,
            key=lambda item: SEVERITY_WEIGHT.get(item.get("severity"), 0),
            reverse=True,
        ),
        "recommendations": _recommendations(findings, score),
    }


def inspect_code_quality(code: str, language: str, optimized_code: str | None = None) -> dict[str, Any]:
    original = _inspect_single(code, language)
    report = {
        "engine": "local-code-intelligence-v1",
        "language": language,
        "score": original["score"],
        "score_10": original["score_10"],
        "summary": {
            "health": "strong" if original["score"] >= 85 else "needs-work" if original["score"] >= 60 else "risky",
            "lines": original["metrics"].get("lines", 0),
            "functions": original["metrics"].get("function_count", 0),
            "classes": original["metrics"].get("class_count", 0),
            "findings": original["severity_counts"]["total"],
            "max_complexity": original["metrics"].get("max_complexity", 0),
        },
        "metrics": original["metrics"],
        "severity_counts": original["severity_counts"],
        "quality_gates": original["quality_gates"],
        "proof_badges": original["proof_badges"],
        "findings": original["findings"][:50],
        "recommendations": original["recommendations"],
    }

    if optimized_code:
        optimized = _inspect_single(optimized_code, language)
        report["optimized"] = {
            "score": optimized["score"],
            "score_10": optimized["score_10"],
            "metrics": optimized["metrics"],
            "severity_counts": optimized["severity_counts"],
        }
        report["comparison"] = {
            "score_delta": optimized["score"] - original["score"],
            "line_delta": optimized["metrics"].get("lines", 0) - original["metrics"].get("lines", 0),
            "finding_delta": optimized["severity_counts"]["total"] - original["severity_counts"]["total"],
            "max_complexity_delta": optimized["metrics"].get("max_complexity", 0) - original["metrics"].get("max_complexity", 0),
        }

    return report


def format_code_quality_markdown(report: dict[str, Any], project_name: str | None = None) -> str:
    """Render a deterministic proof report that can be submitted or archived."""
    title = project_name.strip() if project_name and project_name.strip() else "AI Code Optimizer Proof Report"
    summary = report.get("summary", {})
    metrics = report.get("metrics", {})
    counts = report.get("severity_counts", {})
    lines = [
        f"# {title}",
        "",
        "## Executive Summary",
        "",
        f"- Engine: `{report.get('engine', 'local-code-intelligence-v1')}`",
        f"- Language: `{report.get('language', 'unknown')}`",
        f"- Local Score: **{report.get('score_10', 0)}/10** ({report.get('score', 0)}/100)",
        f"- Health: **{summary.get('health', 'unknown')}**",
        f"- Lines: {summary.get('lines', 0)}",
        f"- Functions: {summary.get('functions', 0)}",
        f"- Classes: {summary.get('classes', 0)}",
        f"- Findings: {summary.get('findings', 0)}",
        f"- Max Complexity: {summary.get('max_complexity', 0)}",
        "",
        "## Severity Breakdown",
        "",
        f"- Critical: {counts.get('Critical', 0)}",
        f"- High: {counts.get('High', 0)}",
        f"- Medium: {counts.get('Medium', 0)}",
        f"- Low: {counts.get('Low', 0)}",
        "",
        "## Quality Gates",
        "",
    ]

    for gate_name, gate in (report.get("quality_gates") or {}).items():
        status = "PASS" if gate.get("passed") else "FAIL"
        label = gate_name.replace("_", " ").title()
        lines.append(f"- {status}: **{label}** - {gate.get('detail', '')}")

    lines.extend(["", "## Proof Badges", ""])
    for badge in report.get("proof_badges") or []:
        lines.append(f"- **{badge.get('label')}**: {badge.get('status')} - {badge.get('detail')}")

    if report.get("comparison"):
        comparison = report["comparison"]
        optimized = report.get("optimized", {})
        lines.extend([
            "",
            "## Before And After Static Comparison",
            "",
            f"- Original score: {report.get('score_10', 0)}/10",
            f"- Optimized score: {optimized.get('score_10', 0)}/10",
            f"- Score delta: {comparison.get('score_delta', 0)}",
            f"- Line delta: {comparison.get('line_delta', 0)}",
            f"- Finding delta: {comparison.get('finding_delta', 0)}",
            f"- Max complexity delta: {comparison.get('max_complexity_delta', 0)}",
        ])

    lines.extend(["", "## Top Findings", ""])
    findings = report.get("findings") or []
    if findings:
        for finding in findings[:10]:
            line = f"line {finding.get('line')}" if finding.get("line") else "global"
            lines.extend([
                f"### {finding.get('title', 'Finding')}",
                "",
                f"- Severity: {finding.get('severity')} ({finding.get('category')})",
                f"- Location: {line}",
                f"- Detail: {finding.get('detail')}",
                f"- Suggested fix: {finding.get('suggestion')}",
                "",
            ])
    else:
        lines.append("No findings were detected by the local static analyzer.")

    lines.extend(["", "## Recommendations", ""])
    recommendations = report.get("recommendations") or []
    if recommendations:
        lines.extend(f"- {item}" for item in recommendations)
    else:
        lines.append("- Add runtime tests, benchmark evidence, and session export before final submission.")

    lines.extend([
        "",
        "## Metric Details",
        "",
        f"- Non-empty lines: {metrics.get('non_empty_lines', 0)}",
        f"- Comment ratio: {metrics.get('comment_ratio', 0)}",
        f"- Average complexity: {metrics.get('average_complexity', 0)}",
        f"- Docstring coverage: {int((metrics.get('docstring_coverage', 0) or 0) * 100)}%",
        f"- Nested loop depth: {metrics.get('nested_loop_depth', 0)}",
        "",
        "Generated by AI Code Optimizer local code intelligence.",
    ])
    return "\n".join(lines).strip() + "\n"
