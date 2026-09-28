# APPFLOW.md — complete application flow (start to end)

> Companion to `DESIGN.md`. Status per node: DONE / PARTIAL / MISSING.
> Gap IDs (G-series) collect in §16 — that list is the "complete it" backlog
> for after design finalization. No code changes in this phase.

## Actors & entry points

- **Visitor** (logged out): `/` landing, `/auth`, `/forgot-password`,
  `/reset-password`, `/privacy`, `/terms`, anything else → 404.
- **User** (logged in, httpOnly cookie): everything above + `/workspace`,
  `/optimize`, `/optimization`, `/analysis`, `/bug-detection`,
  `/documentation`, `/refactoring`, `/debugging`, `/profile`, `/settings`
  (+ NEW: `/review`, `/rules`, `/team`, `/visualize` after redesign).
- Backend API surface: `server/api/*` (auth, analysis, execution, streaming,
  review, rules, session, github, intelligence, project, profile, team,
  visualization, apikeys, oauth, analytics). SSE streaming for long AI jobs.

## F1 — First run (visitor → account) — DONE

1. Land `/` → hero, single CTA "Start optimizing — free" → `/optimize`
   (or "Sign in" in header when logged out).
2. `/optimize` as guest: allowed to view, run prompts sign-in on execute.
3. `/auth`: login / register tabs, social (Google/GitHub), validation +
   honeypot + throttle, error `role=alert`.
4. Forgot/reset via emailed token link (`/reset-password?token=`).
5. Success → return to origin (`location.state.from`) or `/`.

## F2 — Onboarding tour (first login) — MISSING (G1)

1. After first successful login, 3-step overlay: ① paste code ② press Run
   ③ read the proof badge. Skippable, "don't show again" persisted.
2. Component exists but unmounted: `features/onboarding/OnboardingTour.jsx`.

## F3 — Core optimize loop (flagship) — DONE

1. `/workspace` or `/optimize`: pick language → paste/upload code →
   choose provider (BYOK) / focus.
2. Optional live SSE stream of the AI answer (progress steps + partial code).
3. Submit → `/optimize-code-enhanced` or `/evaluate-optimization` →
   AST complexity before/after → sandbox runs original + optimized →
   output comparison → proof panel (match badge, time/memory deltas).
4. Save session (`/opt-sessions`, secrets redacted at rest) → session drawer.
5. Failure branches: provider down → fake-AI notice in dev / clean 4xx-5xx
   in prod; timeout → killed + reported; quota → 429 + reset message.

## F4 — Analysis loop (inspect, bugs, docs, refactor, debug) — DONE (UI thin in places)

1. `/analysis`: `/inspect-code` → quality score, complexity, rule violations,
   compliance → snapshot stored.
2. `/bug-detection`: `bug_scanner` findings table (severity hues).
3. `/documentation`: generated specs. `/refactoring`, `/debugging`: focused AI
   tasks with same proof pattern as F3.
4. PARTIAL: findings render ad-hoc per page; shared `FindingsPanel` /
   `ViolationsPanel` exist but unmounted (G2).

## F5 — Review pipeline loop — MISSING UI (G3, backend DONE)

Backend `/review/pipeline` runs 5 stages (static, security, performance, AI,
aggregation) with WS progress. No route mounts `PipelineView` /
`FindingsPanel`. Flow: submit code → stage stepper → ranked findings →
approve/dismiss per finding → export to report.

## F6 — Rules loop — MISSING UI (G4, backend DONE)

Backend `/rules/evaluate` + YAML packs. No route mounts `RulesManager`
(pack toggles, custom-rule editor, per-rule test) or `ViolationsPanel`.

## F7 — Team loop — MISSING UI (G5, backend DONE)

Backend team routes + `CollaborationManager` rooms/OT (`/ws/session/{id}`).
No route mounts `TeamDashboard` (members, roles), `ShareModal` (token links),
or `CollaborativeEditor` (live co-editing with presence + cursors).

## F8 — GitHub loop — MISSING UI (G6, backend DONE)

