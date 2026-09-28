# Archived manual checks (NOT part of pytest suite)

These `*.manual` files are ad-hoc debugging probes from early development
(quick auth / optimization / validation smoke scripts). They are kept for
reference only — renamed to `.manual` so pytest and imports ignore them.

Canonical coverage lives in `server/tests/`:
- `test_sandbox_escape.py` — sandbox escape + production gate
- `test_analyzer_properties.py` — hypothesis property tests
- `test_pipeline_integration.py` — end-to-end user journey
- `test_execution_chaos.py` — timeout / resource-limit behavior

Do not ship new manual scripts here; add a real pytest test instead.
