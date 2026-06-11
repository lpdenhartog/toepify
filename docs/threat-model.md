# Threat Model

Last updated: 2026-06-11 — Brand logo (fanned deck, Option 1)

This is the cumulative, living threat model for Toepify. Each feature review
extends it. Rows are never deleted; superseded threats are marked Resolved with
a date. The canonical model lives here; per-feature STRIDE snapshots also appear
in each feature's `security-review.md`.

## Trust boundaries

```
Player browser  ──HTTP/WebSocket──►  Express + Socket.IO (Railway)  ──►  PostgreSQL
       │                                      │
       │                                      ├─ serves client/dist static assets
       │                                      │  (favicon.svg, manifest.webmanifest,
       │                                      │   /icons/*.png, JS/CSS bundles)
       │
       └──CSS @import──►  fonts.googleapis.com (third-party CDN, font CSS + woff2)
```

- **B1 user ↔ frontend**: untrusted client. All input from here is untrusted.
- **B2 frontend ↔ API**: JWT (24h) for user actions; possession of the secret
  UUIDv4 `tournamentId` grants tournament access (capability URL, ADR 002).
- **B3 API ↔ database**: parameterized queries (assumed from prior reviews).
- **B4 frontend ↔ Google Fonts CDN**: third-party request initiated by CSS
  `@import` at runtime. Leaks client IP + User-Agent + Referer to Google.
  Stakeholder-accepted (Addendum A1/A4). Availability dependency on a CDN.

## STRIDE analysis

| Category | Threat | Applies to | Mitigation | Status |
|----------|--------|------------|------------|--------|
| Spoofing | Capability URL (`tournamentId`) shared/leaked grants access | B2 tournament access | Secret UUIDv4, not enumerable; HTTPS in transit (ADR 002) | Accepted |
| Tampering | Static brand assets (favicon/manifest/PNG) modified in transit | B1, brand assets | Served same-origin over HTTPS (Railway TLS) | Mitigated |
| Tampering | Third-party font CSS/woff2 altered or swapped by a compromised Google Fonts CDN | B4 | None — no SRI possible on `@import`-loaded stylesheets; font payload is not script, so blast radius is visual only | Accepted (low impact) |
| Repudiation | Brand-asset feature performs no state changes | n/a | No new actions to attribute | n/a |
| Information disclosure | Client IP / UA / Referer leaked to Google on every load via font `@import` | B4 | Stakeholder accepted self-hosting trade-off (A1/A4); pre-existing for Space/Hanken Grotesk, Fredoka joins it | Accepted |
| Information disclosure | SVG/manifest expose only public brand geometry; no PII/secrets | brand assets | Static public content by design | Mitigated |
| Denial of service | Google Fonts CDN unavailable blocks webfont | B4 | `display=swap`: system-stack fallback renders; mark is inline SVG + CSS, no runtime asset dependency (AC9) | Mitigated |
| Denial of service | Static PNG/SVG/manifest are bounded, cacheable files | static serving | `express.static`, small fixed-size files | Mitigated |
| Elevation of privilege | Brand feature adds no auth/role surface | n/a | No backend, API, auth, or data-model change | n/a |
| Tampering (XSS) | Inline-SVG `<text rank>` could inject markup if `rank` were attacker-controlled | LogoMark/LogoTile | `rank` never receives user input — only the hardcoded default "10" ships; React escapes `<text>` children regardless | Mitigated |
| Elevation of privilege | App-wide absence of Content-Security-Policy / security headers (helmet) — any future or existing XSS has no second line of defense; new `@import` + inline SVG would each need CSP allowances if a policy is later added | B1, whole app | None today (pre-existing systemic gap; not introduced by this feature) | Open |
| Spoofing/redirect | PWA manifest `start_url`/`scope` open-redirect or off-origin scope hijack | manifest.webmanifest | `start_url: "/"`, no `scope` override (defaults to manifest dir = origin root); all icon paths same-origin relative | Mitigated |
| Tampering | Throwaway icon-generator runs untrusted code at build/CI time | scripts/generate-icons.mjs | Dev-only, not wired into `package.json` build or CI; no remote fetch; static string templating only | Mitigated |

## Attack surface inventory

- **HTTP/WebSocket API** (unchanged by this feature): tournament/game mutation
  endpoints; `/__test__/reset` (NODE_ENV=test only).
- **Static assets** (this feature adds): `/favicon.svg`, `/manifest.webmanifest`,
  `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/icon-maskable-512.png` —
  all public, static, same-origin, no input handling.
- **Third-party integration**: `fonts.googleapis.com` via CSS `@import` (now
  also requests Fredoka 600/700 alongside the pre-existing Space/Hanken Grotesk).
- **Build tooling**: `scripts/generate-icons.mjs` — manual, dev-only, not in CI.

## History

- 2026-06-11 Brand logo (fanned deck): Initial threat model created. Added the
  Google Fonts CDN trust boundary (B4) and its information-disclosure /
  availability threats (both Accepted/Mitigated via `display=swap` + stakeholder
  decision A1/A4). Added the static brand-asset surface (favicon, manifest,
  icons) — all public, same-origin, no input. Recorded the inline-SVG `rank`
  XSS vector as Mitigated (no attacker-controlled path). Recorded the
  app-wide missing-CSP systemic gap as Open (pre-existing, surfaced by this
  feature's new `@import` and inline SVG). Confirmed the icon-generator script
  is dev-only and safe.
