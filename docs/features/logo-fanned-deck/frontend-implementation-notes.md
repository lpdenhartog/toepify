# Frontend implementation notes — Brand logo (fanned deck, Option 1)

Built strictly to `technical-spec.md` (the contract), with the user-story
Addendum (A1–A4) overriding earlier text. No architecture re-decided.

## Files created

- `client/src/components/logo/logo.constants.ts` — exact constants block from
  spec §3.1 (BRAND_INK/PAPER, geometry, font stacks, DEFAULT_RANK). Constants
  live here, never exported from `.tsx`, per eslint
  `react-refresh/only-export-components`.
- `client/src/components/logo/LogoMark.tsx` — inline-SVG fanned deck per §3.2.
  Props `{ size, rank?, decorative?, className?, title? }`. `size` = rendered
  HEIGHT; `width = size / MARK_ASPECT`. Fills/strokes use
  `var(--logo-ink)`/`var(--logo-paper)` (not props). `decorative` →
  `aria-hidden`; otherwise `role="img"` + `aria-label`. Geometry: rect
  `x=72 y=53` (cx−48, cy−67), back cards `rotate(±17 120 205)`, front `rotate(0)`.
- `client/src/components/logo/LogoTile.tsx` — Option 3 inverted tile per §3.3,
  hardcoded BRAND_INK/PAPER, viewBox `0 0 220 220`. PNG-generation source only;
  never mounted. Cards 116×164 (`x=cx−58 y=cy−82`), back `cx132 cy96 +20°` (no
  index), front `cx92 cy122 −8°`, corner index `x63 y86` rankScale 1.3
  (font-size 33.8, suit font-size 22), centre pip `x92 y168 font-size 80`.
- `client/src/components/logo/LogoLockup.tsx` — hero lockup per §3.5: `<div
  className>` + `<LogoMark decorative className="landing-hero-icon">` +
  `<span className="landing-hero-wordmark">toepify</span>`. Props
  `{ iconSize, className? }`.
- `client/public/manifest.webmanifest` — exact JSON from §8.1.
- `client/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` —
  committed static PNGs rendered from LogoTile (see below).
- `scripts/generate-icons.mjs` — throwaway one-off rasterizer (NOT wired into
  `package.json` build or CI). Run manually with `node scripts/generate-icons.mjs`.

## Files changed

- `client/src/styles/tp-scoreboard.css` — line 1 `@import` extended with
  `&family=Fredoka:wght@600;700` (Space/Hanken Grotesk + `display=swap` kept).
  `.pal-petrol` gains `--logo-ink: #43c9a8` and `--logo-paper: #e4ddcb` (the
  coral-trap override — does NOT inherit `--accent`).
- `client/src/index.css` — `:root` gains `--logo-ink: var(--accent)` and
  `--logo-paper: #f0eadd`. `.app-header h1` restyled to Fredoka 600 (1.5rem,
  weight 600, letter-spacing −0.01em, line-height 1, white-space nowrap, color
  `var(--logo-ink)`). `.app-header .header-icon` gains `display: block`. New
  `.landing-hero` / `.landing-hero-icon` / `.landing-hero-wordmark` rules. 480px
  portrait overrides for h1 (1.25rem) and the hero (gap/padding/icon
  64px/wordmark 2.5rem) added to the existing media-query block.
- `client/src/App.tsx` — `<img className="header-icon">` replaced with
  `<LogoMark size={36} decorative className="header-icon" />`; `headerIcon`
  import removed; `LogoMark` import added. `<h1>toepify{isStaging && …}</h1>`
  kept structurally identical (only CSS font changed).
- `client/src/pages/LandingPage.tsx` — `<LogoLockup iconSize={88}
  className="landing-hero" />` added as the first child, above the first `.card`.
- `client/public/favicon.svg` — replaced with the icon-only fanned-deck mark,
  hardcoded `#206848` ink / `#F0EADD` cream, same viewBox/geometry as LogoMark,
  no wordmark.
- `client/index.html` — added `<link rel="manifest">`, `<meta
  name="theme-color" content="#206848">`, apple-touch-icon + two apple metas.
  Existing favicon link and `<title>toepify</title>` kept.

## Files deleted

