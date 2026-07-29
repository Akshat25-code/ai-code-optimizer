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
- Prefer Docker sandboxing for untrusted code execution.
- Use strong `JWT_SECRET_KEY` values and production-grade MongoDB/Redis credentials.
- Review CORS origins before deployment.

## Current Quality Gates

- Backend test suite passes.
- Frontend production build passes.
- Frontend lint runs successfully, with warnings remaining for unused imports/props in some UI modules.

## License

MIT — see `LICENSE`.
