# User story: Brand logo — fanned deck (Option 1)

## Title
Integrate the official Toepify fanned-deck logo across header, favicon, PWA app-icon, and landing hero.

## As a / I want / So that
**As a** friend-group player opening Toepify (and the app owner who maintains it),
**I want** a single, recognisable Toepify logo — a three-card fanned deck with the
"toepify" wordmark — shown consistently in the header, the browser tab, the
home-screen/PWA icon, and the landing page,
**so that** the app feels like a finished, branded product rather than a placeholder,
and is instantly recognisable wherever it appears (browser tab, phone home screen,
shared link).

## Context & motivation
Design has delivered the official brand mark ("Option 1 — corrected fanned deck"):
a fan of three identical 5:7 playing cards in deep casino green (`#206848`) on warm
cream (`#F0EADD`), with the front card carrying a real "10♠" face, paired with a
lowercase "toepify" wordmark in Fredoka. It replaces the current placeholder branding
(a four-10s header icon, a dark 2×2-grid favicon, and an Inter-rendered `<h1>`).

This matters because Toepify is a shared app used by a small friend group around a
card table — often on flaky wifi. The branding should look polished, load reliably,
and respect the app's existing light/dark themes. The four touchpoints below are the
places a player actually sees the brand; getting all four consistent is what makes it
read as "a real app."

The handoff in `./handoff/README.md` is the authoritative geometry and typography
spec. The architect should reproduce the mark from that spec (exact coordinates,
two-typeface split), not copy the prototype verbatim.

## Acceptance criteria

### Header
1. The app header (`client/src/App.tsx`) shows the new three-card fanned-deck mark
   in place of the old four-10s `header-icon.svg`. The mark is recognisable as the
   handoff design: three identical cards, back cards splayed left/right, an upright
   front card carrying a "10♠" corner index and a large centre spade pip.
2. The header "toepify" wordmark renders in **Fredoka 600** (not Inter), lowercase,
   in the ink/accent colour, optically height-matched to the icon per the lockup
   (icon left, wordmark right, with a gap proportional to the icon size).

### Favicon
3. The browser tab favicon is replaced with the new **icon-only** mark (the
   three-card fan, no wordmark), rendered green-on-cream — not the old dark 2×2-grid
   favicon. The "10♠" corner index and centre pip remain legible/recognisable when
   the tab is rendered at ~16–24px.

### PWA / app-icon tile
4. A web app manifest is present and references an app icon based on **Option 3
   (`LogoTile`** — the inverted ink tile from the handoff prototype), provided in the
   icon sizes required for home-screen/PWA install (at minimum 192×192 and 512×512).
   Adding Toepify to a phone home screen shows this tile, not a generic/browser
   default icon.

### Landing hero
5. The landing page (`LandingPage.tsx`) displays the **full lockup** (icon +
   wordmark) prominently as a hero element — visibly larger than the header instance.

### Self-hosted font
6. Fredoka is **self-hosted** as woff2 (Latin subset), with `@font-face` declarations
   for weights **600** (wordmark) and **700** (icon rank), using
   `font-display: swap`. No request is made to `fonts.googleapis.com` or
   `fonts.gstatic.com` (verifiable: load the app with third-party font domains blocked
   and confirm the wordmark still renders in Fredoka, and that no network request
   targets a Google Fonts domain).

### Theme-token colours
7. The mark's colours are driven by the existing theme tokens (ink → `var(--accent)`,
   paper → the surface/paper token) rather than hardcoded `#206848` / `#F0EADD`. In
   the default light palette the rendered result is visually faithful to the handoff
   (deep green linework on warm cream).

### Dark-mode legibility
8. Under the `.pal-petrol` dark palette, the logo adapts (e.g. lighter ink on a
   darker paper) so that the linework, the "10♠" index, the centre pip, and the
   wordmark all remain clearly legible against the dark background. The mark is not
   washed out, invisible, or low-contrast in dark mode.

### Offline safety
9. With the app already loaded and the network offline, the logo and wordmark still
   render correctly (font and SVG are served same-origin from the Express/Railway
   origin; no dependency on an external font CDN at runtime).

### Structure & regression
10. The logo lives in its own component file(s) exporting only components (per the
    eslint `react-refresh/only-export-components` rule), and is reused across header,
    hero, and the favicon/app-icon generation rather than duplicated inline.
11. Existing Playwright specs still pass. No spec relies on the old four-10s asset;
    if a spec referenced `.header-icon`, the hook still resolves to the new mark (the
    label hooks listed in `CLAUDE.md` are unaffected).

## Edge cases worth flagging
- **Favicon legibility at 16–24px**: the corner index ("10♠") and centre pip can mush
  together at tab size. Verify the icon-only mark still reads as a card fan and not a
  green blob; if the full face is illegible, the outline/fan silhouette must still be
  recognisable.
- **FOUT while Fredoka loads**: with `font-display: swap`, the wordmark and the SVG
  rank briefly render in the fallback face. Confirm the fallback (sans-serif) doesn't
  cause a jarring reflow or misalignment in the lockup, and that the icon rank "10"
  stays inside the card corner once Fredoka swaps in.
- **Logo on `.pal-petrol`**: the cream "paper" fill against a dark background can glow
  or clash. Verify the dark-mode variant looks intentional, not like a light asset
  dropped on a dark page.
