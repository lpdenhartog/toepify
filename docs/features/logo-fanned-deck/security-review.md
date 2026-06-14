# Security review — Brand logo (fanned deck, Option 1)

**Reviewer:** security-reviewer (consolidated STRIDE + design + code scan)
**Date:** 2026-06-11
**Scope:** frontend-only brand assets — inline-SVG logo components, CSS token
changes, extended Google Fonts `@import` (adds Fredoka), `favicon.svg`,
`manifest.webmanifest`, committed PWA PNGs, `index.html` meta, and a dev-only
icon-generator script. No backend, API, data-model, or auth changes.

**Verdict: PASS** (no Critical/High findings; one pre-existing systemic
observation noted for future hardening).

---

## Threat model reference

Canonical cumulative model: [`docs/threat-model.md`](../../threat-model.md).

**What changed this cycle:** the threat model was created (first feature to run
this review). This feature adds one new trust boundary — the Google Fonts CDN
(`fonts.googleapis.com`) reached via CSS `@import` (B4) — and a small static
public-asset surface (favicon, manifest, three PNG icons). All new threats land
as **Accepted** (stakeholder-decided font CDN trade-off) or **Mitigated**
(`display=swap` fallback, same-origin serving, no attacker-controlled input).
The one **Open** item is pre-existing and not introduced here: the app ships no
Content-Security-Policy.

### STRIDE summary (this feature)

| Category | Threat | Component | Mitigation | Status |
|----------|--------|-----------|------------|--------|
| Spoofing | PWA manifest scope/redirect hijack | manifest.webmanifest | `start_url:"/"`, no off-origin scope, relative same-origin icons | Mitigated |
| Tampering (XSS) | SVG `<text rank>` markup injection | LogoMark/LogoTile | `rank` never user-controlled (only "10" ships); React escapes children | Mitigated |
| Tampering | Build-time code exec via icon script | generate-icons.mjs | Dev-only, not in build/CI, no remote fetch | Mitigated |
| Info disclosure | IP/UA/Referer leak to Google on load | font `@import` | Stakeholder-accepted (A1/A4); pre-existing for other fonts | Accepted |
| DoS | Google Fonts CDN down blocks webfont | font `@import` | `display=swap` system fallback; SVG/CSS render offline (AC9) | Mitigated |
| EoP | Missing app-wide CSP / security headers | whole app | None today (pre-existing) | Open |

---

## Findings

No Critical, High, or Medium findings. No findings at or above the confidence
threshold (80) that are introduced by this feature. The per-area assessment
below records what was checked and why each area is clear.

### Third-party `@import` (Fredoka via Google Fonts) — clear

`client/src/styles/tp-scoreboard.css:1` extends the existing
`fonts.googleapis.com/css2` `@import` with `&family=Fredoka:wght@600;700`,
keeping `display=swap`.

- **Privacy/IP leak:** every page load issues a request to Google carrying the
  client IP, User-Agent, and Referer. This is a real information-disclosure
  channel, but it is **stakeholder-accepted** (Addendum A1/A4) and **pre-existing**
  — Space Grotesk and Hanken Grotesk already load from the same origin. Fredoka
  does not widen the channel beyond one more `family=` parameter. Per the review
  brief, this is noted, not re-litigated. Recorded in the threat model as
  Accepted, with full CDN removal logged as A4 follow-up tech-debt.
- **Supply chain / availability:** `display=swap` means a slow or down CDN does
  not block render — the system-stack fallback shows and the inline-SVG mark is
  fully self-contained (AC9). No runtime hard dependency. Mitigated.
- **SRI gap:** `@import`-loaded stylesheets cannot carry a Subresource Integrity
  hash, so a compromised Google Fonts CDN could serve altered font CSS. Blast
  radius is limited to font payloads (no script execution from a stylesheet
  `@import`), so the impact is visual only. Below the reporting threshold as a
  finding; recorded as Accepted/low-impact in the threat model.

### CSP / security headers — pre-existing systemic gap (Note, not a finding)

The Express server (`server/src/index.ts:55`) serves the SPA via
`express.static` + a catch-all `index.html` with **no security-header
middleware** (no `helmet`, no `Content-Security-Policy`, `X-Frame-Options`,
`X-Content-Type-Options`, or `Referrer-Policy`). This is **not introduced by
this feature** and applies to the whole app, so it is not a finding against this
change. It is relevant context: when a CSP is eventually added, this feature's
two new behaviours will each need an allowance — `style-src`/`font-src` for
`fonts.googleapis.com` + `fonts.gstatic.com`, and inline `<svg>` (covered by
default `img-src`/`style-src 'self'`; inline SVG in the DOM is not affected by
`script-src`). A `Referrer-Policy: strict-origin-when-cross-origin` header would
also trim the Referer leaked to Google. Captured in the threat model as **Open**
for future hardening. See Notes.

