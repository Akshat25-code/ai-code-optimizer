"""REAL-LLM evaluation: static-only vs AI-only vs combined (Steps 6-9, 11, 13).

- Static arm: bug_scanner + per-pack rules_engine + complexity_engine.
- AI arm: provider_service.ask_ai (pinned provider/model, temp fixed by code).
- Combined arm: static findings prepended AS CONTEXT in the AI prompt
  (not a union); combined-ast variant drops the rules-engine (ablation).
- Scoring (pre-registered, see RESEARCH.md): hit = predicted line within
  +/-3 of bug_line AND category match; partial = right line, wrong category
  (0.5); miss otherwise incl. unparsable AI output. Fixed controls that get
  flagged count as false positives.
- Bill protection: estimates input tokens up front and aborts over
  --max-budget (default $1.00). Prints measured spend at the end.
- Raw outputs: research/runs/<ts>.jsonl (gitignored, regenerable).

Usage:
  python research/run_real.py --provider gemini [--limit 2] [--max-budget 1.0]
Keys load from server/.env at runtime (BYOK-style, never committed).
"""
from __future__ import annotations

import argparse
import asyncio
import datetime
import json
import os
import re
import statistics
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, os.path.dirname(__file__))

SEED = os.path.join(os.path.dirname(__file__), "dataset", "seed.json")
PRICING = os.path.join(os.path.dirname(__file__), "pricing.json")
RUNS_DIR = os.path.join(os.path.dirname(__file__), "runs")

CATEGORIES = [
    "off-by-one", "null-deref", "security", "logic", "resource",
    "performance", "concurrency", "error-handling", "api-misuse",
]

# Model's free-text category -> canonical vocab (documented, fixed before run).
CAT_MAP = {
    "crypto": "security", "cryptography": "security", "weak-hash": "security",
    "weak hash": "security", "md5": "security", "injection": "security",
    "command injection": "security", "command-injection": "security",
    "hardcoded secret": "security", "hardcoded-secret": "security",
    "hardcoded credential": "security", "hardcoded password": "security",
    "shell injection": "security", "os injection": "security",
    "race": "concurrency", "race condition": "concurrency",
    "race-condition": "concurrency", "data race": "concurrency",
    "check-then-act": "concurrency", "toctou": "concurrency",
    "off by one": "off-by-one", "offbyone": "off-by-one",
    "off-by-1": "off-by-one", "index error": "off-by-one",
    "fencepost": "off-by-one",
    "null": "null-deref", "none": "null-deref", "nil": "null-deref",
    "null dereference": "null-deref", "null-deref": "null-deref",
    "attributeerror": "null-deref", "keyerror": "null-deref",
    "indexerror": "null-deref", "typeerror": "null-deref",
    "bare except": "error-handling", "swallowed exception": "error-handling",
    "exception handling": "error-handling", "silent failure": "error-handling",
    "no timeout": "api-misuse", "missing timeout": "api-misuse",
    "unbounded": "resource", "leak": "resource", "resource leak": "resource",
    "unclosed": "resource", "file handle": "resource",
    "quadratic": "performance", "inefficient loop": "performance",
    "string concat": "performance", "string concatenation": "performance",
    "precedence": "logic", "inverted": "logic", "wrong operator": "logic",
    "min/max": "logic", "always true": "logic", "always false": "logic",
}

PACK_TO_CAT = {"security-owasp": "security", "performance": "performance"}
SCANNER_CAT = {"logic": "logic"}  # runtime/compile_time -> line-only (partial)

INSTRUCTION = (
    "You are a code reviewer. Analyze this Python code for exactly one suspected bug. "
    "Return ONLY a JSON object, no other text: "
    '{"found": true/false, "line": <int or null>, '
    '"category": "<one of: ' + ", ".join(CATEGORIES) + '>", '
    '"explanation": "<one sentence>"}. '
    'If no bug, return found=false with line null.'
)


KEY_ENV = {
    "openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY",
    "gemini": "GEMINI_API_KEY", "deepseek": "DEEPSEEK_API_KEY",
    "grok": "GROK_API_KEY",
}


def read_dotenv(path: str) -> dict[str, str]:
    out: dict[str, str] = {}
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return out


