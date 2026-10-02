# Research — Static + LLM Code Review: Does Combining Help?

## 1. Motivation & falsifiable question

**Q:** Does combining static analysis (AST/complexity/rules-based) with
LLM-based review catch more real bugs than either approach alone?

This repo is structurally set up to answer it: `services/analysis/`
(`ast_analyzer`, `complexity_engine`, `rules_engine`, `bug_scanner`) is the
static arm; `services/analysis/review_pipeline.py` + `services/ai/` is the
LLM arm. Null hypothesis: the union performs no better than the stronger
single arm.

## 2. Related work (starting points)

- Static analysis: SonarQube cognitive-complexity spec; radon/lizard
  cyclomatic-complexity tooling; OWASP rule packs for taint-adjacent checks.
- LLM code review: recent work on LLM-based review (e.g., CodeReviewer,
  CommentFinder lineages; large-scale studies of ChatGPT/GPT-4 on
  defect detection) generally finds high recall, weaker precision, and
  sensitivity to prompt/context — consistent with our seed results below.
- Hybrid pipelines: static context (AST, complexity hotspots) as prompt
  scaffolding for LLMs; open question whether ordering matters
  (static-first vs AI-first). Our harness supports `--order` for this ablation.

## 3. Method

- Dataset: `research/dataset/seed.json` (20 labeled synthetic cases across
  off-by-one ×2, null-deref ×2, security ×6, logic ×3, resource ×2,
  performance ×2, concurrency, error-handling, api-misuse; each with buggy +
  fixed control). Synthetic seed only — scale to 50–100 real historical bugs
  (BugsInPy subset or issue-linked GitHub PRs with buggy/fix commits) for a
  publishable claim.
- Conditions: `python research/run_real.py --provider <name>` (live;
  supersedes the stand-in `run_static_vs_ai.py`, kept for offline CI)
  - static-only = `bug_scanner` + per-pack `rules_engine` + `complexity_engine`
    + Bandit (subprocess baseline) + Semgrep `--config auto` when its binary
    exists (graceful skip otherwise)
  - AI-only = `provider_service.ask_ai` (pinned provider/model, temp 0.2 fixed
    in code), same JSON-verdict prompt, no static context
  - combined = identical prompt with static findings prepended **as context**
  - combined-ast = complexity-only context (rules-engine dropped; ablation)
- Scoring rule (pre-registered before any live run): each condition yields
  `(line, category)` findings; **hit** = predicted line within ±3 of
  `bug_line` AND category match (1.0); **partial** = right lines, wrong
  category (0.5); **miss** = otherwise, including unparsable AI output (0.0).
  Flagging a fixed control = 1 false positive. Precision/recall/F1 over these.
- Bill protection: `run_real.py` estimates input tokens up front (tiktoken,
  fallback len/4) and aborts over `--max-budget` (default $1.00); measured
  tokens × `pricing.json` printed per run. Full 20-case × 4-condition run
  estimates ≈ $0.02 on gpt-4o-mini.
