# Design spec: Brand logo — fanned deck (Option 1)

Scope: how the authoritative handoff mark (`./handoff/README.md`) lives inside
Toepify's existing "Krijt & Klaver" design system across four touchpoints
(header, favicon, PWA tile, landing hero). **The geometry is not re-opened** —
every coordinate in the handoff README is authoritative and reproduced exactly.
This document specifies tokens, dark-mode, sizing, fonts, and accessibility.

A note before the detail: I inspected the real `.pal-petrol` tokens
(`client/src/styles/tp-scoreboard.css`). The dark palette's `--accent` is
**coral `#f47b5c`**, not a green. This is the single most consequential finding
in this spec — a mechanical "ink → `var(--accent)`" swap would render the dark
logo *coral*, which reads as the rejected Option-2 red colourway, not the
casino-green brand. The dark variant therefore must NOT inherit `--accent`. See
section 2. (The PM's UX note "dark mode is the most likely place to feel off —
prioritise a deliberate dark variant" is exactly right; this is why.)

---

## 1. Token mapping (light palette)

### The two brand colours

| Handoff token | Value | Maps to | Decision |
|---|---|---|---|
| `ink` | `#206848` | `var(--accent)` (`#1f6b4a`) | **Accept the delta, use the token.** |
| `paper` | `#F0EADD` | **new `--logo-paper`** | Introduce a dedicated token. |

### Ink → `var(--accent)`, accept the delta

`#206848` vs `--accent #1f6b4a` differ by roughly ΔE ≈ 2 — imperceptible at
header size, indistinguishable at favicon size. Do **not** nudge `--accent`:
that token drives the entire app (buttons, borders, focus rings, the live-dot,
the scoreboard). Shifting it 2 units green-ward to flatter the logo is a
disproportionate change with app-wide blast radius for zero visible gain. The
logo binds to `var(--accent)` and inherits whatever the app's green is. AC7 is
satisfied: in the light palette the result is deep green linework, visually
faithful to the handoff.

### Paper → a new dedicated `--logo-paper`, NOT `--surface`

The feature request floats `--surface #fbf7ee` as the paper candidate. I
**reject reusing a surface token** and recommend a dedicated custom property:

```css
:root {
  /* Logo card-face fill. Faithful to handoff paper #F0EADD; intentionally
     warmer/deeper than --surface so the cream cards read against the page bg. */
  --logo-paper: #f0eadd;
}
```

Reasoning:
- **`--surface #fbf7ee` is too light** and too close to the page background
  (`--bg #ece5d6`, `--bg-glow #f6f1e6`). The cards' cream fill would nearly
  disappear into the landing-page glow — the fan would read as green outlines
  on nothing rather than as solid cards. `#F0EADD` is deeper than `--surface`
  and was chosen by the designer precisely to sit on a warm bg.
- **Semantic coupling risk.** `--surface` is the card/panel fill across the
  whole app. If a future theme tweak lightens `--surface`, the logo's card
  faces should not silently track it. The logo's paper is a *brand* colour, not
  a *surface* colour; it deserves its own name even though today's value is
  close to `--surface-hi #f1e9d8`.
- One new custom property, declared on `:root` in
  `client/src/index.css` (alongside the existing palette block, lines 5–28).
  Its dark-palette override lives in `.pal-petrol` (section 2).

So the logo component reads exactly two CSS variables: `var(--accent)` for ink
and `var(--logo-paper)` for paper. No other hardcoded hex in the SVG.

---

## 2. Dark-mode variant (`.pal-petrol`)

**Goal (AC8):** linework, the 10♠ index, the centre pip, and the wordmark all
stay clearly legible on the dark teal background — and the mark looks
*intentional*, not a light asset dropped on a dark page.

### The coral trap

`.pal-petrol` sets `--accent: #f47b5c` (coral) on a `--bg: #07181c` /
`--surface: #0d2329` deep-teal background. If the logo's ink simply inherited
`var(--accent)` in dark mode, the cards would be outlined and faced in **coral**
— which is the explicitly out-of-scope red colourway, and clashes with the
"casino green" brand identity. We must override.

### Decision: keep cream paper, switch ink to a light green

Two sub-options were weighed (see Considered and rejected). The chosen variant:

- **Paper stays cream, slightly muted.** Inverting the paper to a dark fill
  would turn the mark into a dark-card-on-dark-bg silhouette that needs an
  outline to survive — a structurally different drawing. The brand reads as
  *cream playing cards*; keep them cream so the dark logo is recognisably the
  same mark as the light one. Override `--logo-paper` in `.pal-petrol` to a
  marginally desaturated cream so it doesn't glow harshly against deep teal:

  ```css
  .pal-petrol {
    --logo-paper: #e4ddcb;      /* cream, a touch deeper than the light value
                                   so it reads as a warm card, not a white glow */
    --logo-ink: #43c9a8;        /* the dark palette's own green (== --pos) */
  }
  ```

- **Ink switches to the dark palette's existing green.** `.pal-petrol` already
  ships a green: `--pos: #43c9a8` (the "positive balance" teal-green). Reusing
  it keeps the dark logo green (brand-faithful), guarantees it's a real palette
  colour (not invented), and gives strong contrast: `#43c9a8` linework on
  `#e4ddcb` cream cards is comfortably legible at every size, and the cream
  cards sit clearly above the `#07181c` page. The wordmark uses the same
  `--logo-ink`.

### How the component consumes this

The logo component must read **`--logo-ink`** (not `--accent`) for ink, with a
light-palette default that resolves to the accent green:

```css
:root        { --logo-ink: var(--accent); }   /* light: #1f6b4a green */
.pal-petrol  { --logo-ink: #43c9a8; }          /* dark: palette green (--pos) */
```

This is the cleanest single-component, token-driven path (the feature request's
preferred approach over a hand-duplicated dark SVG). One SVG, two variables
(`--logo-ink`, `--logo-paper`), both overridden under `.pal-petrol`. No second
asset, no `prefers-color-scheme` media query inside the SVG — the existing
`.pal-petrol` class toggle drives everything, consistent with how the rest of
the app themes.

**Contrast check (dark):** `#43c9a8` on `#e4ddcb` ≈ 1.9:1 — *this is decorative
linework/pips, not body text*, so WCAG text thresholds don't apply, but the
ratio is healthy for a graphic. The cream card on `#07181c` bg ≈ 13:1. The
green wordmark `#43c9a8` directly on the dark page bg `#07181c` ≈ 8.5:1 —
exceeds AA for large text. All four named elements (linework, index, pip,
wordmark) clear their legibility bar.

---

## 3. Header lockup

Replaces the `<Link className="header-link">` content in `client/src/App.tsx`
(~line 142–148): the `<img className="header-icon">` and the `<h1>` wordmark.

### Sizing

- **Icon height: 36px** (unchanged from current `.header-icon { height: 36px }`,
  index.css:121–123). The mark's aspect ratio is 240:250, so at 36px tall the
  icon is ~34.6px wide. Keep the icon as an **inline SVG React component** sized
  by height.
- **Wordmark: Fredoka 600, font-size ≈ 24px (1.5rem)**, lowercase,
  `letter-spacing: -0.01em`, `line-height: 1`, colour `var(--logo-ink)`.
  - The handoff's "wordmark ≈ 0.65 × icon height" ratio is calibrated for the
    *large* lockup where the wordmark sits beside the full icon height. At a
    36px icon that formula gives ~23px, which lands right. But per the handoff
    and the PM's UX note, **match optically, not by formula** — Fredoka 600's
    x-height should optically align the "toepify" baseline-to-cap span with the
    card stack. 24px is the recommended starting value; the build may nudge ±1px
    for optical balance.
  - Current header `<h1>` is 1.75rem Inter 700 with `letter-spacing: 0.05em`.
    Fredoka 600 is visually heavier per weight-number, so the **smaller size +
    tighter tracking** is deliberate, not a regression. Note the wordmark
    letter-spacing flips from the current `+0.05em` (Inter) to `-0.01em`
    (Fredoka) per the handoff.

### Wordmark stays an HTML text element (NOT SVG)

Keep "toepify" as a real `<h1>` text node styled in Fredoka 600 — do **not**
bake it into the SVG. Reasons: (a) it stays selectable/translatable and remains
the page's semantic `<h1>`; (b) the existing `staging-label` span
(`{isStaging && <span> - STAGING</span>}`, App.tsx:146) must keep working and
that's trivial with text, painful in SVG; (c) the icon's *rank* "10" is SVG text
(it's geometry); the *wordmark* is content. This preserves the two-typeface
split cleanly: SVG carries Fredoka-700 rank + Georgia pips, the `<h1>` carries
Fredoka-600 wordmark.

### Gap & alignment

- Gap icon→wordmark: **8px**. The handoff's "≈0.2 × icon size" gives ~7px at
  36px; 8px matches the existing `.header-link { gap: 0.5rem }` (index.css:428)
  so no layout-rule churn — reuse the existing gap.
- `align-items: center` (already on `.header-link`). The icon's visual mass sits
  slightly low (cards fanned upward), so vertically centring the 36px icon box
  against the wordmark cap-height reads balanced; no manual nudge expected, but
  flag for visual QA.

### Responsive (narrow mobile — AC: no overflow/awkward wrap)

- At `max-width: 480px portrait`, the existing rule shrinks
  `.header-icon` to 30px and the `<h1>` to 1.45rem (index.css:1141–1143,
  1137–1139). **Mirror this for the new lockup:** icon 30px, wordmark ~20px
  Fredoka 600. The lockup must stay on **one line** — apply `white-space:
  nowrap` to the wordmark and let the header's `justify-content: space-between`
  keep the `header-actions` cluster on the right.
- The header is a flex row with the logo link and `header-actions`. With only
  "toepify" (7 lowercase chars) at 20px + a 30px icon + 8px gap, total lockup
  width is well under 200px — no overflow risk even on a 320px viewport
  (`body { min-width: 320px }`). The staging suffix " - STAGING" only appears on
  staging and is acceptable to let the header be a touch tighter there.
- **Landscape phone** (`max-height: 540px`): `.app-header { display: none }`
  already hides the header entirely (index.css/tp-scoreboard.css:1114). No logo
  work needed for that breakpoint.

---

## 4. Landing hero

Placement: a new hero block at the **top of `LandingPage.tsx`'s returned tree**,
above the first `.card` ("Ga naar toernooi", LandingPage.tsx:73). It is the
first thing in the page body, under the global app header.

### Layout & size

- **Full lockup** (icon + wordmark), centred horizontally, in a dedicated
  `.landing-hero` block with vertical padding (recommend `2rem 0 1.5rem`).
- **Icon height ~88px**, wordmark Fredoka 600 at ~56px — i.e. the handoff's
  ~0.65× ratio at hero scale (`0.65 × 88 ≈ 57`). This is **visibly larger than
  the 36px header instance** (AC5) — roughly 2.4× — establishing clear hierarchy
  the moment the page loads.
  - On `max-width: 480px`, scale to icon ~64px / wordmark ~40px so the lockup
    never approaches the 320px min-width edge (64 + gap + ~120px wordmark ≈
    fits comfortably). Gap scales to ~13px (`0.2 × 64`).
- Centre via `display: flex; justify-content: center; align-items: center;
  gap: ~18px` (`0.2 × 88`).

### Relationship to the rest of the page

- The hero is **brand-only** — no tagline text is in scope (out-of-scope:
  rebranding beyond the four touchpoints). It sits as a quiet masthead above the
  functional "Ga naar toernooi" card; it should feel like letterhead, not
  compete with the primary input.
- Spacing: ~`1.5rem` between the hero's bottom and the first `.card`'s top
  (the card already carries `margin-bottom: 1rem`; mirror above it).
- The hero respects the same `var(--logo-ink)` / `var(--logo-paper)` tokens, so
  it automatically adapts under `.pal-petrol`.
- Optional polish (not required): the icon may use the same subtle entrance the
  app favours elsewhere, but keep it minimal — gate any animation behind
  `prefers-reduced-motion` (the app already honours this, tp-scoreboard.css:1128).

---

## 5. Favicon (icon-only, ~16–24px)

- Source: the **same fanned-deck mark, icon only** (no wordmark), green-on-cream,
  served as a static `client/public/favicon.svg`, replacing the old dark 2×2
  grid. Green linework `#206848`/accent on `#F0EADD` cream.
- **Hardcode the brand hex in the favicon SVG** (not CSS variables). A favicon
  is loaded by the browser chrome outside the app's DOM/CSS — it cannot read
  `:root` custom properties or `.pal-petrol`. So the favicon is the one place
  the literal `#206848` / `#F0EADD` are acceptable (and necessary). It always
  shows the **light** colourway regardless of app/OS theme; that's correct for a
  brand tab-mark.

### Small-size legibility (AC3 + edge case)

At 16–24px the corner index "10♠" and centre pip will mush. The fan silhouette
must still read as a card fan. Recommended simplification, in priority order:

1. **Ship the full mark as `favicon.svg`** (vector, crisp) for browsers that
   render SVG favicons at high DPI — many will show the face acceptably at 24px.
2. **Provide a dedicated simplified raster fallback** at 16/32px
   (`favicon-16.png`, `favicon-32.png` or a classic `favicon.ico`): in the
   simplified version, **drop the corner index entirely** and keep only the
   three-card fan silhouette + the large centre ♠ pip. The corner "10♠" is the
   first thing to go illegible; the centre pip + fan shape carry recognition.
3. Slightly **thicken the stroke** relative to the spec in the small raster
   (the handoff's `stroke-width 8` in a 240 viewBox is fine large, but bump the
   effective weight ~10–15% at 16px so outlines don't thin to invisibility).

Decision: full SVG favicon for the modern path; a simplified
fan-silhouette-plus-centre-pip raster for the legacy/small path. The fan
outline is the non-negotiable recognition anchor; the face is best-effort.

---

## 6. PWA tile (Option 3 `LogoTile`, 192 & 512)

- Source: **Option 3 `LogoTile`** from the handoff prototype (logos.jsx:103) —
  the **inverted** mark: a solid ink-green rounded tile (`rx 46` in a 220
  viewBox) with two cream cards (a back card tilted +20°, a front 10♠ card
  tilted −8°), cream fill + ink stroke, large centre ♠ pip. This is the
  home-screen icon, distinct from the header/favicon outline mark by design
  (AC4).
- **Always the light/canonical colourway**, hardcoded hex — like the favicon,
  the OS renders the home-screen icon outside the app, so it cannot be
  theme-driven. Ink tile `#206848`, cream cards `#F0EADD`.
- **Sizes: 192×192 and 512×512** PNG (minimum required), generated from the
  `LogoTile` SVG at 220→target scale. Recommend also a **512 maskable** variant:
  the ink tile already fills the full 220 square with `rx 46` rounding, so for
  `purpose: "maskable"` ensure the meaningful content (the two cards) sits inside
  the ~80% safe zone — the cards in the prototype are inset from the tile edges,
  so they survive a maskable circle/squircle crop. Provide both
  `purpose: "any"` and `purpose: "maskable"` entries.
- **Web app manifest** (`manifest.webmanifest`, linked from `index.html`):
  `name: "Toepify"`, `short_name: "Toepify"`, `theme_color: "#206848"`,
  `background_color: "#F0EADD"`, `display: "standalone"`, icons referencing the
  192/512 PNGs. Served same-origin from the Express/Railway origin (AC9 —
  offline-safe).

### Small-size note for the tile

At 192px+ the tile face is fully legible — no simplification needed. The tile is
never shown below ~120px (Android adaptive-icon minimum), so the corner index
survives. Keep the full face including the back card and corner index.

---

## 7. Fredoka usage

### Weights & where

| Weight | Where | Element |
|---|---|---|
| **Fredoka 700** | icon SVG | corner-index rank "10"; the `LogoTile` ranks |
| **Fredoka 600** | wordmark | "toepify" (header `<h1>`, hero, lockup) |

Georgia/serif (system) carries the ♠ suit glyphs (corner suit + centre pip) —
the deliberate two-typeface split. Do **not** self-host a serif; the spade is
robust across system serifs (Georgia → Times New Roman → generic serif). Keep
the fallback stack `Georgia, 'Times New Roman', serif` exactly as the handoff
specifies. (Edge case acknowledged: on a platform with no Georgia, the generic
serif still renders a recognisable ♠ — verified-acceptable per handoff.)

### Self-hosting (AC: AC6/AC7/AC9, locked)

- Self-host **Fredoka woff2, Latin subset, weights 600 and 700 only**, in
  `client/public/fonts/` (or a Vite-imported asset path), served same-origin.
  No `fonts.googleapis.com` / `fonts.gstatic.com` request at runtime.
- `@font-face` per weight with **`font-display: swap`** and explicit
  `font-weight: 600` / `700`, `font-family: "Fredoka"`. Declare these alongside
  the existing global styles (a new `@font-face` block, e.g. top of
  `index.css`, NOT the `@import` URL pattern currently in tp-scoreboard.css:1 —
  that Google CDN import is the anti-pattern this feature exists to avoid; this
  feature does not need to remove it, but must not add a sibling).

### Fallback stack & FOUT/reflow mitigation

- **Wordmark fallback stack:** `"Fredoka", system-ui, sans-serif`. During swap,
  "toepify" briefly renders in system-ui. To avoid jarring reflow in the lockup:
  - Set the wordmark in a flex row with `align-items: center` so a metrics
    difference shifts text vertically by sub-pixels, not the icon.
  - Apply `letter-spacing: -0.01em` and `line-height: 1` to **both** the loaded
    and fallback state (they're on the element, not the font) so width jitter is
    bounded. Optionally set a `size-adjust` / `ascent-override` on the
    `@font-face` to metric-match system-ui and eliminate the reflow entirely —
    recommended but not required.
- **Icon rank "10" FOUT:** the SVG `<text>` rank renders in the fallback
  sans during swap. Because it's `text-anchor="middle"` centred at `x=100`,
  `y=85`, a metrics swap keeps it **centred in the corner** — it won't drift out
  of the card. Verify (edge case): once Fredoka 700 swaps in, the "10" stays
  inside the top-left corner and doesn't overrun the card border. The centred
  anchor makes this safe by construction; flag for visual QA at swap moment.
- `font-display: swap` (not `optional`/`block`) is locked by AC6 — text is
  always visible, swapping to Fredoka when ready; correct for a brand wordmark
  where the brand face matters more than zero-FOUT.

---

## 8. States & accessibility

### Component structure (AC8/AC10)

- Logo lives in its own file(s) exporting **only components** (eslint
  `react-refresh/only-export-components`): e.g. `LogoMark` (the inline-SVG
  fanned deck), `LogoTile` (Option 3, for icon generation), `Wordmark`, and a
  `LogoLockup` composing mark + wordmark. Any theme constants/types go in a
  separate `.ts` (the project convention from CLAUDE.md). Reused across header,
  hero, and favicon/app-icon generation — never duplicated inline.
- Props: `size` (height in px) and `rank` (default `"10"`, override allowed but
  only `"10"` ships). No `spread`/`sw` knobs (out of scope).

### Accessibility

- **`aria-label`**: the icon SVG carries `role="img"` and a label. In the
  **lockup** (header + hero) where the wordmark text "toepify" is already
  present and read by screen readers, mark the **decorative icon
  `aria-hidden="true"`** to avoid the SR announcing "Toepify deck, toepify"
  (double brand). In the **favicon/standalone icon** with no adjacent text,
  keep `role="img" aria-label="Toepify"`.
- **Header link is clickable** — it wraps in `<Link to="/" className="header-link">`
  (App.tsx:142). Per the project gotcha (`<button>`/links need explicit
  cursor on desktop), ensure the link shows **`cursor: pointer`**; it's an
  `<a>` so it gets it by default, but verify the SVG child doesn't intercept
  with a different cursor. The whole lockup (icon + wordmark) is one click
  target to "/".
- **Contrast, both palettes:**
  - Light: ink `#1f6b4a` on cream `#F0EADD` ≈ 4.8:1 (linework, comfortable);
    wordmark green on page bg `#ece5d6` ≈ 4.6:1 (passes AA large text).
  - Dark: covered in section 2 — green `#43c9a8` wordmark on `#07181c` ≈ 8.5:1.
- **Reduced motion:** any hero entrance animation gated behind
  `prefers-reduced-motion: reduce` (app already honours it).

### Playwright regression (AC11)

- No spec depends on the old four-10s asset. If a spec selects `.header-icon`,
  **keep a `.header-icon` class hook** on the new mark's wrapper so the selector
  still resolves. The CLAUDE.md-listed label hooks (`.scoreboard`,
  `.penalty-btn`, etc.) are untouched by this feature.

---

## Considered and rejected

- **Nudge `--accent` from `#1f6b4a` to `#206848` to match handoff ink** —
  rejected: ΔE≈2 is invisible, but `--accent` drives the whole app; a global
  token change for an imperceptible logo gain is disproportionate blast radius.
- **Reuse `--surface` as the paper colour** — rejected: `--surface #fbf7ee` is
  too light, collapses the cards into the page bg/glow, and semantically couples
  brand paper to app surface. A dedicated `--logo-paper` is cheap and correct.
- **Dark mode: ink inherits `var(--accent)`** — rejected: `.pal-petrol`'s accent
  is coral `#f47b5c`; the logo would render in the out-of-scope red colourway
  and clash with the green brand.
- **Dark mode: invert paper to a dark fill, light ink** — rejected: turns the
  mark into a dark-card silhouette structurally different from the light mark
  (cards stop reading as cream playing cards); the chosen cream-card +
  green-ink keeps it recognisably the same logo across themes.
- **Dark mode: a second hand-authored dark SVG asset** — rejected (per feature
  request): two divergent copies drift; one token-driven component overriding
  `--logo-ink`/`--logo-paper` under `.pal-petrol` is preferred.
- **Wordmark baked into the SVG** — rejected: loses semantic `<h1>`,
  selectable/translatable text, and the existing `staging-label` span; only the
  icon's *rank* is SVG (it's geometry, not content).
- **Favicon as the full lockup (icon + wordmark)** — rejected (per user story):
  illegible at tab size; favicon is icon-only.
- **Favicon driven by CSS theme tokens** — rejected: browser chrome can't read
  app `:root` vars; favicon hardcodes the light colourway by necessity.
- **Theme-driven PWA tile** — rejected: OS renders the home-screen icon outside
  the app; the tile hardcodes the canonical Option-3 colourway.
- **`font-display: optional` / `block` for Fredoka** — rejected: AC6 locks
  `swap`; for a brand wordmark, showing the brand face when ready beats avoiding
  a brief fallback frame.
- **Self-hosting a serif for the ♠ pips** — rejected: system serifs render a
  recognisable spade; the handoff's `Georgia, 'Times New Roman', serif` stack is
  sufficient and avoids an extra font payload.
