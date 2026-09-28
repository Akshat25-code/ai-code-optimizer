# Tools

Dev/operator utilities. Not imported at runtime.

- `test_analyze.py` — local analyze probe (dev only).
- `examples/` — remaining self-contained demos (PDF export sanity checks).
- `archive/manual_checks/*.manual` — retired ad-hoc probes (see archive README).
- `../migrations/` — one-time dated data fixes (phone index/nulls/dedup);
  root cause fixed at schema layer (`core/database.py` sparse unique index)
  + write-time validation (`api/auth_routes.normalize_phone`).
