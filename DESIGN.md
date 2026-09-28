# DESIGN.md — AI Code Optimizer redesign v2 ("Abyssal Gold")

> Status: PROPOSAL v2 — review before any code changes. No code touched.
> Built with the `ui-ux-pro-max` skill (3D & Hyperrealism style guidance:
> deep navy / gold / burgundy, WebGL-or-CSS-3D, parallax 3–5 layers,
> perspective 1000px; scroll-choreography presets; chart guidance) plus
> **framer-motion** (already a project dependency) using motion.dev patterns.
> Note: there is no "motionsite" skill installed — v2 motion is specified
> against framer-motion + CSS 3D. v1 ("Midnight Laboratory") is SUPERSEDED
> below (§12) — do not mix the two systems.
> Implementation order and gap list live in `APPFLOW.md` (unchanged this round).

## 0. Why v2 (and why v1 died)

v1 was a palette swap of the same site: same hero, same cards, same teal soul
with green paint. It still read AI-generated because the *structure* never
changed. v2 changes structure first: a 3D instrument you tilt and drag, one
scroll-pinned transformation story, editorial typography, and a palette with
no neon in it — deep abyss navy, minted gold, forest success, burgundy
danger. If v1 was a laboratory, v2 is a **cathedral vault full of instruments**.

3-second rule (non-negotiable): a first-time visitor must be able to say
"this optimizes my code" within 3 seconds. The mechanism is structural, not
copy: the hero IS the proof — a live buggy→fixed instrument with a match
badge sits beside the headline, so the transformation is seen before a single
word is read. The scroll-pinned section below is the deep-dive, not the
introduction.

## 1. Concept

**Abyssal Gold** — descend into depth, strike gold. The landing is a dark
ocean trench (`#04101F` abyss) where code panels float as physical instruments
at different depths (3–5 parallax layers, perspective 1000px). The hero pairs
one declarative headline ("Ship faster code, proven correct") with a LIVE
mini-instrument already mid-transformation — buggy lines washing into fixed
lines beside a match badge. No mood-setting, no manifesto paragraph: proof
first, story second. A single gold beam — the "refactor light" — sweeps once
on load, then parks as an underline beneath the proof metric.

Brand risk, stated plainly: gold-on-navy reads fintech/crypto to some
developer eyes, which can feel off-brand for a dev tool. Mitigation is
process, not hope: usability-test the hero with 3–5 real developers before
committing (§11.7), with a pre-approved fallback — forest-primary,
gold-secondary — if a majority misreads the brand. Light mode ("Shallows")
exists as a soft-grey product-preview surface for the app, but the **landing
is dark-only by design** (3D lighting needs the dark).

## 2. Color system (entirely new — zero teal)

Dark landing + app (primary surface). Light "Shallows" values in parentheses.

| Token | Dark | Light | Verified text contrast |
|---|---|---|---|
| `--abyss` | `#04101F` | `#EDF1F5` | n/a (backgrounds) |
| `--trench` | `#081627` | `#E2E8F0` | n/a (backgrounds) |
| `--panel` | `#0C1B30` | `#FFFFFF` | n/a (backgrounds) |
| `--panel-2` | `#12233C` | `#EFF4FA` | n/a (backgrounds) |
| `--ridge` | `#24344D` (1px) | `#CBD5E1` | n/a (non-text) |
| `--silver` | `#C7D2E0` | `#0F1E33` | 12.49 / 16.78 ✓ |
| `--silver-dim` | `#8FA1B8` | `#4A5B74` | 7.24 / 6.48 ✓ |
| `--gold` | `#E8B84B` | `#7A5C00` | 10.36 / 5.51 ✓ |
| `--gold-ink` | `#241A05` | `#FFFFFF` | on-gold pairing |
| `--forest` | `#3ECF8E` | `#047857` | 9.57 / 5.15 ✓ |
| `--claret` | `#E2607A` | `#B4234A` | 5.63 / 6.02 ✓ |
| `--info` | `#7DD3FC` | `#0369A1` | 11.46 / 5.58 ✓ |
| `--brass` | `#8A6D1F` | `#8A6D1F` | n/a (non-text) |

Ratios computed (WCAG relative luminance, script-verified — an earlier draft
claimed blanket ≥ 4.5:1 and was wrong on three light pairs; corrected here:
gold `#9A6B0F`→`#7A5C00`, forest `#0E7A4F`→`#047857`, info `#0284C9`→`#0369A1`).

Single-meaning rules (resolve v1 contradictions — read strictly):
- **Gold = action + brand mark only** (primary CTA, logo rays under 24px are
  brand furniture, the one-time load beam). Proof numerals are SILVER with
  forest delta badges — gold never reports data.
- **≤3 gold foci per viewport**, where a focus = CTA button, beam sweep, or
  logo lockup at hero scale. The hero ships exactly two: CTA + beam.
- **Forest = status, with one stated exception**: the prism's forest ray
  encodes verify/passing — semantic, not decorative. Forest appears nowhere
  else except pass/fail reporting.
