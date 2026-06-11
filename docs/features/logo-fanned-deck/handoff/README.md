# Handoff: Toepify Logo — Option 1 (Corrected Fanned Deck)

## Overview
**Toepify** is a lightweight score-keeping app for the Dutch card game *toepen*, shared between a small group of friends. This package documents **Option 1** of its logo system: a three-card fanned deck with a wordmark. Your task is to implement this logo (icon mark + wordmark lockup) in the target codebase.

The mark is **pure vector** — no raster assets. It is built entirely from SVG primitives (rounded rectangles + text), so it scales crisply to any size and can be re-tinted via a small theme object.

## About the Design Files
The files in this bundle are **design references created in HTML/React+SVG** — a prototype showing the intended look, proportions, and construction, **not** production code to copy verbatim. Recreate this mark in the target codebase using its established patterns (a React/Vue SVG component, a SwiftUI `Shape`/`Path`, a static `.svg` asset, etc.). If no environment exists yet, render it as a plain inline SVG component in whatever framework the project adopts.

The geometry below is exact and authoritative — match the numbers and you will reproduce the mark pixel-for-pixel at any scale.

## Fidelity
**High-fidelity.** Final colors, proportions, typography, and geometry. Reproduce exactly. Every coordinate in this document is given in the icon's own **240 × 250 viewBox** coordinate space; scale uniformly to your target render size.

---

## The Mark

### Anatomy
Option 1 is a **fan of three identical playing cards**:
- Two **back cards**, rotated symmetrically (±17°) about a low pivot point, so they splay like a held hand.
- One **front card**, upright (0°), carrying a real card face: a **"10" corner index** (rank over a small spade) in the top-left, plus a **large centre spade pip**.

All three cards are the **same size** and use **true playing-card proportion (5 : 7)**. The front card's face is what makes the mark read instantly as "a deck of cards / 10 of spades."

> Design history note: this corrected an earlier mark whose cards were mismatched in size and whose front "card" showed only a floating horizontal line instead of a real face. Keep all three cards identical and keep the front face (index + pip).

### Geometry — exact values (icon viewBox `0 0 240 250`)

**SVG root**
- `viewBox="0 0 240 250"`, `role="img"`, `aria-label="Toepify deck"`
- Render width = your chosen `size`; height = `size × 250 / 240` (preserve aspect ratio).

**Each card** is a rounded rectangle:
- width `w = 96`, height `h = 134`  → 5:7 proportion
- corner radius `rx = ry = 12`
- fill = paper color `#F0EADD`
- stroke = ink color `#206848`, `stroke-width = 8`, `stroke-linejoin = round`
- The rect is centred on `(cx, cy)`: `x = cx − 48`, `y = cy − 67`.

**Card positions & rotation** (all share centre `cx = 120, cy = 120`):
| Card | Rotation | Rotation pivot | Notes |
|------|----------|----------------|-------|
| Back-left  | **−17°** | `(120, 205)` | pivot is low/below centre, so the card swings out at the top |
| Back-right | **+17°** | `(120, 205)` | mirror of back-left |
| Front      | **0°**   | — | upright, carries the face |

The low pivot `(120, 205)` is the key to the "held fan" look: rotating about a point below the cards fans their tops apart while keeping their bottoms tucked together.

**Front card face** (drawn on the upright card):
- **Corner index** — centred at `x = 100`:
  - Rank text "10": `y = 85`, `font-size = 31.7px` (= 26 × 1.22), `font-weight = 700`, **Fredoka**, `text-anchor = middle`, fill = ink.
  - Suit "♠" below it: `y = 85 + (31.7 × 0.82) ≈ 111`, `font-size = 22px`, **Georgia / serif**, `text-anchor = middle`, fill = ink.
- **Centre pip** — large "♠": `x = 120`, `y = 156`, `font-size = 66px`, **Georgia / serif**, `text-anchor = middle`, fill = ink.

> The rank uses the **rounded-sans (Fredoka)** brand face; the **suit glyphs** deliberately use a **serif (Georgia)** because serif spades/clubs read more like real playing-card pips. Keep this two-typeface split.

