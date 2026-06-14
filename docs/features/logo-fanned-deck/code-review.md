# Code review — Brand logo (fanned deck, Option 1)

Reviewer: tech-lead · Scope: `client/src/components/logo/`, `client/public/`,
`scripts/generate-icons.mjs`, `client/index.html`, modified `App.tsx`,
`LandingPage.tsx`, `index.css`, `tp-scoreboard.css`, deleted `header-icon.svg`.

## Summary

This is a clean, faithful implementation that tracks the technical spec almost
line-for-line. Every load-bearing contract holds: the prop interfaces of
`LogoMark`/`LogoTile`/`LogoLockup` match §3 exactly, all geometry constants are
the authoritative handoff numbers, the CSS token names and values are correct
including the critical `.pal-petrol` coral-trap override (`--logo-ink: #43c9a8`,
not `var(--accent)` coral), and the `@import` URL is extended with
`Fredoka:wght@600;700` while preserving `display=swap` and the existing Space/
Hanken families. Accessibility is handled correctly — the header and hero icons
are `decorative` (`aria-hidden`) so the `<h1>`/wordmark carry the SR name and
there is no double-announce, while the standalone favicon and `LogoTile` get
`role="img"` + label. The `header-icon` Playwright hook is preserved on the new
inline `<svg>`, the deleted `header-icon.svg` is fully unreferenced, and
`generate-icons.mjs` is not wired into `package.json` build/CI per Addendum A3.

The build and lint claims check out. The only structural concern is geometry
duplication between `LogoTile.tsx` and `generate-icons.mjs` (they hand-maintain
the same numbers independently). That is a maintainability nit, not a defect,
and the spec itself accepts the LogoTile-as-reference model. No must-fix issues.

## Verification of developer claims

- **Build passes**: confirmed plausible — all new `.tsx`/`.ts` are
  type-correct, imports resolve, no syntax issues. `LogoTile.tsx` is not
  imported anywhere in app code, so Vite tree-shakes it out of the bundle
  (tsc still type-checks it). No build-breaking references to the deleted
  `header-icon.svg` remain.
- **Pre-existing lint error is genuinely pre-existing**: confirmed. The
  `react-hooks/set-state-in-effect` error is `App.tsx:155-157`
  (`useEffect(() => { setMode("viewer"); }, [tournamentId])`). This effect is
  unrelated to the logo feature — the feature's only `App.tsx` change is the
  `headerIcon`→`LogoMark` import swap and the header JSX. The new logo files
  introduce no `setState`-in-effect pattern. Not attributable to this change.
- **Script not wired into build**: confirmed. `package.json` `build` is
  `npm run build -w client && npm run build -w server`; no reference to
  `generate-icons.mjs` anywhere except docs and the bash audit log (manual run).
- **`import { chromium } from "playwright"` resolves**: confirmed. `package-lock`
  shows `@playwright/test@1.58.2` depends on `playwright@1.58.2` (lines 989,
  4047), so the bare `playwright` import is satisfiable. No new devDependency.
- **PNGs committed and non-empty**: confirmed — all three exist under
  `client/public/icons/`.
- **Favicon geometry in sync with LogoMark**: confirmed identical — rect
  `x=72 y=53 w=96 h=134 rx=12 sw=8`, `rotate(±17 120 205)`, rank/suit/pip text
  at the exact `logo.constants.ts` coordinates, hardcoded `#206848`/`#F0EADD`.

## Issues

### Must-fix

None.

### Should-fix

- **Geometry duplicated between `LogoTile.tsx` and `generate-icons.mjs`**
  `[confidence: 85]`. The script (`scripts/generate-icons.mjs:19-44`) re-implements
  the tile geometry as hand-written SVG strings (card 116×164, `cx132 cy96 +20`,
  `cx92 cy122 -8`, corner index `x63 y86`, `RANK_SIZE = 26*1.3`, pip `x92 y168
  fontSize 80`) rather than importing from `LogoTile.tsx` or sharing constants.
  The committed PNGs were rendered from the *script's* copy, while `LogoTile.tsx`
  is the documented "source." If anyone edits the tile geometry in one place and
  regenerates, the two silently diverge. The spec (§3.3) accepts LogoTile as a
  reference component, but neither side reads from a shared constant the way the
  in-app mark does (`logo.constants.ts`). Suggest either: (a) add tile geometry
  to `logo.constants.ts` and have both `LogoTile.tsx` and the script import it,
  or (b) at minimum add a comment in both files pointing at each other as the
  sync obligation. Low blast radius (icons rarely change), hence should-fix not
  must-fix.

### Nit

- **`LogoTile.tsx` is dead code from the bundle's perspective** `[confidence: 90]`.
  It is never imported by app code (only the throwaway script mirrors it), so it
  contributes nothing to the running app and exists purely as a reference
  artifact. This is an explicit spec decision (§3.3: "rendered only for PNG
  generation, never mounted"), so it is intentional, not a bug. Flagging only so
  a future reader doesn't mistake it for a wired component and so it's a
  candidate for the geometry-consolidation in the should-fix above. No action
  required if the team is comfortable keeping a reference component in `src/`.

## Low-confidence observations

- **`@import` at top of `tp-scoreboard.css` blocks render until the font CSS
  resolves** `[confidence: 60]`. This is unchanged behaviour (the import already
  existed for Space/Hanken Grotesk; Fredoka just joins it) and `display=swap`
  mitigates FOUT, so it is not introduced by this change. Noted only for
  completeness — out of scope, the Google-Fonts-CDN tech-debt is already logged
  in the implementation notes.
- **Maskable icon is the same render as `icon-512`** `[confidence: 55]`. The spec
  (§8.3) accepts this because the ink tile fills the full square and the cards
  sit inside the ~80% safe zone. Worth a visual check at the QA phase on a real
  Android home screen, but the reasoning is sound and the contract permits it.

## Praise

- The `.pal-petrol` coral-trap is handled exactly right — `--logo-ink: #43c9a8`
  hardcoded in the dark palette, never inheriting `var(--accent)` coral. This was
  the single highest-risk detail in the spec and it is correct.
- Accessibility split is textbook: decorative icons in lockups where text names
  the brand, `role="img"` + label only on the standalone favicon/tile. Avoids the
  SR double-announce the spec warned about.
- Clean separation of constants (`logo.constants.ts`) from components per the
  `react-refresh/only-export-components` rule — `.tsx` files export only
  components, every shared number lives in the `.ts`.
- The favicon was authored as a literal serialization of `LogoMark` output with
  hex substituted, keeping it byte-for-byte consistent with the in-app mark's
  geometry, with a sync comment in the file.
- Developer's verification section is honest and precise — including the
  stash-and-re-lint proof that the lint error pre-exists. That made review faster.

## Verdict

**PASS.** Zero must-fix issues. One should-fix (geometry duplication between
`LogoTile.tsx` and the icon script) and one nit, both maintainability concerns
with low blast radius — neither blocks merge. The implementation matches the
spec contract on component structure, prop interfaces, geometry constants, CSS
token names/values, the coral-trap override, accessibility, and the
non-wired-script requirement. Recommend addressing the should-fix opportunistically
the next time the tile geometry is touched.
