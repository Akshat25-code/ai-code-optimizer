# AI Code Optimizer Pro Max

AI Code Optimizer Pro Max is a full-stack code intelligence platform that combines AI assistance with deterministic local analysis, execution verification, repository scanning, custom rules, and proof-based reports.

It is designed to prove more than “an AI API returned some text”: the backend performs real code analysis, security checks, complexity scoring, sandboxed execution, and report generation around the AI layer.

## Highlights

- **Local code intelligence**: AST-based static analysis, quality scoring, bug detection, secret scanning, and complexity metrics.
- **Verified optimization workflow**: Compare original and optimized code with runtime output checks, performance metrics, and proof panels.
- **Repository analysis**: Scan multi-file projects, build file trees, detect dependencies, identify hotspots, and estimate project health.
- **Custom rules engine**: Evaluate code against YAML rule packs for security, style, performance, and clean-code policies.
- **AI provider layer**: Supports OpenAI, Anthropic, Gemini, and optional experimental providers with caching and fake-AI mode for local demos.
- **Developer workspace UI**: React/Vite interface with editor, reports, GitHub integration, team tools, command palette, and PWA assets.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Monaco Editor, Framer Motion
- **Backend**: FastAPI, Python, MongoDB, Motor, Pytest
- **Analysis**: Python AST, custom rules, secret scanning, complexity heuristics
- **Execution**: Docker-aware sandbox runner with local fallback for development
- **Reports**: JSON, HTML, and PDF-oriented reporting services

## Project Structure

```text
client/
  src/
    app/                  # React app shell and routes
    components/           # Layout, editor, report, and shared UI components
    features/             # Optimization, workspace, analysis, review, rules, team
    services/             # API/auth/profile clients
    styles/               # Global styles

server/
  api/                    # FastAPI route modules
  core/                   # Config, database, auth/security, rate limits
  data/rules/             # Built-in YAML rules
  models/                 # Pydantic and database models
  services/               # AI, analysis, execution, reports, GitHub, profile logic
  tests/                  # Backend test suite
  utils/                  # Shared code helpers
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB local or Atlas connection
- Optional: Docker for stronger execution isolation

## Backend Setup

```powershell
cd server
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `server/.env`:

```env
MONGODB_URL=mongodb://localhost:27017/ai_code_optimizer
MONGODB_DB=ai_code_optimizer
JWT_SECRET_KEY=replace-with-a-long-random-secret
ALLOW_FAKE_AI=1
ENABLE_CODE_EXECUTION=0
```

Run the API:

```powershell
uvicorn main:app --reload --port 8001
```

## Frontend Setup

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

## Important Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URL` | MongoDB connection string |
| `MONGODB_DB` | MongoDB database name |
| `JWT_SECRET_KEY` | JWT signing secret; use a long random value |
| `ALLOW_FAKE_AI=1` | Enables deterministic local demo responses when provider keys are missing |
| `ENABLE_CODE_EXECUTION=1` | Enables code execution endpoints; keep off unless needed |
| `USE_DOCKER_SANDBOX=1` | Uses Docker for execution when Docker is available |
| `REDIS_URL` | Optional Redis-backed rate limit store |
| `OPENAI_API_KEY` | OpenAI provider key |
| `ANTHROPIC_API_KEY` | Anthropic provider key |
| `GEMINI_API_KEY` | Gemini provider key |
| `SKIP_MONGO_INIT=1` | Test/local flag to skip database initialization |

## Useful Commands

Backend tests:

```powershell
cd server
$env:SKIP_MONGO_INIT="1"
$env:ALLOW_FAKE_AI="1"
python -m pytest tests -q
```

Frontend lint:

```powershell
cd client
npm run lint
```

Frontend production build:

```powershell
cd client
npm run build
```

Run both app layers in development:

```powershell
npm run dev
```

## API Highlights

