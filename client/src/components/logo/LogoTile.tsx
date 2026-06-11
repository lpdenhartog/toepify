import {
  BRAND_INK,
  BRAND_PAPER,
  DEFAULT_RANK,
  FONT_RANK,
  FONT_SUIT,
} from "./logo.constants";

interface LogoTileProps {
  size: number; // px square
  rank?: string; // default "10"
}

// Option 3 — inverted ink tile, paper cards. PWA-icon source only; never
// mounted in the running app. Hardcoded brand hex because the OS renders the
// home-screen icon outside the app and cannot read theme vars.
// viewBox 0 0 220 220 (verbatim from the handoff prototype).

const TILE_CARD = { w: 116, h: 164, sw: 5, radius: 12 } as const;

// CornerIndex from logos.jsx: rankScale 1.3 → rank font-size 26 * 1.3 = 33.8;
// suit sits at y + rankSize * 0.82, font-size 22.
const RANK_SIZE = 26 * 1.3;

function TileCard({
  cx,
  cy,
  rot,
  children,
}: {
  cx: number;
  cy: number;
  rot: number;
  children?: React.ReactNode;
}) {
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <rect
        x={cx - TILE_CARD.w / 2}
        y={cy - TILE_CARD.h / 2}
        width={TILE_CARD.w}
        height={TILE_CARD.h}
        rx={TILE_CARD.radius}
        ry={TILE_CARD.radius}
        fill={BRAND_PAPER}
        stroke={BRAND_INK}
        strokeWidth={TILE_CARD.sw}
        strokeLinejoin="round"
      />
      {children}
    </g>
  );
}

export default function LogoTile({ size, rank = DEFAULT_RANK }: LogoTileProps) {
  return (
    <svg
      viewBox="0 0 220 220"
      width={size}
      height={size}
      role="img"
      aria-label="Toepify app icon"
    >
      <rect
        x="0"
        y="0"
        width="220"
        height="220"
        rx={46}
        ry={46}
        fill={BRAND_INK}
      />
      {/* back card — no index (backRank null) */}
      <TileCard cx={132} cy={96} rot={20} />
      {/* front card — the 10♠ */}
      <TileCard cx={92} cy={122} rot={-8}>
        <g fill={BRAND_INK} textAnchor="middle" fontFamily={FONT_RANK}>
          <text x={63} y={86} fontSize={RANK_SIZE} fontWeight="700">
            {rank}
          </text>
          <text
            x={63}
            y={86 + RANK_SIZE * 0.82}
            fontSize={22}
            fontFamily={FONT_SUIT}
          >
            ♠
          </text>
        </g>
        <text
          x={92}
          y={168}
          textAnchor="middle"
          fontSize={80}
          fill={BRAND_INK}
          fontFamily={FONT_SUIT}
        >
          ♠
        </text>
      </TileCard>
    </svg>
  );
}