- **AI-originated content** gets a silver left tick + "AI" text tag (NOT gold —
  v1 gave gold two meanings; fixed here).
- No gradients on body text — ever. Multi-stop gradients (8–12 stops) live
  ONLY inside 3D instrument faces and the beam, never on UI chrome.

## 3. Typography (entirely new)

- **Display:** Fraunces 600/700 (72pt optical feel, tight `-0.02em`) —
  headlines and hero. Expressive serif against technical content is the
  anti-AI-slop signature; award sites live here.
- **UI/body:** Space Grotesk 400/500/600, base 16px, line-height 1.55 —
  geometric character without Inter-ubiquity.
- **Code/data:** JetBrains Mono 400/600 (kept — it was never the problem).
- Google Fonts single request: Fraunces + Space Grotesk + JetBrains Mono.
- Load ONLY used weights (Fraunces 600/700, Grotesk 400/500/600, Mono
  400/600), `font-display: swap`, preconnect to fonts.gstatic.com. No
  italic/extra axes unless a design review demands them.
- Scale: 12 caption / 14 body-sm / 16 body / 20 h4 / 28 h3 / 40 h2 /
  64–96 hero (fluid clamp). Tabular numerals for metrics.

## 4. Logo v2 (new mark)

**The Prism**: a triangular prism splitting one silver beam into three rays —
gold (optimize = the action), forest (verify = the passing state), silver
(analyze = the neutral read). Meaning: analysis splits code into insight.
The forest ray is the single sanctioned exception to "forest = status only"
(§2) — it *is* a status, encoded in the mark. Construction: 64px grid; prism
= stroked triangle, 3px weight, silver; incoming beam horizontal left; three
outgoing rays at −18°/0°/+18° in gold/forest/silver. At under 24px only the
gold ray + prism render (favicon legibility). Variants: `logo-prism.svg`
(full color on abyss), `logo-prism-mono.svg` (single silver for
footer/light), `prism-mark` (rays only, favicon/avatar). Old lightning bolt
retired with the teal era.

## 5. Iconography & 3D material language

- Lucide, 1.75px stroke, 20px standard — unchanged rule, new hues (§2).
- Instruments (editor, diff, proof) render as **physical objects**: 2–4px
  layered drop shadows (20–40% depth per skill), 1px brass/silver rims,
  subtle top highlight (inset `0 1px 0 rgba(255,255,255,.08)`), film grain
  overlay (SVG noise, 3–4% opacity) for tactile warmth.
- Press states are tactile: `scale(.98)` + shadow collapse over 300ms.
- Emoji-as-icons: zero tolerance (carry-over rule, still violated on landing).

## 6. Shape, spacing, depth

- Radius: 14px instruments, 18px modals, 10px inputs, pills for badges.
- Perspective system: `--perspective: 1000px` on 3D stages;
  `--parallax-layers: 5` max; layer separation via translateZ, never blur
  abuse (blur is GPU-expensive on mobile).
- Content max 1240px; app workspace full-bleed; gutters 24px (16 mobile).

## 7. Motion — framer-motion choreography (the butter-flow spec)

Library: framer-motion (already depended). No GSAP needed; skill scroll
presets translated to motion equivalents below. Global rules first:

- Durations: micro 150ms / UI 300–400ms / scene 500–800ms. One easing family:
  `easeOut` (`[0.22, 1, 0.36, 1]`) for entrances, spring (`stiffness 260,
  damping 30`) for draggable/tilting 3D.
- `prefers-reduced-motion`: EVERYTHING below collapses to final state, zero
  animation — non-negotiable, per skill a11y requirements.
- Never animate width/height; never parallax body copy; reserve space for all
  badges/numbers (CLS < 0.1).

**7a. Hero 3D instrument (landing, above fold).** A code-editor card floating
in a `perspective: 1000px` stage, mouse-tracked with springs:
`useMotionValue(mx,my)` → `useTransform` → `rotateX/rotateY` (±8° max) +
`useSpring` smoothing; behind it 2 defocused ghost panels at translateZ
−60/−120px drifting on scroll (parallax layers 2–3 of 5). Gold beam: a skewed
gradient bar sweeping across on load (800ms, once). Mobile/touch: static tilt
(−4°) — no mouse tracking, no perf cliff.

**7b. The pinned transformation (landing, ONE pinned section only).**
Scroll-scrubbed (`useScroll({ target })` + `useTransform`, scrub ≈ 1):
as the user scrolls 150vh, the instrument's code morphs buggy → fixed line by
line while the proof badge counts 0 → 94/100 and the diff wash wipes across.
Pin exactly one section per page (skill rule — pinning fights native scroll
and mobile). All other reveals: viewport-enter fades, y-offset 8–16px,
300–400ms, `power1.out` equivalent.