- **Very small header on mobile**: at narrow widths the icon + Fredoka wordmark must
  not overflow, wrap awkwardly, or crowd other header controls. Confirm the lockup
  scales down gracefully.
- **Serif suit glyph rendering**: the "♠" pips use Georgia/system serif. On a platform
  without Georgia, confirm the fallback serif still renders a recognisable spade.

## Out of scope (non-goals)
- Option 2 (`LogoFourSuit`) and the multi-suit red `--accent #C0392B` colourway —
  reference only, not used in Option 1.
- The handoff's optional "linework weight" / "fan energy" spread multipliers
  (decorative knobs); a single canonical rendering is enough.
- Rebranding beyond the four touchpoints above (e.g. email templates, social media,
  marketing assets).
- The `rank` override capability is not a required feature; "10" is the only rank that
  needs to ship.

## UX considerations
- The **header lockup** and **landing hero** are the critical flows — they're seen on
  every session. The favicon and PWA tile are important but lower-frequency.
- Optical matching matters more than exact pixel ratios: the wordmark should *look*
  balanced against the icon height, not hit a hardcoded multiplier.
- Dark mode is the most likely place to "feel off" — prioritise a deliberate dark
  variant over a mechanical token swap.
- Keep the two-typeface split (Fredoka rank/wordmark, serif suit pips) — it's a
  deliberate brand decision, not an inconsistency to "fix."

## Open questions
None blocking. The scope, font strategy, colour strategy, and dark-mode requirement
are all locked in the feature request, and the handoff supplies exact geometry.

## Priority suggestion
**P2.** This is brand/polish work with no impact on the core scorekeeping loop, so it
is not urgent (not P0/P1). But it is fully specced, self-contained, and meaningfully
improves how finished the app feels — worth doing soon rather than parking
indefinitely (so not P3).

## Considered and rejected
- **Re-opening the four touchpoints** — rejected: scope is locked by the stakeholder;
  re-litigating wastes a pipeline cycle.
- **Google Fonts `<link>` for Fredoka** — rejected in the feature request for
  offline-resilience, AVG/GDPR (no IP leak), and same-origin speed. Self-hosted woff2
  is the decision.
- **Hardcoding the brand hex values** (`#206848` / `#F0EADD`) — rejected: theme-token
  mapping lets the logo track light/dark automatically and stay consistent with the
  app palette.
- **A separate dark-mode SVG asset duplicated by hand** — left to the architect, but
  flagged as undesirable; a single token-driven component that adapts under
  `.pal-petrol` is preferred over two divergent copies.
- **Shipping the `rank` override and decorative spread/linework knobs** — rejected:
  out of scope; a single canonical "10♠" rendering is enough.
- **Making favicon full-lockup (icon + wordmark)** — rejected: illegible at tab size;
  favicon is icon-only by design.

---

## Addendum — Phase 3 clarifying decisions (2026-06-11)

These decisions were made at the orchestrator clarifying-questions checkpoint and
**override** any conflicting earlier text in this document and in `design-spec.md`.

### A1. Font loading — Fredoka via Google Fonts `@import` (REVERSES the self-host decision)

The earlier "self-hosted woff2" decision is **withdrawn**. Discovery showed the app
**already** loads Space Grotesk + Hanken Grotesk via a Google Fonts `@import` at
`client/src/styles/tp-scoreboard.css:1`, so the offline/AVG rationale for self-hosting
Fredoka no longer holds in isolation. Decision: **add Fredoka weights 600 and 700 to
the existing Google Fonts `@import`** (extend the `css2?family=…` URL), with
`display=swap`. No woff2 files, no `@font-face`, no `client/public/fonts/`.

This supersedes AC6 and softens AC9:
- **AC6 (revised):** Fredoka 600 (wordmark) and 700 (icon rank) are loaded via the
  existing Google Fonts `@import` URL in `tp-scoreboard.css` (single import line,
  `display=swap`). Verifiable: the wordmark renders in Fredoka, and the `@import`
  URL contains `family=Fredoka:wght@…600…700`. (The "no Google request" wording in
  the original AC6 no longer applies.)
- **AC9 (revised):** The SVG mark and layout still render offline (they are inline
  SVG + CSS, no runtime asset). The *wordmark/rank font* may fall back to the
  system stack offline (acceptable, `display=swap`); offline-safety applies to the
  mark, not to the webfont.

### A2. Favicon — SVG-only

Ship only the new `client/public/favicon.svg` (icon-only mark). **No** raster
16/32px fallback. Consistent with the current SVG-only favicon. Section 5 of the
design-spec's raster-fallback recommendation is **not** adopted.

### A3. PWA tile — pre-generated static PNGs (no build/runtime dependency)

The 192×192 and 512×512 (and maskable) app-icon PNGs are **generated once and
committed** as static assets (e.g. `client/public/icons/`). Do **not** add a build
step or an image-processing devDependency (`sharp`/`resvg`/etc.). The web app
manifest references these committed PNGs.

### A4. Existing Space/Hanken Grotesk `@import` — left as-is (follow-up)

Not removed or self-hosted in this feature. The existing Google Fonts dependency
stays; Fredoka simply joins it. Logged as follow-up tech-debt (fully removing the
Google Fonts CDN dependency is a separate, optional task).
