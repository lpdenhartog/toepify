import {
  CARD,
  CARD_CENTER,
  CENTER_PIP,
  CORNER_SUIT,
  DEFAULT_RANK,
  FAN_ANGLE,
  FAN_PIVOT,
  FONT_RANK,
  FONT_SUIT,
  MARK_ASPECT,
  MARK_VIEWBOX,
  RANK,
} from "./logo.constants";

interface LogoMarkProps {
  size: number; // rendered HEIGHT in px (width = size / MARK_ASPECT)
  rank?: string; // default "10"; only "10" ships (override allowed)
  decorative?: boolean; // default false
  className?: string; // so callers attach hooks (e.g. "header-icon")
  title?: string; // a11y label when not decorative; default "Toepify"
}

const { cx, cy } = CARD_CENTER;
const cardX = cx - CARD.w / 2; // 120 - 48 = 72
const cardY = cy - CARD.h / 2; // 120 - 67 = 53

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
        fill="var(--logo-paper)"
        stroke="var(--logo-ink)"
        strokeWidth={CARD.sw}
        strokeLinejoin="round"
      />
      {children}
    </g>
  );
}

export default function LogoMark({
  size,
  rank = DEFAULT_RANK,
  decorative = false,
  className,
  title = "Toepify",
}: LogoMarkProps) {
  const width = size / MARK_ASPECT;
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": title } as const);

  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={width}
      height={size}
      className={className}
      {...a11y}
    >
      <FannedCard rot={-FAN_ANGLE} />
      <FannedCard rot={FAN_ANGLE} />
      <g transform="rotate(0)">
        <rect
          x={cardX}
          y={cardY}
          width={CARD.w}
          height={CARD.h}
          rx={CARD.rx}
          ry={CARD.rx}
          fill="var(--logo-paper)"
          stroke="var(--logo-ink)"
          strokeWidth={CARD.sw}
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
          fill="var(--logo-ink)"
        >
          {rank}
        </text>
        <text
          x={CORNER_SUIT.x}
          y={CORNER_SUIT.y}
          fontSize={CORNER_SUIT.fontSize}
          textAnchor="middle"
          fontFamily={FONT_SUIT}
          fill="var(--logo-ink)"
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
          fill="var(--logo-ink)"
        >
          ♠
        </text>
      </g>
    </svg>
  );
}
