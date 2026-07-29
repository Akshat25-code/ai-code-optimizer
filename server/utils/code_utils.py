"""Shared code extraction and parsing utilities."""
from __future__ import annotations

import ast
import re
from typing import Any


def extract_code_block(text: str) -> str:
    """Extract the first fenced code block from markdown-style text.

    Returns the code content without the fence markers, or the
    stripped input text if no fence is found.
    """
    if not text:
        return ""
    match = re.search(r"```[a-zA-Z0-9_+\-]*\n([\s\S]*?)```", text)
    return match.group(1).strip() if match else text.strip()


# ---------------------------------------------------------------------------
# AST-based complexity estimation
# ---------------------------------------------------------------------------

_BUILTIN_COMPLEXITY: dict[str, str] = {
    "sorted": "O(n log n)",
    "sort": "O(n log n)",
    "list": "O(n)",
    "set": "O(n)",
    "dict": "O(n)",
    "sum": "O(n)",
    "min": "O(n)",
    "max": "O(n)",
    "enumerate": "O(n)",
    "zip": "O(n)",
    "map": "O(n)",
    "filter": "O(n)",
    "reversed": "O(n)",
    "len": "O(1)",
    "append": "O(1)",
    "pop": "O(1)",
    "add": "O(1)",
    "get": "O(1)",
    "bisect": "O(log n)",
    "bisect_left": "O(log n)",
    "bisect_right": "O(log n)",
    "heappush": "O(log n)",
    "heappop": "O(log n)",
}


def _max_loop_depth(node: ast.AST) -> int:
    best = 0

    def walk(n: ast.AST, depth: int) -> None:
        nonlocal best
        is_loop = isinstance(n, (ast.For, ast.AsyncFor, ast.While))
        d = depth + 1 if is_loop else depth
        best = max(best, d)
        for child in ast.iter_child_nodes(n):
            walk(child, d)

    walk(node, 0)
    return best


def _has_recursion(func_node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    name = func_node.name
    for child in ast.walk(func_node):
        if (
            isinstance(child, ast.Call)
            and isinstance(child.func, ast.Name)
            and child.func.id == name
        ):
            return True
    return False


def _has_memoization(func_node: ast.AST) -> bool:
    for node in ast.walk(func_node):
        if isinstance(node, ast.Name) and node.id in ("lru_cache", "cache", "memo", "memoize"):
            return True
        if isinstance(node, ast.Attribute) and node.attr in ("lru_cache", "cache"):
            return True
    return False


def _count_recursive_calls(func_node: ast.FunctionDef | ast.AsyncFunctionDef) -> int:
    name = func_node.name
    count = 0
    for child in ast.walk(func_node):
        if (
            isinstance(child, ast.Call)
            and isinstance(child.func, ast.Name)
            and child.func.id == name
        ):
            count += 1
    return count


def _detect_divide_and_conquer(func_node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
    has_division = False
    for node in ast.walk(func_node):
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.FloorDiv, ast.RShift)):
            has_division = True
        if isinstance(node, ast.Subscript) and isinstance(node.slice, ast.Slice):
            has_division = True
    return has_division and _has_recursion(func_node)


def _notable_calls(tree: ast.AST) -> list[str]:
    found: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            name = ""
            if isinstance(node.func, ast.Name):
                name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                name = node.func.attr
            if name in _BUILTIN_COMPLEXITY:
                found.append(name)
    return found


def estimate_complexity(code: str, language: str = "python") -> dict[str, Any]:
    """Estimate time and space complexity from source code using AST analysis.

    Returns a dict with time_complexity, space_complexity, explanation, and details.
    """
    lang = (language or "").strip().lower()
    if lang not in ("python", "py", "python3"):
        return _estimate_complexity_regex(code, lang)

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return {
            "time_complexity": "Unknown",
            "space_complexity": "Unknown",
            "explanation": "Could not parse code (syntax error).",
            "details": [],
        }

    functions = [
        n for n in ast.walk(tree)
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]

    if not functions:
        return _estimate_module_level(tree, code)

    details: list[dict[str, Any]] = []
    worst_time = "O(1)"
    worst_space = "O(1)"

    for func in functions:
        tc, sc, explanation = _analyze_function(func)
        details.append({
            "function": func.name,
            "line": func.lineno,
            "time_complexity": tc,
            "space_complexity": sc,
            "explanation": explanation,
        })
        worst_time = _worse(worst_time, tc)
        worst_space = _worse(worst_space, sc)

    calls = _notable_calls(tree)
    call_notes = []
    for c in set(calls):
        call_notes.append(f"{c}() is {_BUILTIN_COMPLEXITY[c]}")

    explanation_parts = [f"Worst-case time: {worst_time}, space: {worst_space}."]
    if call_notes:
        explanation_parts.append("Notable calls: " + ", ".join(call_notes) + ".")

    return {
        "time_complexity": worst_time,
        "space_complexity": worst_space,
        "explanation": " ".join(explanation_parts),
        "details": details,
    }


