# Architecture — AI Code Optimizer

## Request flow

```
client (React+Vite, src/)
  │  REST / SSE  (credentials: include, JWT cookie `aco_access` or Bearer)
  ▼
server/main.py  (FastAPI, lifespan, CORS, /uploads, /ws/session/*)
  │  include_router(api/*)  ← single routing convention (canonical)
  │  routers/analyzer.py    ← DEPRECATED shim, do not extend
  ▼
api/*_routes.py  (auth, analysis, execution, streaming, review, …)
  │  deps: core/rate_limit.rate_limit_ai (user→IP), enforce_daily_quota
  │        api/auth_routes.get_current_user / get_optional_user
  ▼
services/
  analysis/  ast_analyzer, complexity_engine, rules_engine,
             bug_scanner, code_intelligence, review_pipeline, analytics_engine
  ai/        provider_service (OpenAI/Anthropic/Gemini + experimental),
             cache_service, streaming_service
  execution/ sandbox_runner → language_runners → docker_runner
             verification_engine, output_comparator, performance_profiler
  reports/   pdf_report_service, session_report_service
  github_service, profile_service
  email_service (Resend/SMTP), sms_service (Twilio Verify/messaging)
  ▼
core/  config (strict secrets in prod), database (Motor/Mongo),
       security (JWT), encryption (Fernet at rest), rate_limit, websocket
models/  request/response schemas, database (OAuth tokens encrypted via
          security/crypto.encrypt_str), project/analysis models
```

## Why split this way

- `api/` = HTTP boundary only (validation, auth, rate limits, status codes).
  No analysis or execution logic lives here.
- `services/analysis/` = pure static analysis (AST, complexity, rules).
  No network, no AI calls — fully unit/property-testable.
- `services/ai/` = provider boundary (keys, retries, fallback, cache).
  `ALLOW_FAKE_AI=1` exists for tests/dev only, never prod.
- `services/execution/` = untrusted-code boundary. Real isolation is
  Docker (`docker_runner`: no-net, 128 MB + no swap, 0.5 CPU, pids-limit 64,
  cap-drop ALL, no-new-privileges, read-only rootfs + 16 MB noexec tmpfs,
  user nobody). `language_runners` subprocess fallback + restricted-builtins
  wrapper is defense-in-depth for dev/test only and is **refused in
  production** (`USE_DOCKER_SANDBOX=1` mandatory — enforced at boot in
  `main.lifespan` and per-execution in every `run_*`).
- `core/` = cross-cutting (config, DB, auth, crypto, limits).
- `models/` = schemas + persistence helpers (OAuth tokens encrypted at rest).

## Key invariants

1. Production never executes untrusted code outside Docker (fail-closed).
2. Secrets at rest encrypted (Fernet/HKDF from `JWT_SECRET_KEY`); boot
   refuses known-default/short secrets in prod.
3. Rate limits key on authenticated identity first (user/API-key), IP second.
4. Static analysis never depends on AI availability (degrades to local-only).
5. Migrations are one-time + dated; schema truth lives in `init_mongodb()`.
