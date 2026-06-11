# Feature request: Brand logo — fanned deck (Option 1)

## Context

A design handoff has delivered the official Toepify brand logo ("Option 1 —
corrected fanned deck"). It replaces the current placeholder branding. The full
handoff lives in `./handoff/` (README.md = authoritative spec, logos.jsx =
prototype source, "Option 1 Reference.html" = target render).

**The mark:** a fan of three identical playing cards (true 5:7 proportion) on a
low pivot. Two back cards splayed ±17°, one upright front card carrying a real
"10 of spades" face (corner index "10♠" + large centre spade pip). Pure inline
SVG — no raster assets. Paired with a "toepify" wordmark.

**Brand specifics (from handoff):**
- Ink colour `#206848` (deep casino green), paper `#F0EADD` (warm cream).
- Icon viewBox `0 0 240 250`; each card `96×134`, `rx=12`, `stroke-width=8`.
- Front face: rank "10" in **Fredoka 700**, suit "♠" in **Georgia/serif**;
  centre pip "♠" in **Georgia/serif** at `font-size 66`.
- Wordmark "toepify" lowercase, **Fredoka 600**, `letter-spacing -0.01em`.
- Lockup: icon left, wordmark right, gap ≈ 0.2 × icon size.
- Two-typeface split is deliberate: rounded-sans (Fredoka) for rank/wordmark,
  serif (Georgia) for suit glyphs. Keep it.

## Current state (what this replaces)

- `client/src/assets/header-icon.svg` — a four-10s fan (red/dark suits on cream),
  used as `<img className="header-icon">` in `client/src/App.tsx` header, next to
  an `<h1>toepify</h1>` rendered in **Inter** via CSS (`--accent` green, lowercase).
- `client/public/favicon.svg` — a dark-themed 2×2 grid of four 10s (`#0f1923` bg).
- App theme: "Krijt & Klaver" light palette on `:root` (`client/src/index.css`),
  dark opt-in `.pal-petrol` (`client/src/styles/tp-scoreboard.css`). Only **Inter**
  is currently loaded; no Fredoka.
- Token affinity: handoff ink `#206848` ≈ existing `--accent #1f6b4a`; handoff
  paper `#F0EADD` ≈ existing `--surface #fbf7ee`.

## Scope (decided with stakeholder)

In scope — all four touchpoints:
1. **Header** — replace `header-icon.svg` with the new 3-card mark AND convert the
   `<h1>toepify</h1>` wordmark to Fredoka 600 per the lockup.
2. **Favicon** — replace the dark 2×2 `favicon.svg` with the new green-on-cream
   icon-only mark (no wordmark), crisp at ~24px.
3. **PWA / app-icon tile** — add Option 3 (`LogoTile`, the inverted ink tile from
   the handoff prototype) as a home-screen/PWA icon, with the web app manifest and
   the required sizes.
4. **Landing-page hero** — show the full lockup prominently on `LandingPage.tsx`,
   not only the small header instance.

## Decisions (locked)

- **Font loading:** Fredoka **self-hosted** as woff2, subset to Latin, weights
  **600** (wordmark) and **700** (icon rank). `@font-face` with `font-display: swap`.
  Rationale: offline-resilient (realtime app used on flaky wifi at a card table),
  AVG/GDPR-safe (no Google Fonts IP leak), same-origin fast (already Railway-served
  from the Express origin). NOT Google Fonts `<link>`.
- **Colours:** map the mark to existing theme tokens (`var(--accent)` for ink,
  `var(--surface)`/paper token) rather than hardcoding `#206848`/`#F0EADD`, so the
  logo tracks light/dark automatically. Keep the rendered result visually faithful
  to the handoff in light mode.
- **Dark mode:** provide a logo variant that adapts under `.pal-petrol` (e.g. light
  ink on darker paper) so the mark stays legible in the dark palette.

## Out of scope

- Options 2 (`LogoFourSuit`) and the multi-suit red `--accent #C0392B` colourway —
  reference only, not used in Option 1.
- The handoff's optional "linework weight" / "fan energy" spread multipliers
  (decorative knobs); a single canonical rendering is enough.
- Rebranding beyond the four touchpoints above (e.g. email templates, social).

## Acceptance criteria (seed — PM to refine)

- AC1: The new fanned-deck mark renders in the app header, replacing the old icon.
- AC2: The "toepify" wordmark renders in Fredoka 600 (self-hosted), ink-green,
  optically matched to the icon height, in both header and landing hero.
- AC3: Browser tab shows the new green-on-cream favicon, legible at ~24px.
- AC4: A PWA/home-screen app icon (Option 3 tile) is configured via web manifest.
- AC5: The full lockup appears prominently on the landing page.
- AC6: Logo colours are theme-driven and remain legible under `.pal-petrol` dark mode.
- AC7: Fredoka is self-hosted (no third-party font request); app works offline-safe.
- AC8: The logo component(s) live in their own files (component-only exports per
  the eslint `react-refresh/only-export-components` rule), reusable across header,
  hero, and favicon-generation.
- AC9: Existing Playwright label hooks unaffected (`.header-icon` may change; verify
  no spec depends on the old four-10s asset).
