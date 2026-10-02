# Research package — LLM-assisted program optimization benchmark

Two tracks, one repo:

1. **Bug-detection track** (60 synthetic cases): `run_real.py`
   (static vs AI vs combined with static-as-context), `ablation_ordering.py`,
   `benchmark_complexity.py`, `cost_latency.py`, `dataset/seed.json` +
   `dataset/holdout.json`. See `../RESEARCH.md` for the writeup.
2. **Optimization benchmark track** (300 runnable programs, 4 languages):
   `datasets/benchmark.json` + this package.

## Layout

```
research/
├── README.md            # this file
├── config.yaml          # models, repeats, budgets (CLI overrides available)
├── reproduce.sh         # one-command free reproduction (P14)
├── requirements-research.txt
├── datasets/
│   ├── benchmark.json        # 300 programs (100 py / 75 java / 75 cpp / 50 js)
│   ├── generate_benchmark.py # seeded generator (byte-identical regeneration)
│   └── seed.json / holdout.json  # bug-detection track datasets
├── baselines/traditional.py  # non-LLM baselines: gcc -O0/-O2, java JIT/-Xint (P7)
├── experiments/run_benchmark.py  # correctness + runtime + complexity + LLM arms (P4/P5/P6/P8/P9)
├── results/              # benchmark_<ts>.json outputs (commit the tables, not the noise)
└── analysis/summarize.py # median/p95/min/max, improved/unchanged/regressed, rates (P5)
```

## Program schema (P1)

Each `benchmark.json` entry: `id`, `language`, `category`, `family`,
`inefficiency`, `original_code`, `reference_code`, `tests` (stdin/stdout
pairs captured by running the reference), `expected_behavior`,
`baseline_complexity`, `reference_complexity`, `original_runs`, `params`.

## Reproduce (free, no keys)

```bash
git clone <repo> && cd <repo>
pip install -r server/requirements.txt -r research/requirements-research.txt
bash research/reproduce.sh
```

LLM arms (P6/P9) need one funded provider key, then:
`python research/experiments/run_benchmark.py --models openai,anthropic,gemini`.
Full 300 × 3-model run ≈ 900 evaluations (P6 target). Bill guard aborts over
`max_budget` (default $5).

## Honest scope notes

- Dataset programs are **synthetic** (seeded generator), not mined history:
  perfect for correctness/speedup methodology, weaker for ecological validity
  than BugsInPy. Stated, not hidden.
- Local subprocess execution is used for dataset code (self-authored, trusted);
  production user code always goes through the Docker sandbox/worker.
- Per P10: no new providers beyond OpenAI/Anthropic/Google. Per P15: UI frozen.
