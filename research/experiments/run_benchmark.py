"""Benchmark experiment (Priorities 4-9): correctness + runtime + complexity.

Pipeline per program: original/tests -> reference/tests -> traditional
baseline -> complexity before/after -> (if funded key) LLM arms A/B/C/D ->
correctness + runtime + cost of each LLM output.

Local subprocess execution is used (dataset code is self-authored and
trusted); production verification still goes through the Docker sandbox
(see services/execution/verification_engine.py).

Usage:
  python research/experiments/run_benchmark.py [--limit N] [--languages python,java]
      [--models openai,anthropic,gemini] [--max-budget 5.0] [--repeats 5]
"""
import argparse
import json
import os
import statistics
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "server"))
sys.path.insert(0, os.path.join(ROOT, "research"))

DEFAULT_REPEATS = 5
DEFAULT_TIMEOUT = 60


def load_config():
    cfg = {"models": [], "repeats": DEFAULT_REPEATS, "timeout": DEFAULT_TIMEOUT,
           "max_budget": 5.0, "ablation_subset": 100}
    path = os.path.join(ROOT, "research", "config.yaml")
    try:
        import yaml
        with open(path, encoding="utf-8") as f:
            user = yaml.safe_load(f) or {}
        cfg.update(user)
    except Exception:
        pass
    return cfg


def run_snippet(lang, code, stdin, timeout=DEFAULT_TIMEOUT, opt=None):
    """Execute a dataset snippet locally. Returns (stdout or None, ms, error)."""
    with tempfile.TemporaryDirectory(prefix="bexp_") as td:
        try:
            if lang == "python":
                src = os.path.join(td, "p.py")
                open(src, "w", encoding="utf-8").write(code)
                cmd = [sys.executable, src]
            elif lang == "javascript":
                src = os.path.join(td, "p.js")
                open(src, "w", encoding="utf-8").write(code)
                cmd = ["node", src]
            elif lang == "java":
                src = os.path.join(td, "Main.java")
                open(src, "w", encoding="utf-8").write(code)
                c = subprocess.run(["javac", src], capture_output=True, text=True,
                                   timeout=60, cwd=td)
                if c.returncode != 0:
                    return None, 0.0, f"COMPILE:{c.stderr.strip()[:200]}"
                cmd = ["java", "Main"]
            elif lang == "cpp":
                src = os.path.join(td, "p.cpp")
                exe = os.path.join(td, "p.exe" if os.name == "nt" else "p")
                open(src, "w", encoding="utf-8").write(code)
                c = subprocess.run(["g++", src, "-o", exe, opt or "-O0"],
                                   capture_output=True, text=True,
                                   timeout=120, cwd=td)
                if c.returncode != 0:
                    return None, 0.0, f"COMPILE:{c.stderr.strip()[:200]}"
                cmd = [exe]
            else:
                return None, 0.0, f"unsupported language {lang}"
            t0 = time.perf_counter()
            p = subprocess.run(cmd, input=stdin, capture_output=True, text=True,
                               timeout=timeout, cwd=td)
            dt = (time.perf_counter() - t0) * 1000
        except subprocess.TimeoutExpired:
            return None, 0.0, "TIMEOUT"
        except FileNotFoundError as e:
            return None, 0.0, f"MISSING:{e.filename}"
    if p.returncode != 0:
        return None, 0.0, f"EXIT{p.returncode}:{p.stderr.strip()[:200]}"
    return p.stdout, dt, ""


def check_tests(lang, code, tests, timeout=DEFAULT_TIMEOUT):
    """Run code against all (stdin, expected) tests. Returns (passed, total)."""
    passed = 0
    for t in tests:
        out, _, err = run_snippet(lang, code, t["stdin"], timeout)
        if not err and out == t["stdout"]:
            passed += 1
    return passed, len(tests)


def time_median(lang, code, stdin, repeats, timeout=DEFAULT_TIMEOUT):
    samples = []
    for _ in range(max(1, repeats)):
        out, ms, err = run_snippet(lang, code, stdin, timeout)
        if err:
            return None, err
        samples.append(ms)
    return statistics.median(samples), ""