- `client/src/assets/header-icon.svg` — old four-10s placeholder; verified no
  remaining references in `client/src` before deleting.

## PNG generation

Tool: **Playwright Chromium** (already installed at repo root — no new
dependency). `scripts/generate-icons.mjs` serializes the LogoTile geometry to a
standalone SVG string with hardcoded hex, loads it via `page.setContent`, and
`locator("svg").screenshot()` at 192/512/512. The ink tile provides its own
opaque background, so the maskable PNG is opaque and its content sits inside the
~80% safe zone (same render as `icon-512`, per §8.3).

Verified after generation (actual output):
```
icon-192.png          PNG image data, 192 x 192, 8-bit/color RGB  (9371 bytes)
icon-512.png          PNG image data, 512 x 512, 8-bit/color RGB  (26674 bytes)
icon-maskable-512.png PNG image data, 512 x 512, 8-bit/color RGB  (26674 bytes)
```
All three exist and are non-empty.

## Verification (actual results)

- `npm run build` (tsc -b && vite build): **passes** — "✓ 73 modules
  transformed", "✓ built in 729ms".
- `npm run lint`: reports **exactly 1 error**, and it is **pre-existing** and
  unrelated to this feature — `react-hooks/set-state-in-effect` on the
  `setMode("viewer")` effect in `App.tsx` (line 113 on the clean tree, line 156
  after my one-line import change). Confirmed by stashing all my changes and
  re-running lint: the same single error is present with the feature reverted.
  Linting only my created/changed files
  (`npx eslint src/components/logo/ src/pages/LandingPage.tsx`) exits **0** — my
  changes introduce **zero new** lint errors.
- `git status` shows the expected set: 6 modified files, deleted
  `header-icon.svg`, and the new logo components / icons / manifest / script.

## Deviations from the spec

None of substance. Notes:

- **No Vitest unit tests added.** Per §12 the repo's Vitest config is
  server-side and there is no client/jsdom test setup; the spec says to prefer
  the Playwright assertions and keep Vitest minimal, and per the project
  CLAUDE.md rule to **ask** before adding tests. I did not add tests or wire up
  a jsdom harness — flagged for QA below.
- 480px hero overrides were placed inside the **existing** `(max-width: 480px)
  and (orientation: portrait)` media-query block in `index.css` rather than a
  second duplicate block. Same selectors/values as §4.5; avoids a redundant
  media query.

## Considered and rejected

- **Adding a jsdom Vitest harness for LogoMark** — rejected for now: no client
  test setup exists, and CLAUDE.md requires asking before adding tests. Left to
  the QA phase to decide (component render + a11y assertions are cheap if a
  harness is wanted).
- **Wiring `generate-icons.mjs` into an npm script** — rejected per Addendum A3:
  the PNGs are static committed artifacts, the script must not enter the
  build/CI chain. It lives under `scripts/` for reproducibility only.
- **`rsvg-convert`/`qlmanage`/`sharp` for rasterizing** — rejected: Playwright
  is already a repo-root dependency, so no new tool/devDependency is needed (A3).

## Follow-ups / assumptions for QA & security

- **QA**: confirm which E2E/unit tests from §12 to add (header `<svg>` with 3
  rects, wordmark `font-family` starts with `Fredoka` + weight 600, favicon
  href + `#206848` + icon-only, manifest JSON + three icon URLs 200, dark-mode
  `--logo-ink` resolves to `#43c9a8` not coral `#f47b5c`, hero icon taller than
  header). The `.header-icon` Playwright hook is preserved (AC11).
- **Visual QA**: the Fredoka `display=swap` moment — rank "10" is
  `text-anchor="middle"` at `x=100` so it stays centred in the corner by
  construction; verify no jarring reflow on the wordmark swap.
- **Security**: no backend/API/data-model changes. The only external runtime
  dependency is the existing Google Fonts `@import` (Fredoka joined it per A1/A4;
  removing the Google Fonts CDN entirely is logged tech-debt, out of scope here).
  Manifest + icons are served same-origin from `client/public` (copied to
  `dist` by Vite).
- **Pre-existing lint error** in `App.tsx` (`set-state-in-effect`) is unrelated
  to this feature and out of scope; flagged so the reviewer doesn't attribute it
  to this change.
