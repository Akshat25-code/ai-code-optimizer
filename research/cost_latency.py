"""Accuracy vs cost vs latency frontier across providers (#28).

Runs a --limit subset of the seed through each *configured* provider
(pinned models from pricing.json, temperature fixed by provider_service),
recording verdict (keyword match on the AI's own optimized text is NOT used —
we record raw latency/tokens; accuracy comes from run_static_vs_ai with
REAL_AI=1). Cost = measured tokens x pricing.json rates.

With no provider keys configured (typical for CI), it prints the pricing
table and exits 0 with 'measurement skipped' — the method, not numbers.

Usage: python research/cost_latency.py [--limit 5] [--providers openai,gemini]
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import statistics
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))
sys.path.insert(0, os.path.dirname(__file__))

from run_meta import header

SEED = os.path.join(os.path.dirname(__file__), "dataset", "seed.json")
PRICING = os.path.join(os.path.dirname(__file__), "pricing.json")

KEY_ENV = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "grok": "GROK_API_KEY",
}


def parse_args() -> tuple[int, list[str]]:
    limit = 5
    providers: list[str] = []
    for i, a in enumerate(sys.argv[1:]):
        if a == "--limit" and i + 2 <= len(sys.argv[1:]):
            limit = int(sys.argv[1:][i + 1])
        if a == "--providers" and i + 2 <= len(sys.argv[1:]):
            providers = sys.argv[1:][i + 1].split(",")
    return limit, [p.strip().lower() for p in providers if p.strip()]


def resolve_key(provider: str) -> tuple[str, str]:
    """server/.env wins over shell (stale exports must not shadow config)."""
    name = KEY_ENV.get(provider, "")
    file_val, env_val = "", ""
    try:
        with open(os.path.join(os.path.dirname(__file__), "..", "server", ".env"),
                  encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if line.startswith(name + "="):
                    file_val = line.split("=", 1)[1].strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    env_val = os.getenv(name, "")
    if file_val:
        return file_val, "server/.env"
    return env_val, "environment"


async def measure(provider: str, cases: list[dict]) -> dict:
    from services.ai.provider_service import ask_ai, ProviderConfigError

    key, key_source = resolve_key(provider)
    api_keys = {provider: key} if key else None
    latencies: list[float] = []
    tok_in = tok_out = 0
    ok = err = 0
    last_error: str | None = None
    for item in cases:
        t0 = time.perf_counter()
        try:
            _, _text, ti, to = await ask_ai(
                "bug-detection", "python", item["buggy"], provider,
                api_keys=api_keys,
            )
            latencies.append(time.perf_counter() - t0)  # successes only
            tok_in += ti or 0
            tok_out += to or 0
            ok += 1
        except ProviderConfigError as e:
            err += 1
            return {"provider": provider, "skipped": f"not configured ({e})"}
        except Exception as e:  # noqa: BLE001 — record, don't crash the frontier
            err += 1
            last_error = re.sub(r"([?&]key=)[^&\s'\"]+", r"\1[REDACTED]",
                                f"{type(e).__name__}: {e}")[:120]
    prices = json.load(open(PRICING))[provider]
    cost = tok_in / 1e6 * prices["input_per_1m"] + tok_out / 1e6 * prices["output_per_1m"]
    return {
        "provider": provider,
        "model": prices["model"],
        "n": ok,
        "errors": err,
        "p50_latency_s": round(statistics.median(latencies), 2) if latencies else None,
        "tokens_in": tok_in,
        "tokens_out": tok_out,
        "est_cost_usd": round(cost, 6),
        "last_error": last_error,
    }


async def main_async() -> None:
    print(header("n/a (live providers)"))
    limit, only = parse_args()
    pricing = json.load(open(PRICING))
    print(f"# Cost/latency frontier (as_of={pricing['as_of']}, limit={limit})\n")
    print("| provider | model | $/1M in | $/1M out |")
    print("|---|---|---|---|")
    for name, p in pricing.items():
        if name.startswith("_") or name == "as_of" or (only and name not in only):
            continue
        print(f"| {name} | {p['model']} | {p['input_per_1m']} | {p['output_per_1m']} |")

    data = json.load(open(SEED))[:limit]
    names = [n for n in pricing if not n.startswith("_") and n != "as_of"]
    if only:
        names = [n for n in names if n in only]
    configured = [n for n in names if resolve_key(n)[0]]
    if not configured:
        print("\nmeasurement skipped: no provider API keys in environment. "
              "Set e.g. OPENAI_API_KEY and re-run.")
        return
    print("\n| provider | n ok | errors | p50 latency s (successes) | tok_in | tok_out | est. cost USD | note |")
    print("|---|---|---|---|---|---|---|---|")
    for name in configured:
        r = await measure(name, data)
        if "skipped" in r:
            print(f"| {name} | - | - | - | - | - | - | {r['skipped']} |")
        else:
            print(f"| {name} | {r['n']} | {r['errors']} | {r['p50_latency_s']} "
                  f"| {r['tokens_in']} | {r['tokens_out']} | {r['est_cost_usd']} "
                  f"| {r['last_error'] or ''} |")


if __name__ == "__main__":
    asyncio.run(main_async())
