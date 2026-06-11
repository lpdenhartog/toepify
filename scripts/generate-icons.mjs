// Throwaway one-off script: rasterize the Option 1 fanned-deck mark (the SAME
// mark used in the header + favicon) onto a filled rounded tile, producing the
// three committed PWA icon PNGs. NOT wired into package.json build or CI.
//
//   node scripts/generate-icons.mjs
//
// Uses the already-installed Playwright (repo-root E2E dependency). No image
// devDependency. The mark geometry mirrors client/public/favicon.svg /
// client/src/components/logo/LogoMark.tsx (viewBox 0 0 240 250).
//
// Brand consistency: the home-screen icon shows the Option 1 mark (not the
// Option 3 inverted tile) so header, favicon and app-icon are one mark. The
// tile reproduces the in-app header context: page-bg cream behind paper cards
// with green linework. Hardcoded hex — the OS renders the icon outside the app.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const INK = "#206848";     // deep casino green linework / face
const PAPER = "#F0EADD";   // card fill (matches --logo-paper)
const TILE_BG = "#ece5d6"; // tile background = app page bg (--bg) → header look

// Option 1 fanned deck, viewBox 0 0 240 250 (each card x=72 y=53 w=96 h=134).
const mark = `
  <g transform="rotate(-17 120 205)">
    <rect x="72" y="53" width="96" height="134" rx="12" ry="12"
          fill="${PAPER}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
  </g>
  <g transform="rotate(17 120 205)">
    <rect x="72" y="53" width="96" height="134" rx="12" ry="12"
          fill="${PAPER}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
  </g>
  <g>
    <rect x="72" y="53" width="96" height="134" rx="12" ry="12"
          fill="${PAPER}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <text x="100" y="85" font-size="31.7" font-weight="700" text-anchor="middle"
          font-family="Fredoka, system-ui, sans-serif" fill="${INK}">10</text>
    <text x="100" y="111" font-size="22" text-anchor="middle"
          font-family="Georgia, 'Times New Roman', serif" fill="${INK}">&#9824;</text>
    <text x="120" y="156" font-size="66" text-anchor="middle"
          font-family="Georgia, 'Times New Roman', serif" fill="${INK}">&#9824;</text>
  </g>`;

// maskable → full-bleed square (rx 0) + smaller mark inside the ~80% safe zone;
// any → rounded squircle tile with a slightly larger mark.
function tileSvg(size, { maskable }) {
  const radius = maskable ? 0 : 50;
  const scale = maskable ? 0.58 : 0.66;
  const tx = (240 - 240 * scale) / 2;
  const ty = (240 - 250 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="${size}" height="${size}">
    <rect x="0" y="0" width="240" height="240" rx="${radius}" ry="${radius}" fill="${TILE_BG}"/>
    <g transform="translate(${tx} ${ty}) scale(${scale})">${mark}</g>
  </svg>`;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "client", "public", "icons");

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { file, size, maskable } of targets) {
  const svg = tileSvg(size, { maskable });
  await page.setContent(
    `<!doctype html><html><head>
       <link rel="preconnect" href="https://fonts.googleapis.com"/>
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
       <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap" rel="stylesheet"/>
       <style>*{margin:0;padding:0}</style>
     </head><body>${svg}</body></html>`,
    { waitUntil: "networkidle" }
  );
  await page.evaluate(() => document.fonts.ready);
  const locator = page.locator("svg");
  await locator.screenshot({ path: join(outDir, file), omitBackground: false });
  console.log(`wrote ${file} (${size}x${size}${maskable ? ", maskable" : ""})`);
}

await browser.close();
