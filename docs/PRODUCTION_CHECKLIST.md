# Production readiness — evidence log

Twenty items, each with where it lives and how it's verified.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Privacy policy | Done | `client/src/features/legal/PrivacyPage.jsx` → `/privacy`; linked in footer + consent banner |
| 2 | Terms & conditions | Done | `client/src/features/legal/TermsPage.jsx` → `/terms`; linked in footer |
| 3 | Remove frontend secrets | Done | Audit: only API base URLs in bundle (no keys/tokens); `.env.example` documents public-only vars + NEVER-secrets rule |
| 4 | Enforce HTTPS | Done | Backend: http→301 + HSTS (`max-age=31536000; includeSubDomains; preload`) in prod only (`server/main.py`); frontend: `upgrade-insecure-requests` CSP; cookies already `Secure` in prod. Tests: `test_https_enforcement.py` (4) |
| 5 | Cookie consent banner | Done | `CookieConsent.jsx` (accept/decline, persists, re-openable from footer); analytics loads only after accept |
| 6 | Meta titles/descriptions | Done | Per-route titles + descriptions + canonical via `lib/routeMeta.js` (`RouteMeta` in App); unknown paths get noindex 404 meta |
| 7 | Social preview image | Done | `public/og-image.png` (1200×630, 53KB) + OG/Twitter tags in `index.html`; generator: `client/scripts/generate-og-image.py` |
| 8 | Favicon | Done | `public/favicon.svg` + generated `icon-192/512.png`, `apple-touch-icon.png` (`generate-icons.py`); manifest + sw precache updated |
| 9 | Sitemap and robots.txt | Done | `public/robots.txt` + `public/sitemap.xml` (/, /auth, /privacy, /terms) |
| 10 | Image alt text | Done | All `<img>` audited: descriptive avatars (`${name}'s profile photo`); decorative SVGs `aria-hidden` |
| 11 | Image compression | Done | No local raster images except generated PNGs (og 53KB optimized, icons small); remote avatars are SVGs; dead `vite.svg` refs replaced |
| 12 | Page load speed check | Done | `npm run build`: initial ≈127KB gzip (321KB shared vendor + 115KB CSS + 14KB landing); routes lazy-split; heavy charts isolated in lazy chunks |
| 13 | Color contrast fixes | Done | Light-mode `text-teal-600` (≈3.5:1, fails AA) → `teal-700` (≈5:1) on auth links; muted grays verified ≥4.5:1 both themes |
| 14 | Mobile responsiveness | Done | Viewport meta added; new hamburger nav (header links were desktop-only); hero CTA stacks (`flex-col sm:flex-row`); footer grids collapse |
| 15 | Custom 404 page | Done | `NotFoundPage.jsx` on `*` route (replaces silent redirect) + noindex |
| 16 | Broken link fixes | Done | Audited every `to=`/`navigate()` target against routes: all resolve; `*` no longer masks bad URLs |
| 17 | Form validation | Done | `lib/validation.js` (email/password/name/required) with inline errors + aria on auth, forgot, reset forms; 5 tests |
| 18 | Spam protection | Done | `lib/spamGuard.js`: honeypot + 2.5s time-trap + 5s submit throttle on all auth forms; server rate limits authoritative; 3 tests |
| 19 | Analytics setup | Done | `lib/analytics.js`: Plausible-compatible, consent-gated, DNT-honored, off-when-unconfigured, never throws; pageviews auto-tracked; 5 tests. Set `VITE_ANALYTICS_ENDPOINT` + `VITE_ANALYTICS_DOMAIN` to enable |
| 20 | Single clear CTA | Done | Hero: one primary ("Initialize Optimizer"); secondary demoted to quiet text link |

Verify: `cd client && npm test -- --run && npm run build`; `cd server && pytest tests/ -q`.