Backend GitHub service (repos, patch, PR). No UI mounts `GitHubRepoModal`
(import/scan repo) or `GitHubPRPanel` (patch review → open PR).

## F9 — Visualize loop — MISSING UI (G7, backend DONE)

Backend trace + profile endpoints. No route mounts `TraceRunner`
(step-through execution), `AlgorithmVisualizer`, or `ComparisonVisualizer`
(side-by-side metrics). DESIGN.md §9 specifies bullet-chart KPI grids.

## F10 — Reports & export — MISSING UI (G8, backend DONE)

Backend PDF/session report services. No UI mounts `ExportOptions`
(PDF/JSON/Markdown download, share link) in report panels.

## F11 — Session history — MISSING UI (G9, backend DONE)

Backend `/opt-sessions` CRUD exists; `features/sessions/` directory is EMPTY.
Flow: drawer listing past sessions (search, re-open, delete, re-run).

## F12 — Settings & API keys — DONE

`/settings`: theme, API-key panel (BYOK providers), motion-reduce toggle
(added in redesign), danger zone (account delete). Keys stored server-side.

## F13 — Profile — DONE

`/profile`: identity, avatar, phone verify, stats. Links to settings.

## F14 — Legal, consent, support — DONE

`/privacy`, `/terms`, footer links, consent banner (accept/decline/re-open),
DNT honored. Contact: support@aicodeoptimizerpromax.com.

## F15 — Global systems — PARTIAL (G10)

- 404 page, error boundary, rate-limit/daily-quota messaging: DONE.
- Command palette (`Cmd+K`) + keyboard shortcuts: MISSING UI —
  `CommandPalette.jsx` + `useKeyboardShortcuts.js` unmounted (G10).
- Offline/PWA shell: installed (sw.js) but no offline queue UX for mutations.

## 16. Gap register (the complete-it backlog)

| ID | Gap | Backend | Frontend fix (post-finalization) |
|---|---|---|---|
| G1 | Onboarding tour unmounted | n/a | Mount `OnboardingTour` on first login; persist skip |
| G2 | Findings/Violations panels unmounted | DONE | Mount in F4 pages via shared results table |
| G3 | Review pipeline has no UI | DONE (`/review/pipeline`) | NEW `/review` route + `PipelineView` |
| G4 | Rules engine has no UI | DONE (`/rules/*`) | NEW `/rules` route + `RulesManager` |
| G5 | Team collab has no UI | DONE (team routes + WS) | NEW `/team` route + dashboard/share/editor |
| G6 | GitHub flow has no UI | DONE (github service) | Workspace tab + `GitHubRepoModal`/`GitHubPRPanel` |
| G7 | Visualizer has no UI | DONE (trace/profile) | NEW `/visualize` route + 3 components |
| G8 | Report export has no UI | DONE (report services) | Mount `ExportOptions` in report panels |
| G9 | Session history has no UI (empty dir) | DONE (`/opt-sessions`) | Session drawer component (new file) |
| G10 | Command palette + shortcuts unmounted | n/a | Global `Cmd+K` mount + shortcut map |
| G11 | Phone login behind flag | `ENABLE_PHONE_LOGIN=0` | Product decision: enable (needs Twilio) or remove UI traces |
| G12 | Facebook/LinkedIn OAuth 404 | Disabled in code | Product decision: implement or drop from provider list |
| G13 | Local repo import disabled in prod | Intentional | Keep; surface clearer UX copy |
| G14 | Emoji-as-icons on landing | n/a | Replace 6 `featurePages` icons with Lucide (redesign) |
| G15 | `/workspace` vs `/optimize` overlap | n/a | Merge into one Lab shell (DESIGN.md §11.3) |

## 17. Flow-state matrix (happy / loading / empty / error per flow)

Every flow above must define: initial, loading (skeleton), empty (one CTA),
success, error-with-retry, and offline behavior. Current app covers
happy/loading/error on F1/F3/F4/F12–F14; empty states and the F5–F11 flows are
specified in DESIGN.md §8 and built post-finalization.
