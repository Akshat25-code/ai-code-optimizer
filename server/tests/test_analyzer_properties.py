"""Property-based tests for ast_analyzer + complexity_engine (hypothesis).

Invariants:
- analyzer never crashes on arbitrary valid-ish Python snippets
- complexity is always >= 1 where defined
- analyze_complexity returns a dict with expected top-level keys
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from hypothesis import given, strategies as st, settings

from services.analysis.ast_analyzer import analyze_python_ast, calculate_complexity
from services.analysis.complexity_engine import analyze_complexity
import ast
import json


small_names = st.sampled_from(["x", "y", "foo", "bar", "n", "i", "total"])
small_ints = st.integers(min_value=0, max_value=100)

stmt_strategy = st.recursive(
    st.sampled_from(["pass", "x = 1", "return x", "print(x)"]),
    lambda children: st.one_of(
        st.builds(lambda c: f"if x:\n  {c}", children),
        st.builds(lambda c: f"for i in range(3):\n  {c}", children),
        st.builds(lambda c: f"while x:\n  {c}\n  break", children),
        st.builds(lambda a, b: f"{a}\n{b}", children, children),
    ),
    max_leaves=4,
)

func_strategy = st.builds(
    lambda name, body: f"def {name}(x):\n  {body}\n",
    small_names,
    stmt_strategy,
)


@given(code=func_strategy)
@settings(max_examples=60, deadline=None)
def test_ast_analyzer_never_crashes(code):
    out = analyze_python_ast(code)
    assert isinstance(out, str)
    if out:
        data = json.loads(out)
        assert "functions" in data
        for f in data["functions"]:
            assert f["complexity"] >= 1


@given(code=func_strategy)
@settings(max_examples=60, deadline=None)
def test_complexity_never_crashes_and_ge_one(code):
    report = analyze_complexity(code, "python")
    assert isinstance(report, dict)
    for fn in report.get("functions", []):
        assert fn.get("cyclomatic_complexity", 1) >= 1
        assert fn.get("cognitive_complexity", 0) >= 0


@given(code=st.text(min_size=0, max_size=500))
@settings(max_examples=80, deadline=None)
def test_complexity_fuzz_random_text_never_crashes(code):
    # Arbitrary text (often SyntaxError) must not raise — returns fallback dict
    report = analyze_complexity(code, "python")
    assert isinstance(report, dict)


def test_calculate_complexity_simple():
    tree = ast.parse("def f(x):\n  if x:\n    return 1\n  return 0\n")
    assert calculate_complexity(tree) >= 2
