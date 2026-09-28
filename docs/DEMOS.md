# Flagship demos (4)

Each demo is a runnable script (`scripts/demo_*.ps1`, server on `:8001`) plus
a GIF storyboard below. Scripts are the source of truth — record the GIFs by
running them (no valid provider keys needed for 1–4 as written).

## 1. Instant static analysis — `demo_1_inspect.ps1`
`POST /inspect-code` on recursive `fib`: complexity report, rule violations,
compliance score. Storyboard: paste code → ~1 s → grade/score panel +
top violations. Shows "real analysis, zero AI".

## 2. Verified optimization — `demo_2_verify.ps1`
`POST /run-code/compare`: original vs optimized execute in sandbox, outputs
compared, speedup/memory deltas. Storyboard: side-by-side run → "Outputs
match" badge + metrics. Shows "proof, not prose".

## 3. Secret safety net — `demo_3_secrets.ps1`
`POST /intelligence/scan-secrets` then `/redact-secrets` on a pasted fake
key. Storyboard: key flagged Critical → one click → `[REDACTED_SECRET]`.
Shows the at-rest protection story (`REDACT_SECRETS_AT_REST`).

## 4. Review pipeline — `demo_4_review.ps1`
`POST /review/pipeline` (`skip_ai=true`): dead-code (Low) + infinite-loop
(High) findings, ranked High-first by the aggregation stage. Storyboard:
submit → staged progress → ranked list. Shows the repaired pipeline end to end.

## Recording notes
- 800×500 capture, <15 s each, captions on key frames.
- Use `ALLOW_FAKE_AI=1` + `SKIP_MONGO_INIT=1` for a deterministic backend.
- Name files `docs/demos/1-inspect.gif` … `4-review.gif` and embed here.