### Reference React/SVG source (from the prototype)
```jsx
// size → render size in px. Colors come from a theme: ink #206848 on paper #F0EADD.
function LogoFannedDeck({ size = 200, ink = '#206848', paper = '#F0EADD', rank = '10' }) {
  const sw = 8;            // card stroke width
  const back = 17;         // back-card splay angle (degrees)
  const Card = ({ rot, pivot, children }) => (
    <g transform={`rotate(${rot} ${pivot ? pivot[0] : 120} ${pivot ? pivot[1] : 120})`}>
      <rect x={120 - 48} y={120 - 67} width={96} height={134} rx={12} ry={12}
            fill={paper} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
      {children}
    </g>
  );
  return (
    <svg viewBox="0 0 240 250" width={size} height={size * 250 / 240}
         role="img" aria-label="Toepify deck">
      <Card rot={-back} pivot={[120, 205]} />
      <Card rot={back}  pivot={[120, 205]} />
      <Card rot={0}>
        {/* corner index */}
        <text x={100} y={85} fontSize={31.7} fontWeight="700" textAnchor="middle"
              fontFamily="Fredoka, sans-serif" fill={ink}>10</text>
        <text x={100} y={111} fontSize={22} textAnchor="middle"
              fontFamily="Georgia, 'Times New Roman', serif" fill={ink}>♠</text>
        {/* centre pip */}
        <text x={120} y={156} fontSize={66} textAnchor="middle"
              fontFamily="Georgia, 'Times New Roman', serif" fill={ink}>♠</text>
      </Card>
    </svg>
  );
}
```

---

## Wordmark
- Text: **`toepify`** (all lowercase).
- Font: **Fredoka**, weight **600** (SemiBold).
- `letter-spacing: -0.01em`, `line-height: 1`.
- Color: ink `#206848`.
- Size: set by context. In the standard lockup, wordmark `font-size ≈ 0.65 × icon height` (e.g. icon 132px tall → wordmark ~86px). It is not locked to a fixed ratio — match optically.

## Lockup (icon + wordmark)
- Horizontal: `display: flex; align-items: center;`
- Gap between icon and wordmark: **~26px** at icon size ~132px (scale the gap with the mark; roughly `0.2 × icon size`).
- Icon on the left, wordmark on the right.
- Both elements share the ink color.

## Variants you should support
The mark is theme-driven in the prototype. At minimum expose:
- **Color theme**: `ink` (default `#206848`) and `paper` (default `#F0EADD`). Setting `ink === paper`'s contrast must stay legible; the suit pips and linework all use `ink`.
- **rank** prop (default `"10"`) — the rank shown on the front card. *Toepen*'s actual high card is the Jack (Boer); the brand uses **10♠** to match the original mark. Keep `"10"` as default but allow override.

(The full prototype also has "linework" weight and "fan energy" spread multipliers — optional. If you want them: multiply `stroke-width` by a `sw` factor and corner `radius` directly; multiply the `17°` back angle by a `spread` factor.)

---

## Design Tokens
| Token | Value | Use |
|-------|-------|-----|
| `--ink` | `#206848` | linework, suit pips, rank, wordmark (deep casino green) |
| `--paper` | `#F0EADD` | card faces (warm cream) |
| `--accent` | `#C0392B` | muted playing-card red — **not used in Option 1** (only in multi-suit variants), listed for system completeness |
| Card stroke width | `8` (in 240-unit viewBox) | card outline |
| Card corner radius | `12` (in 240-unit viewBox) | card corners |
| Card proportion | `96 × 134` (≈ 5:7) | every card |
| Back-card splay | `±17°` about pivot `(120, 205)` | the fan |
| Rank font | **Fredoka** 700 | corner index rank |
| Suit font | **Georgia / serif** | corner suit + centre pip |
| Wordmark font | **Fredoka** 600, `-0.01em` | "toepify" |

### Fonts
- **Fredoka** — Google Fonts (`https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700`). Used for the rank and the wordmark. This heavy rounded geometric sans is core to the brand; match it (or its nearest available equivalent in your stack).
- **Georgia** — system serif, used only for the suit glyphs (♠). Any robust serif renders the spade acceptably.

## Assets
None to import — the entire mark is inline SVG (rounded rects + Unicode suit glyphs `♠`). No image files, no icon libraries. The only external dependency is the **Fredoka** webfont.

## Files in this bundle
- `Option 1 Reference.html` — standalone, self-contained page that renders Option 1 (icon, wordmark, lockup, and small-size test) at the exact spec. Open it in a browser to see the target. Theme controls are removed for clarity.
- `logos.jsx` — the original prototype source. `LogoFannedDeck` is Option 1; `Card`, `CornerIndex`, `Wordmark`, and `Lockup` are its building blocks. (Also contains the other options for reference; ignore them.)
- This `README.md`.

## Acceptance checklist
- [ ] Three identical cards, true 5:7 proportion, cream fill + green outline.
- [ ] Back cards splayed ±17° from a low pivot (tops apart, bottoms together).
- [ ] Front card upright with a **10♠ corner index** (rank in Fredoka, suit in serif) fully inside the top-left corner — not touching the border.
- [ ] Large serif **♠** pip centred on the front card.
- [ ] Wordmark "toepify" in Fredoka 600, ink green, optically matched to the icon height.
- [ ] Mark stays crisp at favicon size (~24px) through hero size — it's vector, so verify the corner index is still legible small.
