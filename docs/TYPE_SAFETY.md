# Type safety plan

## Backend (mypy, live gate)

- Config: `server/mypy.ini` (lenient baseline; `tools/` + `migrations/` excluded
  as non-product code). CI enforces a **ratchet**: `server/mypy_baseline.txt`
  holds the known error count (35); the build fails only if the count grows.
  Fixing errors and lowering the baseline file is always welcome.
- Already paid off: the first mypy run caught two real bugs —
  `main.py` called non-existent `manager.broadcast` and never awaited
  `manager.disconnect` (session leak), and `review_pipeline.AIReviewStage`
  called `ask_ai` with a wrong signature while three local stages consumed
  dict-shaped reports as objects (all silently dead via `except: pass`).
- Next batches: implicit-`Optional` defaults (`no_implicit_optional`),
  `check_untyped_defs` for `core/` + `security/`, then per-module
  `disallow_untyped_defs` starting with `security/crypto.py`.

## Frontend (TypeScript assessment, 58 .jsx files)

Verdict: migrate gradually; do not big-bang rewrite. Recommended sequence:

1. `allowJs: true, checkJs: true` in `jsconfig.json` — free signal, no renames.
2. Rename leaf modules first: `src/services/*`, `src/hooks/*` → `.ts`
   (pure logic, few JSX dependencies), then shared UI components.
3. Enable `strict` per-directory once leaves are clean; keep `strict: false`
   at root until the end.
4. Add `tsc --noEmit` to CI as soon as step 1 is green (warn-only at first,
   same ratchet pattern as the backend).

Rationale: 58 untyped files is a real maintainability risk at this scale,
but a flag-day rewrite would stall feature work. The incremental path above
delivers value file-by-file and is enforceable in CI from day one.
