import {
  BRAND_INK,
  BRAND_PAPER,
  CARD,
  CARD_CENTER,
  CENTER_PIP,
  CORNER_SUIT,
  DEFAULT_RANK,
  FAN_ANGLE,
  FAN_PIVOT,
  FONT_RANK,
  FONT_SUIT,
  MARK_VIEWBOX,
  RANK,
  TILE,
} from "./logo.constants";

interface LogoMarkProps {
  size: number; // rendered size in px (the mark is a square tile)
  rank?: string; // default "10"; only "10" ships (override allowed)
  decorative?: boolean; // default false
  className?: string; // so callers attach hooks (e.g. "header-icon")
  title?: string; // a11y label when not decorative; default "Toepify"
}

const { cx, cy } = CARD_CENTER;
const cardX = cx - CARD.w / 2; // 120 - 48 = 72
const cardY = cy - CARD.h / 2; // 120 - 67 = 53

// Centre the 240x250 fanned-card space inside the 240x240 tile, scaled up.
const markTx = (240 - 240 * TILE.scale) / 2;
const markTy = (240 - 250 * TILE.scale) / 2;

function FannedCard({
  rot,
  children,
}: {
  rot: number;
  children?: React.ReactNode;
}) {
  return (
    <g transform={`rotate(${rot} ${FAN_PIVOT.x} ${FAN_PIVOT.y})`}>
      <rect
        x={cardX}
        y={cardY}
        width={CARD.w}
        height={CARD.h}
        rx={CARD.rx}
        ry={CARD.rx}
        fill={BRAND_PAPER}
        stroke={BRAND_INK}
        strokeWidth={TILE.sw}
        strokeLinejoin="round"
      />
      {children}
    </g>
  );
}

// Green casino tile with cream fanned cards. Self-contained (fixed brand hex),
// so it reads identically in light and dark — matching the favicon + PWA icon.
// Only the wordmark beside it adapts to the theme (var(--logo-ink)).
export default function LogoMark({
  size,
  rank = DEFAULT_RANK,
  decorative = false,
  className,
  title = "Toepify",
}: LogoMarkProps) {
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": title } as const);

  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      className={className}
      {...a11y}
    >
      <rect
        x={0}
        y={0}
        width={240}
        height={240}
        rx={TILE.radius}
        ry={TILE.radius}
        fill={BRAND_INK}
      />
      <g transform={`translate(${markTx} ${markTy}) scale(${TILE.scale})`}>
        <FannedCard rot={-FAN_ANGLE} />
        <FannedCard rot={FAN_ANGLE} />
        <g>
          <rect
            x={cardX}
            y={cardY}
            width={CARD.w}
            height={CARD.h}
            rx={CARD.rx}
            ry={CARD.rx}
            fill={BRAND_PAPER}
            stroke={BRAND_INK}
            strokeWidth={TILE.sw}
            strokeLinejoin="round"
          />
          {/* corner index */}
          <text
            x={RANK.x}
            y={RANK.y}
            fontSize={RANK.fontSize}
            fontWeight={RANK.weight}
            textAnchor="middle"
            fontFamily={FONT_RANK}
            fill={BRAND_INK}
          >
            {rank}
          </text>
          <text
            x={CORNER_SUIT.x}
            y={CORNER_SUIT.y}
            fontSize={CORNER_SUIT.fontSize}
            textAnchor="middle"
            fontFamily={FONT_SUIT}
            fill={BRAND_INK}
          >
            ♠
          </text>
          {/* centre pip */}
          <text
            x={CENTER_PIP.x}
            y={CENTER_PIP.y}
            fontSize={CENTER_PIP.fontSize}
            textAnchor="middle"
            fontFamily={FONT_SUIT}
            fill={BRAND_INK}
          >
            ♠
          </text>
        </g>
      </g>
    </svg>
  );
}
