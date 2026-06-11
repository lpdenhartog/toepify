// logos.jsx — Toepify logo marks. Exports to window.
// Every mark is driven by a single `theme` object so a few controls
// can reshape the whole system at once.
// theme = { ink, paper, accent, sw, radius, spread }
const GREEN = '#206848';
const CREAM = '#F0EADD';
const RED   = '#C0392B';

const DEFAULT_THEME = {
  ink: GREEN,      // clubs/spades + linework + wordmark
  paper: CREAM,    // card faces
  accent: RED,     // hearts/diamonds (set === ink for a monochrome feel)
  sw: 1,           // stroke-weight multiplier (linework "boldness")
  radius: 12,      // card corner radius
  spread: 1,       // fan-energy multiplier on every rotation
};
function withTheme(t) { return Object.assign({}, DEFAULT_THEME, t || {}); }

// ---- Reusable rounded playing card (true 5:7 proportion) -------------------
function Card({ cx, cy, rot = 0, px, py, w = 96, h = 134, fill, stroke, sw = 8, radius = 12, children }) {
  const ox = px == null ? cx : px;
  const oy = py == null ? cy : py;
  return (
    <g transform={`rotate(${rot} ${ox} ${oy})`}>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={radius} ry={radius}
            fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      {children}
    </g>
  );
}

// Corner index (rank stacked over small suit) anchored to a card's top-left
function CornerIndex({ x, y, rank, suit, color = GREEN, scale = 1, rankScale = 1 }) {
  const rankSize = 26 * scale * rankScale;
  return (
    <g fill={color} textAnchor="middle" fontFamily="Fredoka, sans-serif">
      <text x={x} y={y} fontSize={rankSize} fontWeight="700">{rank}</text>
      <text x={x} y={y + rankSize * 0.82} fontSize={22 * scale} fontFamily="Georgia, 'Times New Roman', serif">{suit}</text>
    </g>
  );
}

// =====================================================================
// OPTION 1 — Corrected fanned deck (outline). Three identical cards,
// front card reads like a real "10 of spades".
// =====================================================================
function LogoFannedDeck({ size = 200, theme, rank = '10' }) {
  const t = withTheme(theme);
  const sw = 8 * t.sw;
  const back = 17 * t.spread;
  return (
    <svg viewBox="0 0 240 250" width={size} height={size * 250 / 240} role="img" aria-label="Toepify deck">
      <Card cx={120} cy={120} rot={-back} px={120} py={205} fill={t.paper} stroke={t.ink} sw={sw} radius={t.radius} />
      <Card cx={120} cy={120} rot={back} px={120} py={205} fill={t.paper} stroke={t.ink} sw={sw} radius={t.radius} />
      <Card cx={120} cy={120} rot={0} fill={t.paper} stroke={t.ink} sw={sw} radius={t.radius}>
        <CornerIndex x={100} y={85} rank={rank} suit="♠" color={t.ink} rankScale={1.22} />
        <text x={120} y={156} textAnchor="middle" fontSize={66} fill={t.ink}
              fontFamily="Georgia, 'Times New Roman', serif">♠</text>
      </Card>
    </svg>
  );
}

// =====================================================================
// OPTION 2 — Four cards spread left→right; bottoms tuck together,
// tops fan out. Outline style, classic red/green suits.
// =====================================================================
function LogoFourSuit({ size = 200, theme, rank = '10' }) {
  const t = withTheme(theme);
  const sw = 8 * t.sw;
  const cyCard = 124, dx = 31, x0 = 80;
  const base = 6 * t.spread;
  const cards = [
    { s: '♣', c: t.ink,    rot: -base },
    { s: '♥', c: t.accent, rot: -base / 3 },
    { s: '♦', c: t.accent, rot: base / 3 },
    { s: '♠', c: t.ink,    rot: base },
  ];
  return (
    <svg viewBox="0 0 252 250" width={size} height={size * 250 / 252} role="img" aria-label="Toepify spread">
      {cards.map((d, i) => {
        const cx = x0 + i * dx;
        const isFront = i === cards.length - 1;
        return (
          <Card key={i} cx={cx} cy={cyCard} rot={d.rot} px={cx} py={cyCard + 60}
                fill={t.paper} stroke={t.ink} sw={sw} radius={t.radius}>
            <CornerIndex x={cx - 28} y={cyCard - 40} rank={rank} suit={d.s} color={d.c} scale={0.68} rankScale={1.18} />
            {isFront && (
              <text x={cx} y={cyCard + 32} textAnchor="middle" fontSize={54} fill={d.c}
                    fontFamily="Georgia, 'Times New Roman', serif">{d.s}</text>
            )}
          </Card>
        );
      })}
    </svg>
  );
}

// =====================================================================
// OPTION 3 — App tile (inverted). Ink rounded tile, paper cards with a
// border that separates them. Home-screen / PWA-icon ready.
// =====================================================================
function LogoTile({ size = 200, radius = 46, theme, rank = '10', backRank = null, backIndexRight = false }) {
  const t = withTheme(theme);
  const sw = 5 * t.sw;
  const tilt = t.spread;
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} role="img" aria-label="Toepify app icon">
      <rect x="0" y="0" width="220" height="220" rx={radius} ry={radius} fill={t.ink} />
      {/* back card — optionally a real face (e.g. 9♠). With backIndexRight the
          index sits in the exposed top-right wedge so it stays readable. */}
      <Card cx={132} cy={96} rot={20 * tilt} w={116} h={164} fill={t.paper} stroke={t.ink} sw={sw} radius={t.radius}>
        {backRank && (
          <CornerIndex x={backIndexRight ? 162 : 103} y={backIndexRight ? 56 : 60}
            rank={backRank} suit="♠" color={t.ink} rankScale={1.3} />
        )}
      </Card>
      {/* front card — the 10♠, unchanged */}
      <Card cx={92} cy={122} rot={-8 * tilt} w={116} h={164} fill={t.paper} stroke={t.ink} sw={sw} radius={t.radius}>
        <CornerIndex x={63} y={86} rank={rank} suit="♠" color={t.ink} rankScale={1.3} />
        <text x={92} y={168} textAnchor="middle" fontSize={80} fill={t.ink}
              fontFamily="Georgia, 'Times New Roman', serif">♠</text>
      </Card>
    </svg>
  );
}

// ---- Wordmark --------------------------------------------------------------
function Wordmark({ fontSize = 84, color = GREEN }) {
  return (
    <span style={{
      fontFamily: 'Fredoka, sans-serif', fontWeight: 600, fontSize,
      color, letterSpacing: '-0.01em', lineHeight: 1, display: 'inline-block',
    }}>toepify</span>
  );
}

// ---- Lockup (icon + wordmark) ---------------------------------------------
function Lockup({ Icon, iconSize = 130, fontSize = 84, gap = 28, theme, rank }) {
  const t = withTheme(theme);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <Icon size={iconSize} theme={theme} rank={rank} />
      <Wordmark fontSize={fontSize} color={t.ink} />
    </div>
  );
}

Object.assign(window, {
  LogoFannedDeck, LogoFourSuit, LogoTile, Wordmark, Lockup,
  GREEN, CREAM, RED, DEFAULT_THEME, withTheme,
});