**7c. Route & UI motion.** Page enter: 240ms fade + 8px rise. Editor → proof:
shared-element morph of Run button into the proof badge (`layoutId`).
Streaming: progressive text, code block flips in on done. Stepper progress
animates width. Toasts bottom-right, 5s. Skeletons, never spinners.

**7d. Performance budgets (gates, not wishes).** Three families + grain +
layered shadows + parallax will sink mid-range phones if unchecked:
- Fonts: subset weights only (§3), `display: swap`, preconnect. No axis creep.
- 3D: CSS-3D only (no WebGL/Three.js — perf cost:high per skill; revisit
  only with a measured budget AND a static fallback). Tilt disabled on
  touch/coarse pointers; parallax layers drop to 2 under 768px.
- Grain: single tiled SVG noise at 3–4% (no canvas, no animation).
- Gate before the landing ships: Lighthouse, throttled Moto G4 profile —
  LCP < 2.5s, CLS < 0.1, TBT < 300ms. If it misses, cut a parallax layer
  first, then the beam, then grain — in that order.
- What we explicitly do NOT ship: WebGL hero, more than one pinned section,
  scroll-jacked horizontal galleries, cursor-following spotlights.

## 8. Components (delta vs current)

Button (gold fill, ink text, 46px, tactile press), input (label-above +
inline errors — keep current validation logic), card→**instrument** (layered
shadow + rim + grain), nav (same IA, new tokens + Fraunces wordmark + prism
mark), editor shell (trench bed, brass line-number gutter), diff (split ≥1024:
forest/claret washes; AI hunks get a silver left tick + "AI" text tag — gold
is action-only per §2), proof panel (oversized silver Fraunces numerals with
forest/claret delta badges, all values bound to measured data — invented
metrics are a ship-blocker), stepper (4 steps),
banner/consent/toast (restyle), empty states (one CTA each, prism watermark).

## 9. Page notes (v2 look, same IA — no flow changes)

- **Landing `/`:** abyss stage → hero = declarative headline + LIVE
  mini-instrument mid-transformation (buggy→fixed wash + match badge + ONE
  gold CTA "Start optimizing — free") → pinned deep-dive transformation
  story (the one pin) → proof strip (silver Fraunces numerals, forest deltas,
  RESEARCH.md-sourced, never invented) → six SVG-icon instrument cards →
  footer. Kill: orbs, emoji, superlatives, competing CTAs, manifestos.
- **App pages** (`/workspace`, `/optimize`, analysis family, settings, auth,
  legal, 404): same flows as APPFLOW.md, reskinned to §2–§8 (trench beds,
  instrument cards, Fraunces headings, Space Grotesk UI, Mono code).
- **Dead-area revivals** (review/rules/team/visualize/sessions/palette — now
  MOUNTED this round, see git log `bc913f3`): reskin in place, no restyle of
  their flows until v2 implementation.

## 10. Method notes (skill compliance)

- Adopted: 3D & Hyperrealism guidance (deep navy/gold/burgundy palette,
  1000px perspective, 3–5 parallax layers, layered shadows, grain, tactile
  300–500ms press), scroll presets (one pin max, scrub 0.5–1.5, small reveals,
  decor-only parallax, reduced-motion fallbacks), chart guidance (unchanged).
- Rejected with reason: skeuomorphic literalism (wood/leather metaphors —
  wrong for a code tool; kept its *techniques*: layered shadow, grain,
  tactile press); WebGL hero (cost); FAQ-landing pattern (still wrong).
- Pre-delivery checklist enforced at implementation: no emoji icons, pointer
  cursors, 150–300ms hovers (micro tier), verified contrast pairs (§2 table
  only — no blanket claims), visible focus, reduced-motion, 375/768/1024/1440px
  passes, content visible without JS (SEO/crawler fallback), Lighthouse mobile
  gate (§7d) before landing ships.

## 11. Open decisions (finalize with owner before code)

1. Product name lock: keep "AI Code Optimizer"?
2. Dark-first with Day Lab secondary — or dark-only?
3. Merge `/workspace` + `/optimize` into one Lab shell (recommended) or keep separate?
4. v1-mounted areas (review/rules/team/visualize/sessions/palette) ship in the
   v2 reskin as-is, or phased?
5. Voice/tone: precise, terse "instrument" diction in all copy?
6. Three.js hero vs CSS-3D (default: CSS-3D)?
7. BRAND-RISK GATE (from review): test the gold-on-navy hero with 3–5 real
   developers before committing. Majority misreads as fintech/crypto →
   fallback: forest-primary CTA + numerals, gold demoted to logo/beam only.
   Do not ship the v2 landing without this check.
8. Font loading contract (§3 subset + `display: swap`): locked in?
   (Yes recommended — removes a Lighthouse failure mode up front.)

## 12. v1 ("Midnight Laboratory") — SUPERSEDED

v1's slate + run-green system is retired: it kept the old structure and its
contrast table contained three unverified pairs. Nothing from v1 carries into
v2 except reusable mechanics (skeletons-not-spinners, 4-step stepper,
one-CTA empty states). Do not mix tokens across versions.
