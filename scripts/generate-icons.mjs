// Throwaway one-off script: rasterize the LogoTile (Option 3) mark to the three
// committed PWA icon PNGs. NOT wired into package.json build or CI.
//
//   node scripts/generate-icons.mjs
//
// Uses the already-installed Playwright (repo-root E2E dependency). No image
// devDependency. Geometry mirrors client/src/components/logo/LogoTile.tsx.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const INK = "#206848";
const PAPER = "#F0EADD";
const RANK = "10";
const RANK_SIZE = 26 * 1.3; // 33.8
const FONT_RANK = "Fredoka, system-ui, sans-serif";
const FONT_SUIT = "Georgia, 'Times New Roman', serif";

const CARD = { w: 116, h: 164, sw: 5, radius: 12 };

function tileCard(cx, cy, rot, inner = "") {
  const x = cx - CARD.w / 2;
  const y = cy - CARD.h / 2;
  return `<g transform="rotate(${rot} ${cx} ${cy})">
    <rect x="${x}" y="${y}" width="${CARD.w}" height="${CARD.h}" rx="${CARD.radius}" ry="${CARD.radius}"
          fill="${PAPER}" stroke="${INK}" stroke-width="${CARD.sw}" stroke-linejoin="round"/>
    ${inner}
  </g>`;
}

const frontFace = `
  <g fill="${INK}" text-anchor="middle" font-family="${FONT_RANK}">
    <text x="63" y="86" font-size="${RANK_SIZE}" font-weight="700">${RANK}</text>
    <text x="63" y="${86 + RANK_SIZE * 0.82}" font-size="22" font-family="${FONT_SUIT}">&#9824;</text>
  </g>
  <text x="92" y="168" text-anchor="middle" font-size="80" fill="${INK}" font-family="${FONT_SUIT}">&#9824;</text>
`;

function tileSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="${size}" height="${size}">
    <rect x="0" y="0" width="220" height="220" rx="46" ry="46" fill="${INK}"/>
    ${tileCard(132, 96, 20)}
    ${tileCard(92, 122, -8, frontFace)}
  </svg>`;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "client", "public", "icons");

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-512.png", size: 512 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { file, size } of targets) {
  const svg = tileSvg(size);
  await page.setContent(
    `<!doctype html><html><head><style>*{margin:0;padding:0}</style></head><body>${svg}</body></html>`,
    { waitUntil: "networkidle" }
  );
  const locator = page.locator("svg");
  await locator.screenshot({ path: join(outDir, file), omitBackground: false });
  console.log(`wrote ${file} (${size}x${size})`);
}

await browser.close();
