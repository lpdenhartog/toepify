// Canonical brand hex — the source of truth for the literal colours used where
// CSS vars can't reach: the static favicon.svg and scripts/generate-icons.mjs
// (the PWA app-icon, rendered outside the app). In-app LogoMark uses
// var(--logo-ink)/var(--logo-paper) so it tracks the active theme.
export const BRAND_INK = "#206848"; // deep casino green
export const BRAND_PAPER = "#F0EADD"; // warm cream

// The logo is presented as a green casino tile with cream fanned cards — the
// same mark across header, hero, favicon, and the PWA app-icon. The outer SVG
// is a square tile; the fanned cards (in their own 240x250 space) are scaled up
// and centred inside it.
export const MARK_VIEWBOX = "0 0 240 240"; // square tile
export const MARK_ASPECT = 1; // square
// Tile presentation. scale > 1 pushes the card edges near the tile edge (the
// fanned-card 240x250 space carries ~30px built-in padding); sw 5 keeps the
// green card stroke a thin separator between the cream cards on the green tile.
export const TILE = { radius: 50, scale: 1.2, sw: 5 } as const;

// Fanned-deck card geometry, in the cards' own 240x250 coordinate space.
export const CARD = { w: 96, h: 134, rx: 12, sw: 8 } as const; // 5:7 card
export const CARD_CENTER = { cx: 120, cy: 120 } as const;
export const FAN_PIVOT = { x: 120, y: 205 } as const;
export const FAN_ANGLE = 17; // back-card splay, degrees
// front-card face coordinates
export const RANK = { x: 100, y: 85, fontSize: 31.7, weight: 700 };
export const CORNER_SUIT = { x: 100, y: 111, fontSize: 22 };
export const CENTER_PIP = { x: 120, y: 156, fontSize: 66 };

export const FONT_RANK = '"Fredoka", system-ui, sans-serif';
export const FONT_SUIT = "Georgia, 'Times New Roman', serif";

export const DEFAULT_RANK = "10";