- Key hygiene: keys resolve BYOK-style (`--api-key` > `server/.env` >
  environment; `.env` wins over shell so stale exports can't shadow config).
  Only fingerprints (len+last4) are printed; `key=` is scrubbed from all
  logged errors (provider error strings embed the request URL).
- Complexity agreement: `python research/benchmark_complexity.py <paths>`
  compares `analyze_complexity` vs radon per-file average CC.
- Sandbox mini-eval: `pytest server/tests/test_sandbox_escape.py` (12 tests).

## 4. Results (n=60 synthetic seed, reproducible)

Static arm, real scoring rule (`python research/run_real.py --static-only`):

| static arm contents              | precision | recall | F1   |
| in-house only (no baselines)     | 0.56      | 0.04   | 0.08 |
| + Bandit (Semgrep binary absent) | 0.71      | 0.25   | 0.37 |

By category with Bandit (F1): security 0.89 (n=12), api-misuse 0.33 (n=4),
error-handling 0.33 (n=5), logic 0.10, off-by-one 0.12, rest 0.00; 6/60
partials. Adding one off-the-shelf linter quintupled recall (0.04 → 0.25)
while holding precision — the single most cost-effective improvement in the
whole study, and evidence for the portfolio claim that baseline choice
dominates static results. In-house-only numbers: 4/60 cases flagged at all
(`security-owasp` is 4 rules; its secret regex needs 16+ chars, so
`DB_PASSWORD = 's3cret!'` slips through) — verified by inspection, and the
asymmetry that motivates the combined approach.

Stand-in reference (offline harness check, NOT a model result —
`python research/run_static_vs_ai.py`):

| condition   | precision | recall | F1   |
| static-only | 0.67      | 0.03   | 0.06 |
| AI-only     | 0.61      | 0.45   | 0.52 |
| combined    | 0.60      | 0.45   | 0.51 |

Note the union-combined F1 (0.51) sits a hair *below* AI-only (0.52):
static's false positives on fixed controls drag the union down. This is an
artifact of naive union combination — the real design under test is
static-as-prompt-context (`combined` in `run_real.py`), whose cells are
pending a funded key. Do not cite stand-in rows as model performance.

Complexity agreement (n=12, `server/services/analysis`):
`agreement(|Δ|≤1): 5/12 = 41.7%` — systematic divergence: ours undercounts
vs radon (e.g., ast_analyzer radon 9.0 vs ours 6.5) because our
cyclomatic counter uses a narrower decision-point set (no `With`/`Assert`
parity, BoolOp counted per-chain vs per-operand). Fix = align counting sets
or document the semantic difference (cognitive vs cyclomatic emphasis).

Sandbox (applied-security mini-eval):
12/12 escape/gate tests pass — 8 direct-import/exfil payloads blocked by
`_safe_import` + absent builtins; production refuses non-Docker execution
for all languages; Docker command carries `--read-only`, `no-new-privileges`,
`--user nobody`, `--memory-swap`, `--pids-limit=64`, `--network none`.

Cost/latency: `python research/cost_latency.py [--limit N] [--providers ...]`
runs the seed through each configured provider (pinned models in
`research/pricing.json`, measured tokens × list rates, p50 latency on
successes only). Pricing table is indicative (verify before citing).
Status: harness live, but no valid provider keys in this environment (the
present `OPENAI_API_KEY` returns 401), so no measured frontier yet — the
table to fill is accuracy (from `REAL_AI=1` runs) vs $/case vs p50 latency.

## 5. Ablation: does ordering / static context matter?

- Ordering: harness accepts `--order static-first|ai-first`; current union is
  commutative (order-independent by construction).
- Context: `python research/ablation_ordering.py` compares AI-alone vs
  AI+static-report-prepended per case. Result on the stand-in: **0/20
  verdicts changed (null result, expected)** — the keyword stand-in is
  context-blind by construction, which validates the harness wiring rather
  than the hypothesis.
- The real test: same script with `REAL_AI=1` + pinned model/temperature.
  Nonzero Δ means static scaffolding matters; Δ=0 with a real LLM means the
  model ignores it. Not yet run (needs provider keys).

## 6. Limitations

- n=20 synthetic seed: illustrative, not statistically powered. Scale to ≥50
  real bugs before claiming generality; stratify by category.
- **Provider status, 2026-09-28 (blocking live runs):** OpenAI key valid but
  `credit_balance_exhausted`; DeepSeek key valid but `Insufficient Balance`;
  Anthropic key rejected for low credit balance; Gemini key lists models but
  `generateContent` 404s on every model (key's project lacks generate access,
  and 1.5/2.0 IDs are retired — fallback chain in `ask_gemini` now includes
  `gemini-2.5-flash`/`pro`). Total live-LLM spend to date: $0.00. Any ONE
  provider topped up with a few dollars unblocks Steps 6/9/11/13.
- App staleness found while wiring runs: `settings.deepseek_model` default
  (`deepseek-chat`) no longer exists on the API (only `deepseek-flash`,
  `deepseek-v4-pro` listed) — experimental path, left as-is, flagged here.
- **Data leakage:** if the eval LLM was trained on the same open-source repos
  as the dataset, recall is inflated. Holdout set ready at
  `research/dataset/holdout.json` (6 self-written, never-published bugs in the
  Step-2/5 schema); compare AI-only recall seed-vs-holdout once keys work.
  Disclose training cutoff per model.
- Static arm is rules-light; stronger static baselines (Semgrep, CodeQL)
  would be fairer comparators.

## 7. Future work

1. Expand to BugsInPy subset (≥50) with buggy/fix commit pairs.
2. Real-LLM runs across ≥2 providers; accuracy–cost–latency frontier.
3. Ordering ablation with static-context prompting.
4. Align complexity counting with radon or justify divergence semantically.
5. Holdout/leakage audit per §6.

## 8. Reproducibility

- `python research/run_static_vs_ai.py [--order static-first|ai-first]`
- `python research/ablation_ordering.py`
- `python research/benchmark_complexity.py server/services`
- `python research/cost_latency.py [--limit N] [--providers openai,gemini]`
- `pytest server/tests/test_sandbox_escape.py server/tests/test_analyzer_properties.py`
- Every script prints a `_meta` line (UTC timestamp, git SHA, Python
  version, AI version) via `research/run_meta.py` — paste it with any table.
- AI stand-ins are versioned (`heuristic-standin-v2`); changing keywords =
  bump the version, never silent edits.
- Dataset: `research/dataset/seed.json` (commit it; link full dataset when scaled).
- Real-AI runs: record model id, version string, temperature, date, and raw
  outputs alongside the results table.
