"""Complexity-engine agreement vs radon on real repo files.

Usage: python research/benchmark_complexity.py [path...] (default: server/services)
Outputs agreement rate + divergence list (legitimate small finding:
"we match radon X% of the time; here is why we diverge").
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, os.path.dirname(__file__))

from run_meta import header
from radon.complexity import cc_visit
from services.analysis.complexity_engine import analyze_complexity


def radon_avg(path: str) -> float:
    try:
        src = open(path, encoding="utf-8-sig", errors="replace").read()
        blocks = cc_visit(src)
        if not blocks:
            return 1.0
        return sum(b.complexity for b in blocks) / len(blocks)
    except Exception:
        return float("nan")


def ours_avg(path: str) -> float:
    try:
        src = open(path, encoding="utf-8-sig", errors="replace").read()
        rep = analyze_complexity(src, "python")
        fns = rep.get("functions", [])
        if not fns:
            return 1.0
        vals = [f.get("cyclomatic_complexity", 1) for f in fns]
        return sum(vals) / len(vals)
    except Exception:
        return float("nan")


def collect(paths: list[str]) -> list[str]:
    out = []
    for p in paths:
        if os.path.isfile(p) and p.endswith(".py"):
            out.append(p)
        elif os.path.isdir(p):
            for r, _, fs in os.walk(p):
                if "venv" in r or ".venv" in r or "__pycache__" in r:
                    continue
                out.extend(os.path.join(r, f) for f in fs if f.endswith(".py"))
    return sorted(set(out))


def main() -> None:
    roots = sys.argv[1:] or ["server/services"]
    files = collect(roots)[:200]
    agree = div = 0
    divs = []
    for f in files:
        a, b = radon_avg(f), ours_avg(f)
        if a != a or b != b:  # nan
            continue
        if abs(a - b) <= 1.0:
            agree += 1
        else:
            div += 1
            divs.append((f, a, b))
    total = agree + div
    print(header("n/a (static-vs-static)"))
    print(f"# Complexity agreement (n={total} files)")
    print(f"agreement(|delta|<=1): {agree}/{total} = {agree/total:.1%}" if total else "no files")
    for f, a, b in divs[:20]:
        print(f"- {f}: radon={a:.1f} ours={b:.1f}")


if __name__ == "__main__":
    main()
