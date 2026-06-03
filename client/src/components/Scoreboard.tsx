import { useMemo, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { GameState } from "../api/game";
import CelebrationStatsOverlay from "./CelebrationStatsOverlay";
import type { TournamentMode } from "../App";

function getUniqueAbbreviations(names: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const lengths = new Map<string, number>();

  for (const name of names) {
    lengths.set(name, 1);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const abbrevToNames = new Map<string, string[]>();

    for (const name of names) {
      const len = lengths.get(name)!;
      const abbrev = name.slice(0, len).toUpperCase();
      if (!abbrevToNames.has(abbrev)) abbrevToNames.set(abbrev, []);
      abbrevToNames.get(abbrev)!.push(name);
    }

    for (const [, group] of abbrevToNames) {
      if (group.length > 1) {
        for (const name of group) {
          const cur = lengths.get(name)!;
          if (cur < name.length) {
            lengths.set(name, cur + 1);
            changed = true;
          }
        }
      }
    }
  }

  for (const name of names) {
    result.set(name, name.slice(0, lengths.get(name)!).toUpperCase());
  }
  return result;
}

// Landscape phone layout (e.g. iPhone 15 Pro lying down): short viewport where
// scores + pot must stay visible without scrolling. Desktop/tablet keep portrait.
function useIsLandscapePhone(): boolean {
  const query = "(orientation: landscape) and (max-height: 540px)";
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return matches;
}

// Small inline icons for the round actions / share button.
const IconCancel = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);
const IconCheck = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 11.5l4.5 4.5L18 6" />
  </svg>
);
const IconUndo = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 8h8.5a3.5 3.5 0 010 7H7" />
    <path d="M5.5 4.5L3 8l3.5 3" />
  </svg>
);
const IconShare = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
  >
    <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
    <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
    <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M9.5 9.5h2v2M14.5 9.5v5M9.5 14.5h2" strokeLinecap="round" />
  </svg>
);

const Suits = () => (
  <span className="tp-suits" aria-hidden="true">
    <span className="s-dark">&#9824;</span>
    <span className="s-red">&#9829;</span>
    <span className="s-red">&#9830;</span>
    <span className="s-dark">&#9827;</span>
  </span>
);

interface ScoreboardProps {
  gameState: GameState;
  pendingPenalties: Record<string, number>;
  onPenaltyChange: (playerId: string, delta: number) => void;
  onFinishRound: () => void;
  finishingRound: boolean;
  onCancelRound: () => void;
  onBuyIn: (playerId: string) => void;
  buyingIn: boolean;
  onNewGame: () => void;
  excludedPlayers: Set<string>;
  onTogglePlayer: (playerId: string) => void;
  onUndoRound: () => void;
  undoingRound: boolean;
  isCreator: boolean;
  onCloseTournament: () => void;
  mode: TournamentMode;
}

