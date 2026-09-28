# DESIGN.md — AI Code Optimizer redesign ("Midnight Laboratory")

> Status: PROPOSAL — review before any code changes. Generated with the
> `ui-ux-pro-max` skill (`--design-system`, variance 7 / motion 8 / density 5;
> style/colors/typography/motion adopted, landing pattern overridden — see §10).
> Implementation order and gap list live in `APPFLOW.md`.

## 0. Why redesign

Current UI ("Cyber-premium obsidian") reads AI-generated: teal-on-black
everywhere, emoji-as-icons on feature cards, marketing-superlative copy
("Hyper-Speed Execution", "Neural Engine v4 Active"), six competing CTAs on
the landing hero path, and 16 finished components (team, review, rules,
visualizer, command palette, onboarding) that are built but never mounted —
so the product looks bigger in code than it feels in hand.

## 1. Concept

**Midnight Laboratory** — a precision instrument for code, not a marketing
site that happens to contain an editor. Dark-first OLED lab bench (deep
slate, near-zero light emission), one confident accent (run-green: the color
of passing tests), amber reserved for warnings, violet reserved for AI. Light
mode is a supported second citizen ("Day Lab"), never an afterthought.
Principles: (1) content over chrome — the code is the hero; (2) one accent,
one job; (3) motion explains state changes, never decorates; (4) every number
earns its pixels (proof badges, not adjectives).

## 2. Color system

Dark-first. Light values in parentheses. All text pairs ≥ 4.5:1.

| Token | Dark | Light | Job |
|---|---|---|---|
| `--bg` | `#0B0F19` | `#F6F8FB` | app background |
| `--bg-deep` | `#070B13` | `#EAF0F6` | hero/editor wells |
| `--surface` | `#131A2A` | `#FFFFFF` | cards, panels |
| `--surface-2` | `#1B2336` | `#EFF4FA` | raised / hover |
| `--border` | `#2A3550` (1px) | `#DCE5F0` | hairlines, never pure black/white |
| `--fg` | `#F1F5F9` | `#0F172A` | primary text |
| `--muted` | `#9AA7BD` | `#4B5B74` | secondary text (both ≥4.5:1) |
| `--accent` (run-green) | `#34D399` | `#059669` | primary CTA, success, active states |
| `--accent-ink` | `#052E22` | `#FFFFFF` | text on accent |
| `--warn` | `#FBBF24` | `#B45309` | warnings, quotas, timeouts |
| `--danger` | `#F87171` | `#DC2626` | destructive, errors |
| `--ai` (violet) | `#A78BFA` | `#7C3AED` | AI-originated content ONLY (stream badges, AI diffs) |
| `--info` | `#7DD3FC` | `#0284C9` | links, neutral highlights |

Rules: accent is the only green on screen; AI violet never touches CTAs or
success states; amber never used decoratively; no gradients on text except the
single hero display line; glow = `0 0 24px` max, reserved for the primary CTA
and live-stream indicator.

## 3. Typography

- **Display:** IBM Plex Sans 600/700, tracking `-0.02em` — headlines, hero,
  stat numerals. (Skill-recommended for developer tools.)
- **Body/UI:** IBM Plex Sans 400/500, base 16px, line-height 1.5.
- **Code:** JetBrains Mono 400/500/600 — editor, diffs, tokens, hashes.
- Fallback stack: `Inter, system-ui, sans-serif` if Plex fails to load.
- Scale (px): 12 caption / 14 body-sm / 16 body / 20 h4 / 24 h3 / 32 h2 / 48–72
  hero (clamped). Body never below 12px. Tabular numerals for all metrics.

## 4. Logo

New mark: **hexagonal bolt in a rounded square** — the bolt = execution speed,
the hexagon = structured analysis. Construction: 64px grid, 14px radius,
2.5px run-green stroke bolt on `--bg-deep`, hairline green ring. Variants:
`logo.svg` (color on dark), `logo-mono.svg` (single-color for light/footer),
`logo-mark.svg` (bolt only, avatars/favicons). Replaces: header bolt (keep
placement), favicon set, OG image, manifest icons. Old teal bolt retired with
the old palette.

## 5. Iconography

Lucide only, 1.75px stroke, 20px default (16px dense). Emoji-as-icons removed
everywhere (current offenders: the six `featurePages` cards on the landing).
File-type and severity icons get fixed hues: security = amber, error = red,
quality = green, AI = violet — consistent across panels, toasts, and tables.

## 6. Shape, spacing, depth

- Radius: 10px cards, 14px modals, 8px inputs, full pills for badges only.
- Spacing scale 4px; page gutter 24px (16px mobile); content max 1200px
  (editor workspace full-bleed).
- Depth: borders carry structure, not shadows. One shadow token for floating
  layers (modals, menus, toasts): `0 16px 48px rgba(2,6,17,.5)`. No glassmorphism
  on content panels (frosted surfaces stay for overlays only) — readability win.

## 7. Motion (butter-flow spec)

Tokens: `--dur-instant 120ms / --dur-fast 200ms / --dur-base 320ms /
--dur-slow 520ms`; easing `cubic-bezier(.22,1,.36,1)` (easeOutExpo-ish) for
entrances, `ease-in-out` for loops. Rules:
- Route changes: 240ms fade+8px rise on page container (no full-page wipes).
- Editor → results: shared-element slide of the "Run" button into the proof
  badge; streaming text renders progressively, code block flips in on `done`.