| Endpoint | Description |
|---|---|
| `POST /inspect-code` | Deterministic local code quality analysis |
| `POST /analysis/complexity` | AST-based complexity report |
| `POST /analyze-code` | AI-assisted analysis/optimization endpoint |
| `POST /intelligence/scan-secrets` | Secret detection |
| `POST /intelligence/scan-repo` | Repository health scan |
| `POST /intelligence/verify-optimization` | Runtime verification and proof report |
| `POST /intelligence/generate-tests` | AI-assisted test generation |
| `POST /review/pipeline` | Multi-stage review pipeline |
| `POST /rules/evaluate` | Custom rule evaluation |
| `POST /github/repos/{owner}/{repo}/apply-patch` | GitHub patch + PR workflow |

## Production Notes

- Keep `ALLOW_FAKE_AI=0` in production.
- Keep `ENABLE_CODE_EXECUTION=0` unless the execution environment is isolated and intentionally exposed.
- `USE_DOCKER_SANDBOX=1` is **mandatory** in production (`APP_ENV=production`
  refuses to boot or execute otherwise — the subprocess/restricted-builtins
  fallback is escapable and dev/test-only). Docker runs with `--read-only`,
  `no-new-privileges`, `--user nobody`, 128 MB + no swap, pids-limit 64, no network.
- Use strong `JWT_SECRET_KEY` values and production-grade MongoDB/Redis credentials.
- Review CORS origins before deployment.

## Feature maturity (honest)

Production-ready: static analysis (`/inspect-code`, `/analysis/complexity`),
rules engine (`/rules/evaluate`), secret scanning, sandboxed execution
(`/run-code`, `/run-code/compare`, `/evaluate-optimization` with Docker),
auth + API keys + rate limits, PDF/session reports.

Experimental / partial: multi-provider AI review quality (depends on keys;
fake-AI for demos), GitHub patch/PR workflow, team collaboration, streaming
SSE UX, visualization dashboards. See `ARCHITECTURE.md` for the request flow
and `RESEARCH.md` for the static-vs-LLM evaluation (synthetic seed n=60:
static arm scores P 0.56 / R 0.04 — high precision, near-zero recall, which
is the finding motivating the combined design; live-LLM cells pending a
funded provider key, est. cost ≈ $0.02).

## Flagship demos

Runnable scripts (server on `:8001`, no AI keys needed) + GIF storyboards in
`docs/DEMOS.md`: `scripts/demo_1_inspect.ps1` (static analysis),
`scripts/demo_2_verify.ps1` (sandbox-verified optimization),
`scripts/demo_3_secrets.ps1` (secret scan + redact),
`scripts/demo_4_review.ps1` (multi-stage review pipeline).

## Execution-engine chaos results (`server/tests/test_execution_chaos.py`)

| Attack | Expected | Result |
|---|---|---|
| Infinite loop (`while True: pass`, 2 s timeout) | killed, `Timeout` reported, server up | PASS |
| Memory pressure (200 MB `bytearray`) | clean in-sandbox failure, no server crash | PASS |
| Syntax error (`def broken(:`) | clean `ok: false`, no exception escapes | PASS |
| Fork/PID pressure | `--pids-limit=64` in Docker flags (structural assert) | PASS |
| Disk-fill inside container | `--read-only` rootfs + 16 MB noexec `/tmp` (structural assert) | PASS |

## Current Quality Gates

- Backend: `pytest server/tests -q` (escape + property + integration + chaos + secrets suites).
- Coverage gate in CI: `--cov-fail-under=50`; bandit (`-ll`), radon, ruff, pip-audit.
- Frontend: `npm test -- --run` (Vitest: streaming extraction, auth/editor contracts),
  `npm run lint`, `npm run build`, `npm audit`.
- Docker smoke job builds the image and verifies boot.
- Research: `python research/run_static_vs_ai.py`,
  `python research/benchmark_complexity.py server/services`.

## License

MIT — see `LICENSE`.