export default function Scoreboard({
  gameState,
  pendingPenalties,
  onPenaltyChange,
  onFinishRound,
  finishingRound,
  onCancelRound,
  onBuyIn,
  buyingIn,
  onNewGame,
  excludedPlayers,
  onTogglePlayer,
  onUndoRound,
  undoingRound,
  isCreator,
  onCloseTournament,
  mode,
}: ScoreboardProps) {
  const { tournament, game, players, rounds, pot, balances } = gameState;
  const abbreviations = useMemo(
    () => getUniqueAbbreviations(players.map((p) => p.player_name)),
    [players],
  );
  const isActive = game.status === "active";
  const canWrite = mode === "writer";
  const isLandscape = useIsLandscapePhone();
  const showPlayerSelection = canWrite && isActive && rounds.length === 0;
  const activePlayers = players.filter(
    (p) => p.is_active && !excludedPlayers.has(p.player_id),
  );
  const zeroCount = activePlayers.filter(
    (p) => !pendingPenalties[p.player_id],
  ).length;
  const penaltiesValid = zeroCount === 1 && activePlayers.length >= 2;
  // Buy-in allowed if: game active, server says can_buy_in, and at least 2 players still active
  const canBuyIn = (playerId: string) => {
    if (!isActive) return false;
    const player = players.find((p) => p.player_id === playerId);
    if (!player || !player.can_buy_in) return false;
    return activePlayers.length >= 2;
  };

  // Build cumulative scores per round per player
  const cumulativeScores: Array<Record<string, number>> = [];
  const runningTotals: Record<string, number> = {};
  for (const p of players) runningTotals[p.player_id] = 0;

  for (const round of rounds) {
    for (const score of round.scores) {
      runningTotals[score.player_id] =
        (runningTotals[score.player_id] || 0) + score.penalty_points;
    }
    cumulativeScores.push({ ...runningTotals });
  }

  // Split cumulative scores into history (scrollable) and current (always visible)
  const historyScores = cumulativeScores.slice(0, -1);
  const currentScores: Record<string, number> =
    cumulativeScores.length > 0
      ? cumulativeScores[cumulativeScores.length - 1]
      : Object.fromEntries(players.map((p) => [p.player_id, 0]));

  // Auto-scroll history to bottom so most recent rounds are visible
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [historyScores.length]);

  // Tap pop + score bump animations (presentation only).
  const [popped, setPopped] = useState<string | null>(null);
  const popTimer = useRef<number | null>(null);
  const handleTap = (playerId: string) => {
    onPenaltyChange(playerId, 1);
    setPopped(playerId);
    if (popTimer.current) window.clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setPopped(null), 260);
  };
  // Clear the pop timer on unmount so it can't setState after teardown.
  useEffect(
    () => () => {
      if (popTimer.current) window.clearTimeout(popTimer.current);
    },
    [],
  );

  const [bumped, setBumped] = useState<Record<string, boolean>>({});
  const prevScoresRef = useRef<Record<string, number>>(currentScores);
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      prevScoresRef.current = { ...currentScores };
      return;
    }
    const prev = prevScoresRef.current;
    const changed: Record<string, boolean> = {};
    for (const p of players) {
      if ((currentScores[p.player_id] || 0) > (prev[p.player_id] ?? 0)) {
        changed[p.player_id] = true;
      }
    }
    prevScoresRef.current = { ...currentScores };
    if (Object.keys(changed).length > 0) {
      setBumped(changed);
      const t = window.setTimeout(() => setBumped({}), 380);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds.length]);

  const [showQR, setShowQR] = useState(false);
  const shareUrl = window.location.href;

  const displayScore = (val: number) => (val === 14 ? "P" : val);

  const formatEuro = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2).replace(".", ",");
    if (amount >= 0) return `+€${formatted}`;
    return `−€${formatted}`;
  };
  const formatPot = (amount: number) =>
    `€${amount.toFixed(2).replace(".", ",")}`;

  const colStyle = {
    "--cols": `repeat(${players.length}, minmax(0, 1fr))`,
  } as React.CSSProperties;

  const meta = `${players.length} spelers`;

  const sortedBalances = [...balances].sort((a, b) => b.balance - a.balance);

  const undoConfirm = () => {
    if (window.confirm("Laatste ronde ongedaan maken?")) {
      onUndoRound();
    }
  };

  // Header content shared between portrait (in a <th>) and landscape (in a div).
  const headInner = (p: (typeof players)[number]) => {
    const isExcluded = excludedPlayers.has(p.player_id);
    return (
      <div className="tp-phead player-header">
        {showPlayerSelection && (
          <input
            type="checkbox"
            className="player-checkbox"
            checked={!isExcluded}
            onChange={() => onTogglePlayer(p.player_id)}
          />
        )}
        <span className="tp-pname player-header-name" title={p.player_name}>
          {abbreviations.get(p.player_name)}
        </span>
        {!showPlayerSelection && p.is_active && p.total_score === 14 && (
          <span className="tp-chip tp-chip-pelt status-pelt">Pelt!</span>
        )}
        {!showPlayerSelection && !p.is_active && (
          <span className="tp-chip tp-chip-out status-out">Uit</span>
        )}
      </div>
    );
  };

  const bigNumClass = (p: (typeof players)[number]) => {
    const isExcluded = excludedPlayers.has(p.player_id);
    if (isExcluded) return "is-dead";
    if (!p.is_active) return "is-dead";
    if (p.total_score === 14) return "is-pelt";
    if (p.total_score >= 15) return "is-out";
    return "";
  };

  const tapButton = (p: (typeof players)[number]) => {
    const isExcluded = excludedPlayers.has(p.player_id);
    const active = p.is_active && !isExcluded;
    if (!active) return <div className="tp-gutter-dead">&mdash;</div>;
    const val = pendingPenalties[p.player_id] || 0;
    return (
      <button
        className={`penalty-btn tp-tapbtn${val > 0 ? " has-val" : ""}${
          p.total_score === 14 ? " is-pelt" : ""
        }${popped === p.player_id ? " tp-pop" : ""}`}
        onClick={() => handleTap(p.player_id)}
        aria-label={`Strafpunten ${p.player_name}: ${val}`}
      >
        {val}
      </button>
    );
  };

  const modeBadge = canWrite ? (
    <span className="tp-mode">Schrijfmodus</span>
  ) : (
    <span className="tp-mode tp-mode-viewer">
      <span className="tp-livedot" />
      Kijkmodus &middot; live
    </span>
  );

  const potCard = (
    <div className="tp-pot">
      <span className="tp-pot-label">Pot</span>
      <span className="tp-pot-value">{formatPot(pot)}</span>
    </div>
  );

  const buyInButtons = canWrite &&
    isActive &&
    players.some((p) => canBuyIn(p.player_id)) && (
      <div className="buyin-section">
        {players
          .filter((p) => canBuyIn(p.player_id))
          .map((p) => {
            const maxActiveScore = Math.max(
              ...players
                .filter((pl) => pl.is_active)
                .map((pl) => pl.total_score),
              0,
            );
            return (
              <button
                key={p.player_id}
                className="btn-buyin tp-buyin"
                disabled={buyingIn}
                onClick={() => onBuyIn(p.player_id)}
              >
                {p.player_name} inkopen op {displayScore(maxActiveScore)}{" "}
                (&euro;
                {tournament.stake_per_game.toFixed(2).replace(".", ",")})
              </button>
            );
          })}
      </div>
    );

  const roundActions = (
    <div className="tp-actions">
      <button
        className="tp-act tp-act-cancel"
        onClick={onCancelRound}
        aria-label="Annuleer ronde"
      >
        <IconCancel />
      </button>
      <button
        className="tp-act tp-act-finish"
        onClick={onFinishRound}
        disabled={finishingRound || !penaltiesValid}
        aria-label="Ronde afsluiten"
      >
        <IconCheck />
      </button>
      {rounds.length > 0 && (
        <button
          className="tp-act tp-act-undo"
          disabled={undoingRound}
          onClick={undoConfirm}
          aria-label="Laatste ronde ongedaan maken"
        >
          <IconUndo />
        </button>
      )}
    </div>
  );

  const celebration = game.status === "finished" && (
    <CelebrationStatsOverlay
      gameState={gameState}
      onNewGame={onNewGame}
      isCreator={canWrite && isCreator}
      onCloseTournament={onCloseTournament}
      excludedPlayers={excludedPlayers}
      canWrite={canWrite}
    />
  );

  const qrOverlay = showQR && (
    <div className="qr-overlay" onClick={() => setShowQR(false)}>
      <button
        className="qr-overlay-close"
        onClick={() => setShowQR(false)}
        aria-label="Sluiten"
      >
        ✕
      </button>
      <div className="qr-overlay-content" onClick={(e) => e.stopPropagation()}>
        <QRCodeSVG
          value={shareUrl}
          size={280}
          bgColor="transparent"
          fgColor="#ffffff"
          level="M"
        />
        <p className="qr-overlay-label">{tournament.name}</p>
      </div>
    </div>
  );

  // ---- Landscape phone layout ------------------------------------------------
  if (isLandscape) {
    return (
      <div className="scoreboard tp pal-chalk tp-land-wrap" style={colStyle}>
        {celebration}
        <div className="tp-land">
          <div className="tp-land-top">
            <div className="tp-brand">
              <h2 className="tp-wordmark">toepify</h2>
              <Suits />
            </div>
            <div className="tp-land-topmeta">
              <span className="tp-land-tname">{tournament.name}</span>
              <span className="tp-land-tmeta">{meta}</span>
              {modeBadge}
            </div>
          </div>

          <div className="tp-land-main">
            <div className="tp-land-board">
              <div className="tp-lrow tp-lhead">
                {players.map((p) => (
                  <div className="tp-cell" key={p.player_id}>
                    {headInner(p)}
                  </div>
                ))}
              </div>

              {historyScores.length > 0 && (
                <div className="tp-lhist" ref={scrollRef}>
                  {historyScores.map((scores, i) => (
                    <div className="tp-lrow" key={i}>
                      {players.map((p) => {
                        const val = scores[p.player_id] || 0;
                        const c =
                          val >= 15
                            ? "score-out"
                            : val === 14
                              ? "score-pelt"
                              : "";
                        return (
                          <div className={`tp-cell ${c}`} key={p.player_id}>
                            {displayScore(val)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              <div className="tp-lrow tp-lcurrent">
                {players.map((p) => {
                  const val = currentScores[p.player_id] || 0;
                  const valClass =
                    val >= 15 ? " score-out" : val === 14 ? " score-pelt" : "";
                  return (
                    <div className={`tp-cell${valClass}`} key={p.player_id}>
                      <div
                        className={`tp-bignum ${bigNumClass(p)}${
                          bumped[p.player_id] ? " tp-bump" : ""
                        }`}
                      >
                        {displayScore(val)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {canWrite && isActive && (
                <div className="tp-ltap">
                  {players.map((p) => (
                    <div className="tp-cell" key={p.player_id}>
                      {tapButton(p)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="tp-land-rail">
              <div className="tp-land-pot">
                <span className="tp-pot-label">Pot</span>
                <span className="tp-pot-value">{formatPot(pot)}</span>
              </div>

              <div className="tp-land-bal">
                <div className="tp-section-label">Balans</div>
                {sortedBalances.map((bal) => {
                  const sign =
                    bal.balance > 0 ? "pos" : bal.balance < 0 ? "neg" : "zero";
                  const gp = players.find((p) => p.player_id === bal.player_id);
                  return (
                    <div className="tp-lbal-row" key={bal.player_id}>
                      <span className="tp-lbal-name">
                        {gp
                          ? abbreviations.get(gp.player_name)
                          : bal.player_name}
                      </span>
                      <span className={`tp-lbal-val ${sign}`}>
                        {formatEuro(bal.balance)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {buyInButtons}

              {canWrite && isActive && roundActions}
            </div>
          </div>
        </div>
        {qrOverlay}
      </div>
    );
  }

  // ---- Portrait layout (default) ---------------------------------------------
  return (
    <div className="scoreboard tp pal-chalk" style={colStyle}>
      {celebration}

      {/* tournament + pot */}
      <div className="tp-tourney">
        <div className="tp-tourney-info">
          <div className="tp-tourney-name">{tournament.name}</div>
          <div className="tp-tourney-meta">{meta}</div>
          {modeBadge}
        </div>
        {potCard}
      </div>

      {/* board */}
      <div className="tp-board">
        <div className="score-table-wrapper">
          {/* header */}
          <table className="score-table score-table-fixed tp-head-table">
            <thead>
              <tr>
                {players.map((p) => {
                  const isExcluded = excludedPlayers.has(p.player_id);
                  return (
                    <th
                      key={p.player_id}
                      className={`player-col${isExcluded ? " player-excluded" : ""}`}
                    >
                      {headInner(p)}
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>

          {/* history */}
          {historyScores.length > 0 && (
            <div className="score-table-scroll tp-history" ref={scrollRef}>
              <table className="score-table score-table-fixed tp-hist-table">
                <tbody>
                  {historyScores.map((scores, i) => (
                    <tr key={i} className="score-row-history">
                      {players.map((p) => {
                        const val = scores[p.player_id] || 0;
                        return (
                          <td
                            key={p.player_id}
                            className={
                              val >= 15
                                ? "score-cell score-out"
                                : val === 14
                                  ? "score-cell score-pelt"
                                  : "score-cell"
                            }
                          >
                            {displayScore(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* current — hero */}
          <table className="score-table score-table-fixed tp-current-table">
            <tbody>
              <tr className="score-row-current">
                {players.map((p) => {
                  const val = currentScores[p.player_id] || 0;
                  const isExcluded = excludedPlayers.has(p.player_id);
                  return (
                    <td
                      key={p.player_id}
                      className={`score-cell${
                        val >= 15
                          ? " score-out"
                          : val === 14
                            ? " score-pelt"
                            : ""
                      }${isExcluded ? " player-excluded" : ""}`}
                    >
                      <div
                        className={`tp-bignum ${bigNumClass(p)}${
                          bumped[p.player_id] ? " tp-bump" : ""
                        }`}
                      >
                        {displayScore(val)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* buy-in */}
      {buyInButtons}

      {/* penalty entry (writer) or viewer note */}
      {canWrite && isActive ? (
        <div className="penalty-section tp-penalty">
          <div className="tp-section-label">
            Deze ronde &mdash; tik de strafpunten
          </div>
          <div className="tp-penalty-row">
            {players.map((p) => {
              const isExcluded = excludedPlayers.has(p.player_id);
              return (
                <div
                  className={`tp-pcol${isExcluded ? " player-excluded" : ""}`}
                  key={p.player_id}
                >
                  {tapButton(p)}
                  <span className="tp-pkey">
                    {abbreviations.get(p.player_name)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="tp-hint">
            De winnaar houdt 0 &mdash; geef de rest hun strafpunten.
          </div>
          {roundActions}
        </div>
      ) : !isActive ? null : (
        <div className="tp-viewnote">
          Je kijkt mee in <b>kijkmodus</b>. De stand werkt automatisch bij zodra
          de schrijver een ronde afsluit.
        </div>
      )}

      {/* balances */}
      <div className="tp-balances">
        <div className="tp-section-label">Balans</div>
        <div className="tp-bal-grid">
          {sortedBalances.map((bal) => {
            const sign =
              bal.balance > 0 ? "pos" : bal.balance < 0 ? "neg" : "zero";
            const gp = players.find((p) => p.player_id === bal.player_id);
            return (
              <div className="tp-bal" key={bal.player_id}>
                <span className="tp-bal-name">
                  {gp ? abbreviations.get(gp.player_name) : bal.player_name}
                </span>
                <span className={`tp-bal-val ${sign}`}>
                  {formatEuro(bal.balance)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* share */}
      <button className="tp-share" onClick={() => setShowQR(true)}>
        <IconShare />
        Deel link
      </button>

      {/* close tournament (creator, active game, no rounds played) */}
      {canWrite && isCreator && isActive && rounds.length === 0 && (
        <button
          className="tp-share tp-close-tournament"
          onClick={() => {
            if (
              window.confirm(
                "Weet je zeker dat je het toernooi wilt afsluiten? Er kunnen dan geen nieuwe spellen meer worden gestart.",
              )
            ) {
              onCloseTournament();
            }
          }}
        >
          Toernooi afsluiten
        </button>
      )}

      {qrOverlay}
    </div>
  );
}
