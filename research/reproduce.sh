#!/usr/bin/env bash
# Reproduce the free parts of the benchmark study (Priority 14).
# A professor runs: git clone ... && cd <repo> && bash research/reproduce.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1. dataset present?"
python research/datasets/generate_benchmark.py --check-only

echo "==> 2. free experiment: static + correctness + runtime + traditional baselines (8 programs)"
python research/experiments/run_benchmark.py --limit 8 --repeats 3 \
  --languages python,javascript

echo "==> 3. static bug-detection track (no key needed)"
python research/run_real.py --static-only

echo "==> done. LLM arms need one funded key, then rerun run_benchmark.py with --models."