def _analyze_function(func: ast.FunctionDef | ast.AsyncFunctionDef) -> tuple[str, str, str]:
    loop_depth = _max_loop_depth(func)
    recursive = _has_recursion(func)
    memoized = _has_memoization(func)
    rec_calls = _count_recursive_calls(func) if recursive else 0
    divide_conquer = _detect_divide_and_conquer(func) if recursive else False

    reasons: list[str] = []

    # --- Time complexity ---
    if recursive:
        if memoized:
            time_c = "O(n)"
            reasons.append(f"{func.name} is recursive with memoization")
        elif divide_conquer:
            time_c = "O(n log n)"
            reasons.append(f"{func.name} uses divide-and-conquer recursion")
        elif rec_calls >= 2:
            time_c = "O(2^n)"
            reasons.append(f"{func.name} has {rec_calls} recursive calls per invocation (exponential)")
        else:
            time_c = "O(n)"
            reasons.append(f"{func.name} is linearly recursive")
    elif loop_depth == 0:
        time_c = "O(1)"
        reasons.append(f"{func.name} has no loops")
    elif loop_depth == 1:
        time_c = "O(n)"
        reasons.append(f"{func.name} has a single loop")
    elif loop_depth == 2:
        time_c = "O(n^2)"
        reasons.append(f"{func.name} has nested loops (depth 2)")
    elif loop_depth == 3:
        time_c = "O(n^3)"
        reasons.append(f"{func.name} has nested loops (depth 3)")
    else:
        time_c = f"O(n^{loop_depth})"
        reasons.append(f"{func.name} has nested loops (depth {loop_depth})")

    notable = _notable_calls(func)
    for call_name in set(notable):
        call_complexity = _BUILTIN_COMPLEXITY[call_name]
        if call_complexity == "O(n log n)":
            time_c = _worse(time_c, "O(n log n)" if loop_depth == 0 else f"O(n^{loop_depth + 1} log n)")
            reasons.append(f"calls {call_name}() which is O(n log n)")

    # --- Space complexity ---
    grows_structure = False
    for node in ast.walk(func):
        if isinstance(node, ast.Call):
            fname = ""
            if isinstance(node.func, ast.Name):
                fname = node.func.id
            elif isinstance(node.func, ast.Attribute):
                fname = node.func.attr
            if fname in ("append", "extend", "add", "insert", "put"):
                grows_structure = True
        if isinstance(node, ast.ListComp | ast.SetComp | ast.DictComp | ast.GeneratorExp):
            grows_structure = True

    if recursive and not memoized:
        space_c = "O(n)"
        reasons.append("recursive call stack grows with input")
    elif recursive and memoized:
        space_c = "O(n)"
        reasons.append("memoization cache grows with input")
    elif grows_structure:
        space_c = "O(n)"
        reasons.append("builds/grows a data structure proportional to input")
    else:
        space_c = "O(1)"

    return time_c, space_c, "; ".join(reasons)


def _estimate_module_level(tree: ast.AST, code: str) -> dict[str, Any]:
    loop_depth = _max_loop_depth(tree)
    if loop_depth == 0:
        tc = "O(1)"
    elif loop_depth == 1:
        tc = "O(n)"
    elif loop_depth == 2:
        tc = "O(n^2)"
    else:
        tc = f"O(n^{loop_depth})"

    has_growing = False
    for node in ast.walk(tree):
        if isinstance(node, (ast.ListComp, ast.SetComp, ast.DictComp)):
            has_growing = True

    sc = "O(n)" if has_growing else "O(1)"

    return {
        "time_complexity": tc,
        "space_complexity": sc,
        "explanation": f"Module-level code with loop depth {loop_depth}.",
        "details": [],
    }


_COMPLEXITY_ORDER = [
    "O(1)", "O(log n)", "O(n)", "O(n log n)",
    "O(n^2)", "O(n^3)", "O(n^4)", "O(n^5)",
    "O(2^n)", "O(n!)", "Unknown",
]


def _worse(a: str, b: str) -> str:
    def rank(c: str) -> int:
        try:
            return _COMPLEXITY_ORDER.index(c)
        except ValueError:
            return len(_COMPLEXITY_ORDER) - 2  # treat unknown high
    return a if rank(a) >= rank(b) else b


def _estimate_complexity_regex(code: str, lang: str) -> dict[str, Any]:
    """Rough estimate for non-Python languages using regex heuristics."""
    lines = code.splitlines()
    loop_keywords = re.findall(r"\b(for|while|do)\b", code)
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

    recursive_patterns = re.findall(r"(\w+)\s*\([^)]*\)[^{]*\{[^}]*\1\s*\(", code, re.DOTALL)

    if recursive_patterns:
        tc = "O(2^n)"
        explanation = f"Detected recursion in {lang} code."
    elif max_depth == 0:
        tc = "O(1)"
        explanation = f"No loops detected in {lang} code."
    elif max_depth == 1:
        tc = "O(n)"
        explanation = f"Single loop detected in {lang} code."
    elif max_depth == 2:
        tc = "O(n^2)"
        explanation = f"Nested loops (depth 2) in {lang} code."
    else:
        tc = f"O(n^{max_depth})"
        explanation = f"Nested loops (depth {max_depth}) in {lang} code."

    has_alloc = bool(re.search(r"\bnew\s+(Array|List|Map|Set|HashMap|ArrayList|Vector)", code))
    sc = "O(n)" if has_alloc else "O(1)"

    return {
        "time_complexity": tc,
        "space_complexity": sc,
        "explanation": explanation,
        "details": [],
    }
