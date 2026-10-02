"""Unit tests for utils/code_utils.py (pure complexity helpers)."""
import ast
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.code_utils import (
    extract_code_block,
    estimate_complexity,
    _max_loop_depth,
    _has_recursion,
    _has_memoization,
    _count_recursive_calls,
    _detect_divide_and_conquer,
    _notable_calls,
    _worse,
    _estimate_module_level,
    _analyze_function,
)


def _fn(src):
    tree = ast.parse(src)
    return next(n for n in ast.walk(tree)
                if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)))


def test_extract_code_block_variants():
    assert extract_code_block("") == ""
    assert extract_code_block("no fence") == "no fence"
    assert extract_code_block("```python\nprint(1)\n```") == "print(1)"
    assert extract_code_block("text ```js\nx()\n``` tail") == "x()"


def test_estimate_simple_function():
    r = estimate_complexity("def f(x):\n    return x + 1\n")
    assert r["time_complexity"] == "O(1)"
    assert r["space_complexity"] == "O(1)"
    assert len(r["details"]) == 1


def test_estimate_nested_loops_and_growth():
    r = estimate_complexity(
        "def f(xs):\n    out = []\n    for a in xs:\n"
        "        for b in xs:\n            out.append((a, b))\n    return out\n")
    assert r["time_complexity"] == "O(n^2)"
    assert r["space_complexity"] == "O(n)"


def test_estimate_recursion_shapes():
    fib = "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n"
    r = estimate_complexity(fib)
    assert r["time_complexity"] == "O(2^n)"
    assert r["space_complexity"] == "O(n)"
    memo = ("from functools import lru_cache\n@lru_cache(None)\n"
            "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n")
    assert estimate_complexity(memo)["time_complexity"] == "O(n)"
    bs = ("def bs(a, lo, hi, t):\n    m = (lo + hi) // 2\n"
          "    if a[m] == t:\n        return m\n    return bs(a, lo, m, t)\n")
    assert estimate_complexity(bs)["time_complexity"] == "O(n log n)"
    lin = "def f(n):\n    return f(n - 1)\n"
    assert estimate_complexity(lin)["time_complexity"] == "O(n)"


def test_estimate_notable_calls_and_sort_bump():
    r = estimate_complexity("def f(xs):\n    return sorted(xs)\n")
    assert r["time_complexity"] == "O(n log n)"
    assert any("sorted" in d.get("explanation", "") or "sorted" in str(d)
               for d in [r])
    r2 = estimate_complexity("def f(xs):\n    for x in xs:\n        print(sorted(xs))\n")
    assert "log n" in r2["time_complexity"]


def test_estimate_syntax_error_and_module_level():
    r = estimate_complexity("def broken(:\n")
    assert r["time_complexity"] == "Unknown"
    r = estimate_complexity("x = 1\nprint(x)\n")
    assert r["time_complexity"] == "O(1)"
    r = estimate_complexity("for i in range(10):\n    print([j for j in range(i)])\n")
    assert r["time_complexity"] == "O(n)"
    assert r["space_complexity"] == "O(n)"


def test_estimate_non_python_regex():
    # NOTE: the regex heuristic flags the repeated `for (` as recursion-like;
    # that quirk is tool behavior under test here, not an asserted ideal.
    r = estimate_complexity("function f(x) {\n  for (let i = 0; i < x; i++) {\n    while (x > 0) { x--; }\n  }\n}\n",
                            "javascript")
    assert r["time_complexity"] == "O(n^2)"
    r = estimate_complexity("int f() { return 1; }", "c")
    assert r["time_complexity"] == "O(1)"
    r = estimate_complexity("List<Integer> f() {\n return new ArrayList<>();\n}", "java")
    assert r["space_complexity"] == "O(n)"
    rec = "int f(int n) {\n  if (n <= 1) return n;\n  return f(n-1) + f(n-1);\n}"
    assert estimate_complexity(rec, "c")["time_complexity"] == "O(2^n)"


def test_loop_depth_and_recursion_helpers():
    assert _max_loop_depth(ast.parse("x = 1")) == 0
    assert _max_loop_depth(ast.parse("for i in x:\n  while y:\n    pass\n")) == 2
    f = _fn("def f(n):\n    return f(n-1)\n")
    assert _has_recursion(f) is True
    assert _count_recursive_calls(f) == 1
    assert _has_memoization(f) is False
    g = _fn("from functools import lru_cache\n@lru_cache(None)\ndef g(n):\n    return g(n-1)\n")
    assert _has_memoization(g) is True
    plain = _fn("def h(x):\n    return x\n")
    assert _has_recursion(plain) is False
    assert _count_recursive_calls(plain) == 0
    dc = _fn("def ms(a):\n    m = len(a) // 2\n    L = ms(a[:m])\n    return L\n")
    assert _detect_divide_and_conquer(dc) is True
    assert _detect_divide_and_conquer(plain) is False


def test_notable_calls_and_worse():
    tree = ast.parse("def f(xs):\n    y = sorted(xs)\n    return len(y)\n")
    found = _notable_calls(tree)
    assert "sorted" in found and "len" in found
    assert _notable_calls(ast.parse("x = 1")) == []
    assert _worse("O(1)", "O(n)") == "O(n)"
    assert _worse("O(n^2)", "O(n)") == "O(n^2)"
    assert _worse("O(1)", "nonsense") != ""


def test_estimate_module_level_direct():
    r = _estimate_module_level(ast.parse("x = 1\n"), "x = 1\n")
    assert r["time_complexity"] == "O(1)" and r["details"] == []
    r = _estimate_module_level(
        ast.parse("for a in x:\n  for b in y:\n    for c in z:\n      print(a, b, c)\n"), "")
    assert r["time_complexity"] == "O(n^3)"


def test_analyze_function_deep_nesting_and_comps():
    f = _fn("def f(a):\n    for x in a:\n        for y in x:\n            for z in y:\n                for w in z:\n                    print(w)\n")
    tc, sc, _ = _analyze_function(f)
    assert tc == "O(n^4)"
    g = _fn("def g(xs):\n    return [x * 2 for x in xs]\n")
    tc, sc, _ = _analyze_function(g)
    assert sc == "O(n)"
    h = _fn("async def h(q):\n    q.put(1)\n")
    tc, sc, _ = _analyze_function(h)
    assert tc == "O(1)" and sc == "O(n)"