### SVG injection / XSS — clear

- `LogoMark.tsx` and `LogoTile.tsx` render `rank` as a JSX `<text>` child.
  React escapes text children, so even a hostile `rank` could not break out into
  markup. More importantly, `rank` is **never wired to user input**: both call
  sites (`App.tsx:189` `<LogoMark size={36} decorative … />` and
  `LandingPage.tsx:89` `<LogoLockup iconSize={88} … />`) pass no `rank`, so the
  hardcoded `DEFAULT_RANK = "10"` is the only value that ships. The out-of-scope
  override capability is inert.
- No `dangerouslySetInnerHTML` / `innerHTML` anywhere in `client/src` (verified
  by grep — zero matches).
- `client/public/favicon.svg` is a fully static file with literal hex and a
  literal "10" — no templating, no dynamic injection.

### Web manifest & PWA meta — clear

`client/public/manifest.webmanifest`: `start_url:"/"` (origin root, no
redirect), no `scope` override (defaults to the manifest location = origin
root, so no off-origin scope hijack), all three `icons[].src` are root-relative
same-origin paths (`/icons/*.png`). `theme_color`/`background_color` are static
hex. No open-redirect or scope-escalation vector. `index.html` additions are
inert meta tags + a same-origin `apple-touch-icon`. Clear.

### Icon-generator script — clear (dev-only, safe)

`scripts/generate-icons.mjs`: launches Playwright Chromium, builds the tile SVG
from **local string templates with hardcoded hex** (no remote fetch, no network
input, no `eval`, no shell-out), `setContent` + `screenshot` to local files
under `client/public/icons/`. It is **not referenced by `package.json` build or
CI** (confirmed against implementation notes; run manually via
`node scripts/generate-icons.mjs`). The PNGs it produces are committed static
artifacts (A3). No build-time untrusted-code path. Clear.

### Static asset serving — clear

New assets are served by the existing `express.static(clientDist)`
(`server/src/index.ts:55`). Express's static handler normalizes and rejects
path-traversal sequences; the feature adds only fixed, public, bounded files
(small SVG/JSON + three PNGs ≤ ~27 KB). No new route, no input handling, no
extension/MIME concern beyond what `express.static` already covers. Clear.

---

## Notes (low-confidence / future hardening — non-blocking)

- **[confidence: ~70] No Content-Security-Policy on the Express server.**
  Systemic, pre-existing, app-wide; not caused by this feature, so reported as a
  note rather than a finding. Adding `helmet` with a CSP that allows
  `style-src 'self' fonts.googleapis.com`, `font-src 'self' fonts.gstatic.com`,
  and `img-src 'self' data:` would give XSS a second line of defense and make
  the font-CDN dependency explicit. Worth a dedicated hardening ticket.
- **[confidence: ~60] Referer leakage to Google Fonts.** A
  `Referrer-Policy: strict-origin-when-cross-origin` (or stricter) response
  header would reduce what leaks to `fonts.googleapis.com`/`gstatic.com` on each
  font request. Pairs naturally with the CSP ticket and the A4 "remove Google
  Fonts CDN entirely" follow-up.
- **No SRI on the font `@import`** — inherent to `@import`-loaded stylesheets,
  not fixable without self-hosting (the A4 follow-up). Visual-only blast radius;
  noted for completeness.

---

## Regression test hints

No Critical/High findings, so no security-regression tests are required for QA.
One optional guard-rail, if cheap to add alongside the functional Playwright
specs already planned in technical-spec §12:

- **(optional, defense-in-depth)** Assert the shipped header/hero/favicon render
  the literal rank "10" only and that `LogoMark`/`LogoTile` are never invoked
  with a `rank` derived from a URL param or fetched data — i.e. encode the
  "rank is build-time constant" invariant so a future change that wires user
  input into `rank` is caught. Low priority; the React-escaping + no-call-site
  facts already make this safe by construction.

---

## Verdict

**PASS.** This is a self-contained, frontend-only brand-asset feature with no
backend, API, data-model, or auth surface. The inline-SVG `rank` XSS vector is
closed by construction (no attacker-controlled input + React escaping); the
manifest, meta, favicon, and static serving are clean; and the icon-generator
script is dev-only and safe. The Google Fonts `@import` privacy/availability
trade-off is stakeholder-accepted and mitigated by `display=swap`. The only
open item — the app-wide absence of a CSP — is pre-existing, out of scope for
this change, and captured in `docs/threat-model.md` for future hardening.
