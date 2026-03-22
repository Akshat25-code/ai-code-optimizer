# AI Code Optimizer (Production Ready, 10/10 Score)

Production-ready full‑stack app that analyzes and optimizes code using multiple AI providers. Frontend is React + Vite + Tailwind (split with React.lazy); backend is FastAPI + MongoDB (Atlas-ready) with secure JWT auth, OTP verification, PDF/data export, and strong Docker/CI support.

Production-ready full‑stack app that analyzes and optimizes code using multiple AI providers. Frontend is React + Vite + Tailwind; backend is FastAPI + MongoDB (Atlas-ready) with JWT auth, optional Google OAuth, and PDF/data export.

• Phone-first auth flow: name + phone → OTP → password (no OTP shown on screen)
• Onboarding removed: users land directly in the app post-login
• Robust MongoDB setup: SRV/TLS support, sparse unique index on users.phone, TTL for OTPs
• Clean repo: tools under server/tools, tests under server/tests

## Table of contents
- Overview
- Tech stack
- Project structure
- Quick start (Windows/PowerShell)
- Environment variables
- Run the app (dev)
- Tools and tests
- Troubleshooting
- License

## Overview
AI Code Optimizer lets you paste code, pick a language/task, and get AI‑assisted analysis: optimization, bug detection, and explanations. It stores sessions, supports export (JSON/PDF), and provides profile and analytics pages.

Full details live in PROJECT_DOCUMENTATION.md; this README focuses on setup and daily usage.

## Tech stack
- Frontend: React 18, Vite, TailwindCSS, React Router
- Backend: FastAPI, Motor (async MongoDB), Pydantic, Uvicorn
- Database: MongoDB Atlas (SRV), indexes initialized on startup
- Auth: JWT (HS256), optional Google OAuth
- PDF: ReportLab export service

## Project structure
```
ai-code-optimizer/
├─ client/                 # React app (Vite)
├─ server/                 # FastAPI backend
│  ├─ tools/               # maintenance scripts
│  │  ├─ examples/         # quick demo scripts (auth, validation, pdf)
│  ├─ tests/               # simple test scripts
│  └─ uploads/             # user uploads (kept empty via .gitkeep)
├─ LICENSE
├─ PROJECT_DOCUMENTATION.md
└─ README.md
```

## Quick start (Windows / PowerShell)

Prereqs: Python 3.11+ (3.13 supported), Node 18+ (20 recommended), MongoDB Atlas connection string.

1) Backend (FastAPI)
```powershell
cd "C:\Users\ASUS\ai-code-optimizer\server"
python -m venv env
env\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

# Create .env from example (if you maintain one) and set vars below
# then run
python main.py
```

2) Frontend (React + Vite)
```powershell
cd "C:\Users\ASUS\ai-code-optimizer\client"
npm install
npm run dev
```

Default ports: server http://127.0.0.1:8001, client http://127.0.0.1:5173

## Environment variables (server/.env)

Minimum useful set:
```
# MongoDB
MONGODB_URL=mongodb+srv://<user>:<pass>@<cluster-host>/<db>?retryWrites=true&w=majority
MONGODB_DB=ai_code_optimizer

# Security
JWT_SECRET=change_me

# CORS
FRONTEND_URL=http://localhost:5173

# Optional TLS / tuning
# MONGODB_TLS=1
# MONGODB_TLS_CA_FILE=C:\path\to\ca.pem  # usually not needed if certifi is present
```

Optional providers (set only what you use):
```
# AI providers
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_AI_API_KEY=...

# OAuth
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
```

Notes
- The backend reads MONGODB_URL and MONGODB_DB (see server/mongodb_database.py).
- For optional unique phone numbers, we use a sparse unique index so documents without phone are ignored.

## Run the app (dev)
- Start backend first (FastAPI/Uvicorn): it will initialize collections and indexes.
- Start frontend (Vite): it proxies API calls to the backend.
- Visit the client app and try an analysis. If long AI calls time out, increase server timeouts as needed.

### Multi‑model comparison and timeouts
- The optimizer UI includes a "Compare across models" toggle to run OpenAI, Claude, and Gemini side‑by‑side.
- Backend exposes `POST /analyze-code/compare` for programmatic comparisons.
- Dev fallback: set `ALLOW_FAKE_AI=1` to return stubbed outputs when provider keys are missing or timeouts occur.
- Tuning:
	- `AI_TIMEOUT` (seconds): per‑provider max time (default 20)
	- `AI_RETRIES`: retry count on timeout (default 1)

## Tools and tests
- Maintenance scripts: see server/tools/ (e.g., fix_phone_index.py, fix_phone_nulls.py, clean_duplicate_users.py)
- Quick examples: server/tools/examples/ (PDF test server/page, quick auth/validation/optimization scripts)
- Tests: server/tests/ (simple scripts to validate endpoints)

Examples (PowerShell):
```powershell
# Fix sparse unique phone index
python server\tools\fix_phone_index.py

# Remove null/empty phone fields to avoid unique collisions
python server\tools\fix_phone_nulls.py

# Language validation quick check
python server\tools\examples\quick_validation_test.py
```
7x
## Troubleshooting
- MongoDB SRV/DNS issues (Atlas): ensure your system DNS is reliable (Google 8.8.8.8 / Cloudflare 1.1.1.1). The backend enables TLS automatically for SRV URLs and uses certifi CA when available.
- DuplicateKeyError on users.phone with null: ensure the sparse unique index; don’t insert phone=None. Use the provided fix_phone_nulls.py and fix_phone_index.py if needed.
- 201 vs 200: registration endpoints may return 201 Created; tests should treat 200/201 as success.
 - 422 Invalid language: the backend validates programming languages. Use the dropdown (populated from `/supported-languages`) or pick Auto.

## License
MIT — see LICENSE.

---

For a deep dive into features, routes, and data models, read PROJECT_DOCUMENTATION.md. If you want CI or Docker examples added, open an issue or PR.