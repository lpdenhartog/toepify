# QA report — Brand logo (fanned deck, Option 1)

**Mode:** verify-only (no new automated tests, per stakeholder decision — brand
assets, low regression risk, no Critical/High security findings).
**Date:** 2026-06-11
**Method:** static inspection of source + build artifacts, `npm run build`,
`npx eslint`, grep of e2e specs. The user-story Addendum (A1–A4) was treated as
overriding earlier ACs (revised AC6/AC9, SVG-only favicon, committed PWA PNGs).

## Build & lint evidence

- `cd client && npm run build` → **passes**: `✓ 73 modules transformed`,
  `✓ built in 696ms`. `dist/index.html` + CSS + JS emitted, no TS errors.
- `dist/` confirms public assets copied: `dist/favicon.svg`,
  `dist/manifest.webmanifest`, `dist/icons/{icon-192,icon-512,icon-maskable-512}.png`.
- `npx eslint src/components/logo/ src/pages/LandingPage.tsx` → **exit 0** (no
  new lint errors; component-only export rule satisfied).
- PNG validation (`file`): all three are valid PNGs at the declared sizes and
  non-empty (9371 / 26674 / 26674 bytes).

## Acceptance-criteria checklist

| AC | Verdict | Evidence |
|---|---|---|
| **AC1** Header three-card fanned mark, handoff geometry | **PASS** | `App.tsx:189` `<LogoMark size={36} decorative className="header-icon" />`. `LogoMark.tsx` renders three `<rect>` cards: two `FannedCard` at `rotate(±17 120 205)` (lines 74–75) + upright front card `rotate(0)` (line 76) carrying `10` rank, corner `♠`, centre `♠`. Constants match handoff exactly: `MARK_VIEWBOX "0 0 240 250"`, `FAN_ANGLE 17`, `FAN_PIVOT {120,205}`, `RANK {100,85,31.7,700}`, `CORNER_SUIT {100,111,22}`, `CENTER_PIP {120,156,66}`, rect `x=72 y=53` (cx−48, cy−67). `logo.constants.ts:6–16`. |
| **AC2** Wordmark Fredoka 600, lowercase, ink colour, gap | **PASS** | `index.css:110–120` `.app-header h1`: `font-family "Fredoka"`, `font-weight 600`, `text-transform lowercase`, `color var(--logo-ink)`. Icon→wordmark gap from `.header-link { gap: 0.5rem }` (`index.css:434`). `<h1>` retains the `staging-label` span (`App.tsx:190–193`). |
| **AC3** Favicon icon-only, hardcoded green-on-cream, no wordmark | **PASS** | `public/favicon.svg`: viewBox `0 0 240 250`, three cards `fill #F0EADD stroke #206848`, `<text>` nodes only `10`/`♠`/`♠` — no "toepify" text (grep confirmed). |
| **AC4** Manifest + Option-3 PNGs (192/512/maskable) | **PASS** | `manifest.webmanifest` lists `/icons/icon-192.png`, `/icons/icon-512.png` (purpose any) + `/icons/icon-maskable-512.png` (purpose maskable), `name`/`short_name` "Toepify", `theme_color #206848`. PNGs are `LogoTile` (Option-3 inverted ink tile) renders; all three exist, valid, non-empty. `index.html:6–10` links manifest + `theme-color` + apple-touch-icon + apple metas. |
| **AC5** Hero full lockup, larger than header | **PASS** | `LandingPage.tsx:89` `<LogoLockup iconSize={88} className="landing-hero" />` is the **first child** of `.landing-page`, above the first `.card` (line 90). `.landing-hero-icon { height: 88px }` (`index.css:447`) vs header `.header-icon { height: 36px }` (line 126) ≈ 2.4×. |
| **AC6 (revised)** Fredoka via Google `@import` 600;700, display=swap | **PASS** | `tp-scoreboard.css:1` `@import` URL contains `&family=Fredoka:wght@600;700` with `&display=swap`. No `@font-face`, no woff2, no `client/public/fonts/` (grep negative). |
| **AC7** Theme-token colours drive the mark | **PASS** | `index.css:28–29` `:root` `--logo-ink: var(--accent)` (resolves `#1f6b4a`), `--logo-paper: #f0eadd`. `LogoMark.tsx` fills/strokes use `var(--logo-ink)`/`var(--logo-paper)` (lines 44–45, 84–85, 97, 107, 118). |
| **AC8** Dark-mode legibility, no coral trap | **PASS** | `tp-scoreboard.css:33–34` `.pal-petrol` overrides `--logo-ink: #43c9a8` and `--logo-paper: #e4ddcb` — declared **after** `--accent: #f47b5c` (line 25) in the same block, so the cascade resolves logo ink to teal-green, NOT coral. Coral trap avoided. |
| **AC9 (revised)** Mark renders offline (no runtime JS/asset font dep) | **PASS** | Mark is inline SVG + CSS vars (`LogoMark.tsx`) — no runtime fetch, no JS font loader, no image asset. Font may fall back to `system-ui` offline (acceptable per A1, `display=swap`). |
| **AC10** Component-only files; constants in `.ts`; reused | **PASS** | `client/src/components/logo/`: `LogoMark.tsx`, `LogoLockup.tsx`, `LogoTile.tsx` export only components; `logo.constants.ts` holds all constants/types. eslint exit 0 (no `react-refresh/only-export-components` violation). `LogoMark` reused in header (`App.tsx`) + hero (`LogoLockup` → `LandingPage.tsx`); favicon is a hand-synced static SVG copy (by design — browser chrome can't read CSS vars). |
| **AC11** Playwright regression; `header-icon` hook preserved; old asset gone | **PASS** | `header-icon` class preserved on the new `<svg>` (`App.tsx:189`). `client/src/assets/` no longer exists — `header-icon.svg` fully removed, no `headerIcon`/`header-icon.svg` import remains in `client/src` (grep negative). e2e specs in `e2e/tests/` reference none of `header-icon`/`header-link`/`favicon`/`toepify`/old four-10s asset (grep negative across all 10 spec files), so no spec breaks on this change. |

**Result: 11 / 11 PASS.**

## Edge cases (sanity-checked from the user story)

- **Favicon legibility 16–24px**: SVG-only (A2), fan silhouette + centre `♠`
  carry recognition; corner index best-effort. Consistent with spec §7/§10.
  Static SVG — no automated pixel check; design accepts best-effort small size.
- **Fredoka FOUT / swap**: `display=swap` set; rank `<text>` is
  `text-anchor="middle"` at `x=100` (`LogoMark.tsx:95`) so it stays corner-centred
  through a metrics swap — no drift by construction. `.app-header h1` has fixed
  `line-height: 1` + `letter-spacing` to bound jitter.
- **Dark-mode contrast**: `--logo-ink #43c9a8` on `--logo-paper #e4ddcb` cards
  over the deep-teal `.pal-petrol` surface — deliberate dark variant, not an
  inherited coral or washed-out light asset.
- **Narrow mobile**: `.app-header h1 { white-space: nowrap }` (`index.css:117`)
  + 480px shrink (h1 1.25rem, icon 30px) prevents wrap/overflow.
- **Serif `♠`**: `Georgia, 'Times New Roman', serif` stack — recognisable spade
  fallback. Accepted per handoff.

## Bugs found

None. No AC failures, no blocking issues. Pre-existing lint error in `App.tsx`
(`react-hooks/set-state-in-effect` on the `setMode("viewer")` effect) is
unrelated to this feature and out of scope — confirmed in the implementation
notes and not introduced by these changes (lint of the feature's files exits 0).

## Tests

Per stakeholder decision, **no new automated tests were added**. No
Critical/High security findings → **no security regression tests needed**.
The `technical-spec.md` §12 lists candidate Playwright/Vitest assertions if the
team later wants coverage (header `<svg>` with 3 rects, wordmark font-family +
weight, favicon href/hex/icon-only, manifest JSON + icon URLs 200, dark-mode
`--logo-ink` resolves to `#43c9a8` not coral, hero taller than header).

## Visual analysis

Full visual regression (Playwright screenshots) was **not run** — this is a
verify-only pass and the stakeholder excluded new automated tests/tooling for
this feature. Geometry, sizing, and token wiring were verified statically
against the handoff constants instead. Recommend a manual eyeball of the header
lockup, landing hero, dark-mode (`.pal-petrol`), and the favicon at tab size on
next manual session.

## Verdict

**PASS.** All 11 acceptance criteria verified against source and build
artifacts. Build passes, feature files lint clean, the old `header-icon.svg`
placeholder is fully removed and unreferenced, the `header-icon` Playwright hook
is preserved on the new inline-SVG mark, and no existing e2e spec references
changed branding strings. The Addendum overrides (Fredoka via Google `@import`,
SVG-only favicon, committed PWA PNGs, softened offline AC) are all honoured.
