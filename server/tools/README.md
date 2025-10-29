# Tools and Examples

This folder contains maintenance scripts and example utilities for the backend.

- clean_duplicate_users.py — one-off cleanup to remove/merge users with null phone fields
- fix_phone_index.py — drops and recreates the sparse, unique `phone` index on `users`
- fix_phone_nulls.py — unsets `phone` for documents where it is `null` or empty
- examples/ — self-contained demo and quick-check scripts:
  - pdf_test_server.py, pdf_export_test.html — local PDF export sanity checks
  - quick_auth_test.py — quick register/login smoke test
  - quick_optimization_test.py — sample /analyze-code interactions
  - quick_validation_test.py — language validation quick checks
  - simple_test.py — minimal health and analyze-code probe

Notes
- These are dev/operator tools; they’re not imported by the app at runtime.
- If you previously ran scripts from the server/ root, use these organized copies instead.