- Micro: buttons scale 1.0→0.97 on press (120ms); hovers 150–200ms; skeletons
  (never spinners) for panel loads; progress steps animate width, not opacity.
- `prefers-reduced-motion`: all durations → 0, final states render instantly.
- Forbidden: animating width/height (use transform), one duration for
  everything, hover-only affordances, layout-shifting badges (reserve space).

## 8. Components (single source of truth)

- **Button:** primary (accent fill, ink text, 44px min-height), secondary
  (1px border, surface bg), ghost (text only), danger. Loading = disabled +
  inline 16px spinner + preserved label ("Optimizing…", never "Loading").
- **Input:** label above (always visible, never placeholder-only), 12px radius
  8px, focus ring 2px accent at 40% + `aria-invalid` + inline error below in
  danger color. Keep existing validation/honeypot behavior.
- **Card/panel:** surface bg, 1px border, 10px radius, header row (title left,
  actions right), skeleton state defined per panel.
- **Nav:** top bar (logo, Product links, Workspace, user) + mobile hamburger
  (already added); footer (already added) restyled to new tokens.
- **Editor shell:** full-height Monaco, language + model pickers in a slim
  toolbar, sticky Run bar on mobile, line-number gutter never overlapped.
- **Diff viewer:** split on ≥1024px, unified below; added = green wash,
  removed = red wash, AI-touched hunks get a violet left tick + "AI" tag.
- **Proof panel:** the signature component — big status badge (Outputs match /
  differ), metric trio (time, memory, correctness), expandable raw outputs.
- **Progress:** 4-step stepper (Analyze → Optimize → Execute → Verify), never
  more; failures land on the failed step with retry inline.
- **Banner/consent/toast:** keep current cookie-consent behavior, restyle to
  tokens; toasts bottom-right, auto-dismiss 5s, action slot for Undo/Retry.
- **Empty states:** every list (sessions, projects, teams, findings) gets an
  illustrated empty state with exactly one CTA — no dead blank panels.

## 9. Page-by-page redesign notes

- **Landing `/`:** single hero (display line + one proof metric + ONE primary
  CTA "Start optimizing — free"), live mini-demo (type → fake optimize inline,
  no auth), proof strip (real numbers from RESEARCH.md, no adjectives),
  feature grid (6 SVG-icon cards → the six revived feature areas), footer.
  Kill: ambient orb overload (keep one), emoji icons, superlative copy.
- **Auth `/auth`, forgot, reset, profile, settings:** keep flows, reskin to
  tokens; settings gains theme (Midnight/Day), motion-reduce toggle honoring
  OS setting, and API-key panel already there.
- **Workspace `/workspace` + Optimizer `/optimize`:** merge visually into one
  "Lab bench" shell (tabs, not two pages that feel different); command palette
  (`Cmd+K`) global — mounts the dead `CommandPalette`.
- **Analysis `/analysis`, bug `/bug-detection`, docs `/documentation`,
  refactor `/refactoring`, debug `/debugging`:** unify on `FeaturePageLayout`
  v2: input → findings table (severity hues §5) → export. Mount dead
  `FindingsPanel`/`ViolationsPanel` here.
- **Review (NEW route `/review`):** mount dead `PipelineView` — stage stepper,
  ranked findings, approve/dismiss per finding.
- **Rules (NEW route `/rules`):** mount dead `RulesManager` — pack toggles,
  custom YAML editor with validation, per-rule test button.
- **Team (NEW route `/team`):** mount dead `TeamDashboard` + `ShareModal` +
  `CollaborativeEditor` (already socket-ready per `core/websocket.py`).
- **Visualize (NEW route `/visualize`):** mount dead `TraceRunner` +
  `AlgorithmVisualizer` + `ComparisonVisualizer`; bullet-chart KPI grids per
  skill chart guidance (labeled ranges, text-first, not color-only).
- **GitHub (workspace tab, not a route):** mount dead `GitHubRepoModal` +
  `GitHubPRPanel`.
- **Reports (inline):** mount dead `ExportOptions` in report panels (PDF/JSON).
- **Sessions:** empty `features/sessions/` becomes the session-history drawer
  (backend `/opt-sessions` already exists).
- **Onboarding:** first-run tour mounts dead `OnboardingTour` (3 steps:
  paste code → run → read proof), skippable, never reshown.
- **Legal/404:** keep, reskin.

## 10. Method notes (skill compliance)

- Generator recommended: Dark OLED style, slate+green palette, Plex/Mono type,
  minimal glow, expo route transitions — all adopted.
- Generator suggested an FAQ/docs landing pattern — REJECTED with reason: the
  product is an interactive tool, not a support site; conversion pattern is
  hero + live demo + proof. Recorded here so the deviation is deliberate.
- Chart guidance adopted: bullet grids for KPI multiples, labeled ranges +
  text fallbacks, keyboard-reachable details.
- Pre-delivery checklist enforced at implementation: no emoji icons,
  pointer cursors on clickables, 150–300ms hovers, 4.5:1 text, visible focus,
  reduced-motion, 375/768/1024/1440px passes.

## 11. Open decisions (finalize with owner before code)

1. Product name lock: keep "AI Code Optimizer"?
2. Dark-first with Day Lab secondary — or dark-only?
3. Merge `/workspace` + `/optimize` into one Lab shell (recommended) or keep separate?
4. Which dead areas ship in v1 redesign: review + rules + visualize + team (recommended) vs. phased?
5. Voice/tone: keep "lab instrument" diction (precise, terse) in all copy?
