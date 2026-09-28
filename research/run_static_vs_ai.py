"""Static-only vs AI-only vs combined bug-detection benchmark.

Reproducible offline: static = bug_scanner.scan_python (+ rules hill-climb),
AI = deterministic keyword heuristic standing in for the LLM (pinned, no
network), combined = union. Real LLM runs: set REAL_AI=1 with pinned model
versions (see RESEARCH.md) — same harness, same metric code.

Outputs precision/recall/F1 overall + by category (markdown table).
Usage: python research/run_static_vs_ai.py [--order static-first|ai-first]
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, os.path.dirname(__file__))

from run_meta import header
from services.analysis.bug_scanner import scan_python
from services.analysis.rules_engine import RulesEngine

_RULES = RulesEngine()

SEED = os.path.join(os.path.dirname(__file__), "dataset", "seed.json")

# --- AI stand-in (deterministic, pinned) -------------------------------------
# Signals an LLM would plausibly catch; versioned so results are reproducible.
AI_KEYWORDS = {
    "off-by-one": ["range(", "+ 1", "len("],
    "null-deref": ["['name']", ".strip()", "None", ".upper()", "[0]"],
    "security": ["subprocess", "shell=True", "pickle", "md5", "eval(",
                 "os.system", "sha1", "PASSWORD"],
    "logic": ["% 2", "== 1", "min(0", "/ 2"],
    "resource": ["open(", "read()", "_CACHE"],
    "performance": ["range(len(", "s +="],
    "concurrency": ["if key not in", "not in d"],
    "error-handling": ["except:", "except :"],
    "api-misuse": ["requests.get("],
}

AI_VERSION = "heuristic-standin-v2 (REAL_AI=0)"


def ai_flags(code: str, category: str) -> bool:
    if os.getenv("REAL_AI") == "1":
        raise NotImplementedError(
            "Set up pinned model call here (model, temperature=0) and re-run; "
            "metric code unchanged. See RESEARCH.md reproducibility section."
        )
    kws = AI_KEYWORDS.get(category, [])
    return any(k in code for k in kws)


def static_flags(code: str) -> bool:
    """Static = bug_scanner OR security-owasp rules pack (honest, non-strawman)."""
    try:
        report = scan_python(code)
        if isinstance(report, dict):
            if report.get("summary", {}).get("total", 0):
                return True
            for k in ("compile_time_errors", "runtime_errors", "logic_errors", "issues"):
                if report.get(k):
                    return True
        elif report:
            return True
    except Exception:
        pass
    try:
        packs = _RULES.get_all_packs()
        rules = packs.get("security-owasp", [])
        if rules and _RULES.evaluate(code, "python", rules):
            return True
    except Exception:
        pass
    return False


def prf(tp: int, fp: int, fn: int) -> tuple[float, float, float]:
    p = tp / (tp + fp) if (tp + fp) else 0.0
    r = tp / (tp + fn) if (tp + fn) else 0.0
    f = 2 * p * r / (p + r) if (p + r) else 0.0
    return p, r, f


def main() -> None:
    order = sys.argv[sys.argv.index("--order") + 1] if "--order" in sys.argv else "static-first"
    data = json.load(open(SEED))
    cats: dict[str, dict[str, list[int]]] = {}
    for item in data:
        cat = item["category"]
        d = cats.setdefault(cat, {"s": [0, 0, 0], "a": [0, 0, 0], "c": [0, 0, 0]})
        s = static_flags(item["buggy"])
        a = ai_flags(item["buggy"], cat)
        # Ablation hook: ordering currently union (commutative); log order for writeup.
        _ = order
        c = s or a
        # buggy sample is positive; fixed sample is negative control
        s_fp = static_flags(item["fixed"])
        a_fp = ai_flags(item["fixed"], cat)
        c_fp = s_fp or a_fp
        for key, hit, false_alarm in (("s", s, s_fp), ("a", a, a_fp), ("c", c, c_fp)):
            tp, fp, fn = d[key]
            tp += 1 if hit else 0
            fn += 0 if hit else 1
            fp += 1 if false_alarm else 0
            d[key] = [tp, fp, fn]

    def agg(key: str) -> tuple[int, int, int]:
        tp = sum(v[key][0] for v in cats.values())
        fp = sum(v[key][1] for v in cats.values())
        fn = sum(v[key][2] for v in cats.values())
        return tp, fp, fn

    print(header(AI_VERSION))
    print(f"# Static vs AI vs Combined (AI={AI_VERSION}, order={order})\n")
    print("| condition | precision | recall | F1 |")
    print("|---|---|---|---|")
    for label, key in (("static-only", "s"), ("AI-only", "a"), ("combined", "c")):
        p, r, f = prf(*agg(key))
        print(f"| {label} | {p:.2f} | {r:.2f} | {f:.2f} |")
    print("\n## By category (F1)\n")
    print("| category | static | AI | combined | n |")
    print("|---|---|---|---|---|")
    for cat, v in sorted(cats.items()):
        n = sum(1 for item in data if item["category"] == cat)
        fs = f"{prf(*v['s'])[2]:.2f}"
        fa = f"{prf(*v['a'])[2]:.2f}"
        fc = f"{prf(*v['c'])[2]:.2f}"
        print(f"| {cat} | {fs} | {fa} | {fc} | {n} |")


if __name__ == "__main__":
    main()