def complexity_metrics(lang, code):
    """Static metrics: LOC always; AST metrics for Python."""
    loc = len([l for l in code.splitlines() if l.strip()])
    m = {"loc": loc, "cyclomatic_total": None, "functions": None,
         "ast_nodes": None, "max_nesting": None}
    if lang == "python":
        try:
            import ast as _ast
            tree = _ast.parse(code)
            m["ast_nodes"] = sum(1 for _ in _ast.walk(tree))
            m["functions"] = sum(isinstance(n, (_ast.FunctionDef, _ast.AsyncFunctionDef))
                                 for n in _ast.walk(tree))
            sys.path.insert(0, os.path.join(ROOT, "server"))
            from services.analysis.complexity_engine import analyze_complexity
            rep = analyze_complexity(code, "python")
            fns = rep.get("functions", [])
            m["cyclomatic_total"] = sum(f.get("cyclomatic_complexity", 1) for f in fns)
        except Exception:
            pass
    return m


def traditional_baseline(entry, biggest_stdin, timeout=DEFAULT_TIMEOUT):
    """Non-LLM baseline (Priority 7). Returns dict, possibly skipped."""
    from baselines.traditional import cpp_o0_vs_o2, java_jit_vs_interp
    lang = entry["language"]
    if lang == "cpp":
        return {"kind": "compiler -O0 vs -O2 (same source)",
                **cpp_o0_vs_o2(entry["original_code"], biggest_stdin, timeout)}
    if lang == "java":
        return {"kind": "JIT default vs -Xint (same bytecode)",
                **java_jit_vs_interp(entry["original_code"], biggest_stdin, timeout)}
    return {"kind": "reference-oracle timing (no compiler knob for "
                    + lang + ")", "ok": True, "note": "see reference_ms"}


ABLATON_CONTEXTS = ("A-source", "B+ast", "C+complexity", "D+profile")


def build_prompts(entry):
    from services.analysis.ast_analyzer import analyze_python_ast
    code, lang = entry["original_code"], entry["language"]
    base = (f"Optimize this {lang} program for speed. Keep exact stdin/stdout "
            f"behavior. Return ONLY a fenced code block, no explanation.\n\n{code}")
    if lang != "python":
        simple = base + "\n\nKnown inefficiencies to address: " + entry["inefficiency"] + "."
        return {"A-source": simple, "B+ast": simple, "C+complexity": simple,
                "D+profile": simple}
    ast_ctx = analyze_python_ast(code) or ""
    from services.analysis.complexity_engine import analyze_complexity
    cx = analyze_complexity(code, "python")
    cx_ctx = json.dumps({"grade": cx.get("grade"),
                         "functions": [(f.get("name"), f.get("cyclomatic_complexity"))
                                       for f in cx.get("functions", [])]})
    prof_ctx = ""
    try:
        from services.execution.performance_profiler import profile_python
        pr = profile_python(code, timeout_ms=15000)
        if pr.get("ok"):
            prof_ctx = json.dumps({"peak_kb": pr.get("peak_kb"),
                                   "hotspots": pr.get("hotspots", [])[:5]})
    except Exception:
        pass
    return {
        "A-source": base,
        "B+ast": base + "\n\nAST structure:\n" + ast_ctx,
        "C+complexity": base + "\n\nAST structure:\n" + ast_ctx
        + "\n\nComplexity:\n" + cx_ctx,
        "D+profile": base + "\n\nAST structure:\n" + ast_ctx
        + "\n\nComplexity:\n" + cx_ctx + "\n\nRuntime profile:\n" + prof_ctx,
    }


def extract_code(text, lang):
    import re
    m = re.search(r"```[a-zA-Z0-9_+\-]*\n([\s\S]*?)```", text or "")
    return m.group(1).strip() if m else (text or "").strip()


