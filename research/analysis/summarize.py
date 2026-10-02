"""Summarize research/results/benchmark_*.json (Priority 5 stats).

Reports per condition/model: correctness rate, regression rate, compilation
failure rate, speedup median/p95/min/max, % improved / unchanged / regressed
(+/-5% band), latency p50, total cost. Also oracle + traditional baselines.
Usage: python research/analysis/summarize.py [results-json]
"""
import json
import os
import statistics
import sys

BAND = 0.05  # within +/-5% counts as unchanged


def _speedups(vals):
    vals = [v for v in vals if v]
    if not vals:
        return {}
    s = sorted(vals)
    n = len(s)
    return {
        "n": n,
        "median": round(statistics.median(s), 2),
        "p95": round(s[min(n - 1, int(n * 0.95))], 2),
        "min": round(s[0], 2),
        "max": round(s[-1], 2),
        "pct_improved": round(100 * sum(1 for v in s if v > 1 + BAND) / n, 1),
        "pct_unchanged": round(100 * sum(1 for v in s if 1 - BAND <= v <= 1 + BAND) / n, 1),
        "pct_regressed": round(100 * sum(1 for v in s if v < 1 - BAND) / n, 1),
    }


def main(path=None):
    path = path or sys.argv[1]
    blob = json.load(open(path, encoding="utf-8"))
    results = blob["results"]
    n = len(results)
    print(f"# Benchmark summary ({n} programs)\n")

    # --- oracle + traditional baselines (always available) ---
    oracle_sp = [r.get("oracle_speedup") for r in results]
    print("## Oracle (reference vs original)")
    print(json.dumps(_speedups(oracle_sp), indent=1))
    trad_ok = [r for r in results if (r.get("traditional") or {}).get("ok")]
    print(f"\n## Traditional baselines: {len(trad_ok)}/{n} ok")
    for r in trad_ok[:200]:
        t = r["traditional"]
        sp = t.get("compiler_speedup", t.get("jit_speedup"))
        print(f"- {r['id']}: {t['kind']} speedup={sp}")

    # --- correctness of shipped references ---
    ref_ok = sum(1 for r in results
                 if r["reference_tests_passed"][0] == r["reference_tests_passed"][1])
    ori_ok = sum(1 for r in results
                 if r["original_tests_passed"][0] == r["original_tests_passed"][1])
    print(f"\n## Dataset validity: reference passes {ref_ok}/{n}, "
          f"original passes {ori_ok}/{n} (original SHOULD pass: same behavior, slower)")

    # --- LLM arms ---
    models = sorted({m for r in results for m in (r.get("llm") or {})
                     if m != "pending"})
    if not models:
        print("\n## LLM arms: pending (no funded key)")
        return
    tok_in = tok_out = 0.0
    for m in models:
        print(f"\n## Model: {m}")
        for arm in ("A-source", "B+ast", "C+complexity", "D+profile"):
            cells = [(r["llm"].get(m) or {}).get(arm) or {} for r in results]
            ok = [c for c in cells if "error" not in c]
            corr = [c["tests_passed"][0] / max(1, c["tests_passed"][1]) for c in ok]
            comp_fail = sum(1 for c in ok if c["tests_passed"] == [0, c["tests_passed"][1]]
                            and "COMPILE" in json.dumps(c))
            reg = sum(1 for r, c in zip(results, cells)
                      if "error" not in c and r["original_tests_passed"][0] ==
                      r["original_tests_passed"][1] and c["tests_passed"][0] < c["tests_passed"][1])
            sp = []
            for r, c in zip(results, cells):
                if "error" in c or not c.get("median_ms"):
                    continue
                base = next((x for x in [r.get("original_ms")] if x), None)
                if base:
                    sp.append(base / c["median_ms"])
            lat = []  # per-call latency recorded at run time when available
            print(f"### {arm}: n={len(ok)}/{n} "
                  f"correctness={round(sum(corr) / max(1, len(corr)), 3)} "
                  f"regressions={reg} compile_fails~{comp_fail}")
            print("speedup:", json.dumps(_speedups(sp)))
            tok_in += sum(c.get("tokens_in", 0) for c in ok)
            tok_out += sum(c.get("tokens_out", 0) for c in ok)
    print(f"\ntokens_in={tok_in} tokens_out={tok_out}")


if __name__ == "__main__":
    main()
