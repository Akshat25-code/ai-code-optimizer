# Migrations (one-time, dated)

One-time data-hygiene scripts, superseded by schema-level fixes in
`core/database.py` (sparse unique `users.phone` index) and write-time
validation (`api/auth_routes.normalize_phone` + uniqueness check).

- `2024_01_phone_sparse_unique_index.py` — drops legacy `phone_1` index, creates sparse unique index.
- `2024_02_phone_unset_nulls.py` — unsets `phone` where null/empty (sparse index ignores missing fields, not nulls).
- `2024_03_dedupe_users_null_phone.py` — removes/merges duplicate users with null phone.

Do not run on a schedule. New deployments get the correct index via `init_mongodb()`.