def resolve_key(provider: str, cli_key: str = "") -> tuple[str, str]:
    """BYOK-style: explicit --api-key wins, else server/.env, else environment.

    server/.env takes precedence over the shell on purpose: a stale exported
    key must never silently shadow the configured one. Returns (key, source).
    Only a fingerprint (len + last4) is ever printed or logged.
    """
    name = KEY_ENV[provider]
    if cli_key:
        return cli_key, "cli --api-key"
    file_val = read_dotenv(
        os.path.join(os.path.dirname(__file__), "..", "server", ".env")).get(name, "")
    env_val = os.getenv(name, "")
    if file_val:
        if env_val and env_val != file_val:
            print(f"note: shell {name} differs from server/.env; using server/.env")
        return file_val, "server/.env"
    return env_val, "environment"


def fingerprint(key: str) -> str:
    return f"len={len(key)} last4={key[-4:]}" if key else "MISSING"


def est_tokens(text: str) -> int:
    try:
        import tiktoken
        return len(tiktoken.get_encoding("cl100k_base").encode(text))
    except Exception:
        return max(1, len(text) // 4)


def sanitize(text: str) -> str:
    """Strip embedded API keys from error text before logging/printing."""
    return re.sub(r"([?&]key=)[^&\s'\"]+", r"\1[REDACTED]", text)


def norm_cat(raw: str) -> str:
    c = (raw or "").strip().lower()
    if c in CATEGORIES:
        return c
    return CAT_MAP.get(c, c)


def parse_verdict(text: str) -> dict:
    """Extract {found, line, category} from model text. Unparsable -> miss."""
    m = re.search(r"\{[^{}]*\"found\"[^{}]*\}", text, re.DOTALL)
    if not m:
        return {"found": False, "line": None, "category": "", "parse_ok": False}
    try:
        obj = json.loads(m.group(0))
    except Exception:
        return {"found": False, "line": None, "category": "", "parse_ok": False}
    line = obj.get("line")
    try:
        line = int(line) if line is not None else None
    except (TypeError, ValueError):
        line = None
    return {
        "found": bool(obj.get("found")),
        "line": line,
        "category": norm_cat(str(obj.get("category") or "")),
        "parse_ok": True,
    }


def static_findings(code: str, language: str = "python") -> tuple[list[dict], dict]:
    """Collectors return [(line, category|None, source)] + context text."""
    from services.analysis.bug_scanner import scan_python, scan_javascript
    from services.analysis.rules_engine import RulesEngine
    from services.analysis.complexity_engine import analyze_complexity

    findings: list[dict] = []
    ctx_lines: list[str] = []
    raw: dict = {}
    try:
        report = scan_python(code) if language == "python" else scan_javascript(code)
        raw["bug_scanner"] = report
        for key in ("compile_time_errors", "runtime_errors", "logic_errors"):
            for e in report.get(key, []):
                findings.append({
                    "line": e.get("line"), "category": SCANNER_CAT.get(e.get("category")),
                    "source": "bug_scanner:" + e.get("error_name", "?"),
                    "message": e.get("message", "")[:160],
                })
        for t in report.get("top_priorities", [])[:5]:
            ctx_lines.append(f"- [{t.get('severity')}] line {t.get('line')}: {t.get('message','')[:140]}")
    except Exception as e:
        raw["bug_scanner_error"] = str(e)[:200]
    try:
        engine = RulesEngine()
        for pack, rules in engine.get_all_packs().items():
            for v in engine.evaluate(code, language, rules):
                findings.append({
                    "line": v.line, "category": PACK_TO_CAT.get(pack),
                    "source": f"rules:{pack}/{v.rule_name}",
                    "message": v.message[:160],
                })
                if len(ctx_lines) < 13:
                    ctx_lines.append(f"- [rules:{pack}] line {v.line}: {v.message[:140]}")
        raw["rules_packs"] = sorted(engine.get_all_packs().keys())
    except Exception as e:
        raw["rules_error"] = str(e)[:200]
    try:
        rep = analyze_complexity(code, language)
        raw["complexity"] = {"grade": rep.get("grade"), "score": rep.get("score")}
        fns = rep.get("functions", [])
        if fns:
            worst = max(fns, key=lambda f: f.get("cyclomatic_complexity", 1))
            ctx_lines.append(
                f"- [complexity] worst function {worst.get('name')} "
                f"CC={worst.get('cyclomatic_complexity')} grade={rep.get('grade')}"
            )
    except Exception as e:
        raw["complexity_error"] = str(e)[:200]
    return findings, {"text": "\n".join(ctx_lines[:13]), "raw": raw}


def score(findings: list[dict], bug_line: int, category: str) -> float:
    """1.0 hit (line +/-3 + category), 0.5 partial (line only), else 0."""
    best = 0.0
    for f in findings:
        line = f.get("line")
        if not isinstance(line, int):
            continue
        if abs(line - bug_line) <= 3:
            best = max(best, 1.0 if f.get("category") == category else 0.5)
    return best


def build_prompt(code: str, context: str) -> tuple[str, str]:
    base = INSTRUCTION + "\n\nCode:\n```python\n" + code + "\n```"
    if context:
        return base, ("Automated tool findings (use as hints, verify yourself):\n"
                      + context + "\n\n" + base)
    return base, base


async def ask(provider: str, code: str, instruction: str,
              api_keys: dict | None = None) -> tuple[str, int, int, float]:
    from services.ai.provider_service import ask_ai
    t0 = time.perf_counter()
    _, text, ti, to = await asyncio.wait_for(
        ask_ai("bug-detection", "python", code, provider,
               user_instructions=instruction, api_keys=api_keys),
        timeout=180,
    )
    return text, int(ti or 0), int(to or 0), time.perf_counter() - t0


async def main_async(args) -> int:
    from core.config import settings

    provider = args.provider
    api_keys = None
    if args.static_only:
        print("mode: static-only (offline; AI arms skipped — no funded key)")
    else:
        key, key_source = resolve_key(provider, args.api_key)
        if not key:
            print(f"ABORT: no key for {provider} (tried --api-key, server/.env, env).")
            return 2
        api_keys = {provider: key}
        print(f"key: {fingerprint(key)} from {key_source}")
    model = {"openai": settings.openai_model, "anthropic": settings.anthropic_model,
             "gemini": settings.gemini_model}.get(provider, "?")
    if provider == "gemini":
        model += " -> fallback chain [gemini-2.5-flash, gemini-2.5-pro, ...], first non-404 wins"
    data = json.load(open(SEED, encoding="utf-8"))
    if args.limit:
        data = data[:args.limit]
    pricing = json.load(open(PRICING, encoding="utf-8"))
    rate = pricing.get(provider, {})
    pin = f"{provider}/{rate.get('model', model)} temp=0.2(code-fixed)"

    # --- budget guard (estimate before spending) ---
    per_case_in = 0
    for item in data:
        _, ctx = static_findings(item["buggy"])  # also warms engines
        for variant in ("ai", "combined", "combined-ast"):
            c = ctx["text"] if variant == "combined" else ""
            _, full = build_prompt(item["buggy"], c)
            per_case_in += est_tokens(full) + 800  # builder overhead + fixed control
    est_cost = per_case_in / 1e6 * rate.get("input_per_1m", 0) + 0.01
    print(f"pin: {pin} | cases: {len(data)} | est. input tokens: ~{per_case_in} "
          f"| est. cost <= ${est_cost:.4f} (budget ${args.max_budget:.2f})")
    if est_cost > args.max_budget and not args.static_only:
        print("ABORT: estimate exceeds budget. Raise --max-budget explicitly.")
        return 2

    os.makedirs(RUNS_DIR, exist_ok=True)
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = os.path.join(RUNS_DIR, f"real-{provider}-{ts}.jsonl")
    logf = open(log_path, "w", encoding="utf-8")

    agg: dict[str, dict[str, list[float]]] = {}
    total_in = total_out = 0
    lat: list[float] = []
    for item in data:
        cat, bl = item["category"], item["bug_line"]
        d = agg.setdefault(cat, {"s": [0.0, 0, 0], "a": [0.0, 0, 0],
                                 "c": [0.0, 0, 0], "ca": [0.0, 0, 0]})
        findings, ctx = static_findings(item["buggy"])
        s_tp = score(findings, bl, cat)
        d["s"][0] += s_tp
        d["s"][2] += 1 - min(1.0, s_tp)  # FN mass

        s_fp = 0
        try:
            f_find, _ = static_findings(item["fixed"])
            s_fp = 1 if f_find else 0
        except Exception:
            pass
        d["s"][1] += s_fp

        variants = [] if args.static_only else (("a", "ai"), ("c", "combined"), ("ca", "combined-ast"))
        for key, variant in variants:
            c = ctx["text"] if variant == "combined" else ""
            if variant == "combined-ast":
                c = "(rules engine disabled for this ablation; complexity only)"
            instr, full = build_prompt(item["buggy"], c)
            _ = full  # full prompt assembled by provider builder at call time
            try:
                text, ti, to, dt = await ask(provider, item["buggy"], instr, api_keys)
                total_in += ti
                total_out += to
                lat.append(dt)
                v = parse_verdict(text)
                tp = 0.0
                if v["found"] and isinstance(v["line"], int):
                    tp = 1.0 if (abs(v["line"] - bl) <= 3 and v["category"] == cat) else (
                        0.5 if abs(v["line"] - bl) <= 3 else 0.0)
                d[key][0] += tp
                d[key][2] += 1 - min(1.0, tp)
                fp = 0
                try:
                    ftext, fti, fto, _ = await ask(provider, item["fixed"], instr, api_keys)
                    total_in += fti
                    total_out += fto
                    fp = 1 if parse_verdict(ftext).get("found") else 0
                except Exception as e:
                    ftext, fp = sanitize(f"FIXED-CONTROL-ERROR: {e}")[:200], 0
                d[key][1] += fp
                logf.write(json.dumps({
                    "id": item["id"], "category": cat, "bug_line": bl,
                    "condition": key, "score": tp, "fp": fp,
                    "verdict": v, "latency_s": round(dt, 2),
                    "tokens_in": ti, "tokens_out": to,
                    "static_findings": findings,
                    "ai_text": text[:4000],
                }, ensure_ascii=False) + "\n")
                await asyncio.sleep(1)  # rate-limit courtesy
            except Exception as e:
                logf.write(json.dumps({"id": item["id"], "condition": key,
                                       "error": sanitize(str(e))[:300]}) + "\n")
                d[key][2] += 1
    logf.close()

    def prf(tp: float, fp: float, fn: float) -> tuple[float, float, float]:
        p = tp / (tp + fp) if (tp + fp) else 0.0
        r = tp / (tp + fn) if (tp + fn) else 0.0
        f = 2 * p * r / (p + r) if (p + r) else 0.0
        return p, r, f

    def agg_tot(key: str) -> tuple[float, float, float]:
        return (sum(v[key][0] for v in agg.values()),
                sum(v[key][1] for v in agg.values()),
                sum(v[key][2] for v in agg.values()))

    cost = total_in / 1e6 * rate.get("input_per_1m", 0) + total_out / 1e6 * rate.get("output_per_1m", 0)
    print(f"# REAL results ({pin}, n={len(data)})")
    print("| condition | precision | recall | F1 |")
    print("|---|---|---|---|")
    rows = [("static-only", "s")]
    if not args.static_only:
        rows += [("AI-only", "a"), ("combined", "c"), ("combined-ast (ablation)", "ca")]
    for label, key in rows:
        p, r, f = prf(*agg_tot(key))
        print(f"| {label} | {p:.2f} | {r:.2f} | {f:.2f} |")
    cats = ["s"] if args.static_only else ["s", "a", "c", "ca"]
    print("\n## By category (F1)" + ("" if not args.static_only else " — static only") + "\n")
    print("| category | " + " | ".join(cats) + " | n |")
    print("|---|---|---|---|---|---|" if not args.static_only else "|---|---|---|")
    for cat, v in sorted(agg.items()):
        n = sum(1 for i in data if i["category"] == cat)
        cells = " | ".join(f"{prf(*v[k])[2]:.2f}" for k in cats)
        print(f"| {cat} | {cells} | {n} |")
    if args.static_only:
        partials = sum(1 for i in data for _ in [0]
                       if score(static_findings(i["buggy"])[0], i["bug_line"], i["category"]) == 0.5)
        print(f"\npartials (right line, wrong category): {partials}/{len(data)}")
    print(f"\nmeasured: tokens_in={total_in} tokens_out={total_out} "
          f"cost=${cost:.4f} p50_latency={statistics.median(lat) if lat else None}s")
    print(f"raw log: {log_path}")
    return 0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--provider", default="gemini")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--max-budget", type=float, default=1.0)
    ap.add_argument("--api-key", default="",
                    help="BYOK runtime key (preferred over files/env; never stored)")
    ap.add_argument("--static-only", action="store_true",
                    help="offline: score the static arm only, skip all LLM calls")
    args = ap.parse_args()
    raise SystemExit(asyncio.run(main_async(args)))


if __name__ == "__main__":
    main()
