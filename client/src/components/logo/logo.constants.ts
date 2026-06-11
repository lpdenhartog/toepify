// Brand hex — used ONLY where CSS vars can't reach (favicon SVG, LogoTile for
// PNG generation). In-app LogoMark uses var(--logo-ink)/var(--logo-paper).
export const BRAND_INK = "#206848"; // deep casino green
export const BRAND_PAPER = "#F0EADD"; // warm cream

// Option-1 fanned-deck geometry (viewBox 0 0 240 250)
export const MARK_VIEWBOX = "0 0 240 250";
export const MARK_ASPECT = 250 / 240; // height = width * this
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
