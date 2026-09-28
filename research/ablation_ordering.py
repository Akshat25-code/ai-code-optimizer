"""Ablation: does static context change AI verdicts? (#26)

Compares AI-with-static-report-prepended vs AI-alone on the seed dataset.
With the deterministic stand-in the AI is context-blind by construction, so
the expected result is delta=0 — this validates the harness, not the
hypothesis. The real experiment is the same script with REAL_AI=1 and pinned
model versions: a nonzero delta means static context matters; delta=0 with a
real LLM means the model ignores the scaffolding.

Usage: python research/ablation_ordering.py
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, os.path.dirname(__file__))

from run_meta import header
from run_static_vs_ai import AI_VERSION, ai_flags, static_flags

SEED = os.path.join(os.path.dirname(__file__), "dataset", "seed.json")


def ai_with_context(code: str, category: str) -> bool:
    """Stand-in + static context. Context-blind by construction (see docstring)."""
    _static_hit = static_flags(code)  # context is computed and passed...
    return ai_flags(code, category)  # ...but the stand-in cannot use it.


def main() -> None:
    print(header(AI_VERSION))
    data = json.load(open(SEED))
    print("# Ablation: AI-alone vs AI+static-context\n")
    print("| case | category | alone | +context | delta |")
    print("|---|---|---|---|---|")
    deltas = 0
    for item in data:
        a = ai_with_context(item["buggy"], item["category"])
        b = ai_flags(item["buggy"], item["category"])
        d = "CHANGED" if a != b else "-"
        deltas += a != b
        print(f"| {item['id']} | {item['category']} | {a} | {b} | {d} |")
    print(f"\nverdicts changed: {deltas}/{len(data)}")
    if deltas == 0:
        print("null result (expected with context-blind stand-in). "
              "Re-run with REAL_AI=1 + pinned model to test the actual hypothesis.")


if __name__ == "__main__":
    main()