def resolve_key(provider):
    names = {"openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY",
             "gemini": "GEMINI_API_KEY"}
    path = os.path.join(ROOT, "server", ".env")
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                if line.strip().startswith(names[provider] + "="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return os.getenv(names[provider], "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--languages", default="")
    ap.add_argument("--models", default="")
    ap.add_argument("--max-budget", type=float, default=0)
    ap.add_argument("--repeats", type=int, default=0)
    args = ap.parse_args()
    cfg = load_config()
    if args.max_budget:
        cfg["max_budget"] = args.max_budget
    if args.repeats:
        cfg["repeats"] = args.repeats
    models = [m.strip() for m in (args.models or ",".join(cfg["models"])).split(",") if m.strip()]
    langs = {l.strip() for l in args.languages.split(",") if l.strip()} or None

    data = json.load(open(os.path.join(ROOT, "research", "datasets",
                                       "benchmark.json"), encoding="utf-8"))
    if langs:
        data = [d for d in data if d["language"] in langs]
    if args.limit:
        data = data[:args.limit]

    # Budget guard for any LLM calls (est: 2k in + 0.5k out per call).
    live_models = []
    pricing = {}
    try:
        pricing = json.load(open(os.path.join(ROOT, "research", "pricing.json"),
                                 encoding="utf-8"))
    except Exception:
        pass
    for m in models:
        key = resolve_key(m)
        if not key:
            print(f"model {m}: no key, cells will be pending")
            continue
        n_calls = len(data) * 4
        est = n_calls * (2000 / 1e6 * pricing.get(m, {}).get("input_per_1m", 0)
                         + 500 / 1e6 * pricing.get(m, {}).get("output_per_1m", 0))
        print(f"model {m}: {n_calls} calls, est. ${est:.4f} (budget ${cfg['max_budget']:.2f})")
        if est <= cfg["max_budget"]:
            live_models.append((m, key))
        else:
            print(f"model {m}: over budget, cells will be pending")

    results = []
    for i, entry in enumerate(data, 1):
        lang = entry["language"]
        tests = entry["tests"]
        biggest = max(tests, key=lambda t: len(t["stdin"]))["stdin"]
        r = {"id": entry["id"], "language": lang, "family": entry["family"],
             "baseline_complexity": entry.get("baseline_complexity"),
             "reference_complexity": entry.get("reference_complexity")}
        # correctness: original + reference against dataset tests
        op, _ = check_tests(lang, entry["original_code"], tests)
        rp, _ = check_tests(lang, entry["reference_code"], tests)
        r["original_tests_passed"] = [op, len(tests)]
        r["reference_tests_passed"] = [rp, len(tests)]
        # static complexity before/after
        r["complexity_before"] = complexity_metrics(lang, entry["original_code"])
        r["complexity_after_reference"] = complexity_metrics(lang, entry["reference_code"])
        # runtime: reference vs original medians
        ref_ms, _ = time_median(lang, entry["reference_code"], biggest, cfg["repeats"])
        ori_ms, _ = time_median(lang, entry["original_code"], biggest, cfg["repeats"])
        r["reference_ms"] = ref_ms
        r["original_ms"] = ori_ms
        r["oracle_speedup"] = (ori_ms / ref_ms) if ref_ms and ori_ms and ref_ms > 0 else None
        # traditional non-LLM baseline
        r["traditional"] = traditional_baseline(entry, biggest)
        # LLM arms A/B/C/D
        r["llm"] = {}
        if live_models:
            from services.ai.provider_service import ask_ai
            prompts = build_prompts(entry)
            for model, key in live_models:
                r["llm"][model] = {}
                for arm in ABLATON_CONTEXTS:
                    try:
                        import asyncio as _aio
                        _, text, ti, to = _aio.run(ask_ai(
                            "optimization", lang, entry["original_code"], model,
                            user_instructions=prompts[arm],
                            api_keys={model: key}))
                        code = extract_code(text, lang)
                        cp, _ = check_tests(lang, code, tests)
                        med, _ = time_median(lang, code, biggest, cfg["repeats"])
                        cx = complexity_metrics(lang, code)
                        r["llm"][model][arm] = {
                            "tests_passed": [cp, len(tests)], "median_ms": med,
                            "tokens_in": ti, "tokens_out": to,
                            "complexity_after": cx, "raw_chars": len(text),
                        }
                    except Exception as e:
                        r["llm"][model][arm] = {"error": str(e)[:200]}
                    time.sleep(1)
        else:
            r["llm"] = {"pending": "no funded provider key (see RESEARCH.md §6)"}
        results.append(r)
        if i % 10 == 0:
            print(f"  ...{i}/{len(data)}", flush=True)

    ts = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    outp = os.path.join(ROOT, "research", "results", f"benchmark_{ts}.json")
    os.makedirs(os.path.dirname(outp), exist_ok=True)
    json.dump({"config": {**cfg, "models_requested": models,
                          "models_live": [m for m, _ in live_models]},
               "results": results}, open(outp, "w", encoding="utf-8"), indent=1)
    print(f"wrote {outp}: {len(results)} results")
    try:
        from analysis.summarize import main as summarize
        summarize(outp)
    except Exception as e:
        print("summarize skipped:", e)


if __name__ == "__main__":
    main()
