import { useMemo } from "react";
import type { GameState } from "../api/game";
import GameDramaGrid from "./GameDramaGrid";
import {
  formatMostPenaltyStat,
  getMostPenaltyStat,
  getNormalRounds,
  getSloperStat,
  getSnurkerStat,
} from "./celebrationStats";
import "./CelebrationStatsOverlay.css";

interface GameEndCelebrationProps {
  gameState: GameState;
  onNewGame: () => void;
  isCreator: boolean;
  onCloseTournament: () => void;
  excludedPlayers: Set<string>;
  canWrite: boolean;
}

// Confetti colours drawn from the "Krijt & Klaver" palette.
const CONFETTI_COLORS = ["#1f6b4a", "#b07e16", "#b23a2c", "#2c2418", "#3a8c63"];

export default function CelebrationStatsOverlay({
  gameState,
  onNewGame,
  isCreator,
  onCloseTournament,
  excludedPlayers,
  canWrite,
}: GameEndCelebrationProps) {
  const { players, rounds, pot } = gameState;

  const winner = players.find(
    (p) => p.player_id === gameState.game.winner_player_id,
  );

  const totalBuyIns = players.reduce((sum, p) => sum + p.buy_ins, 0);
  const normalRounds = useMemo(() => getNormalRounds(rounds), [rounds]);
  const roundCount = normalRounds.length;
  const mostPenalty = useMemo(
    () => getMostPenaltyStat(rounds, players),
    [rounds, players],
  );
  const sloper = useMemo(
    () => getSloperStat(rounds, players),
    [rounds, players],
  );
  const snurker = useMemo(
    () => getSnurkerStat(rounds, players),
    [rounds, players],
  );

  const formatPot = (amount: number) =>
    `€${amount.toFixed(2).replace(".", ",")}`;

  const formatNames = (names: string[]) =>
    names.length > 0 ? names.join(", ") : "-";

  const formatSnurkers = () =>
    snurker.players.length > 0
      ? snurker.players
          .map(
            (player) =>
              `${player.playerName} (${player.matchingRounds} keer van ${player.playedRounds} ronden)`,
          )
          .join(", ")
      : "-";

  // Generate deterministic confetti pieces so rendering remains pure.
  const confettiPieces = useMemo(() => {
    const pseudoRandom = (seed: number) => {
      const value = Math.sin(seed) * 10000;
      return value - Math.floor(value);
    };
    return Array.from({ length: 46 }, (_, i) => ({
      id: i,
      left: `${pseudoRandom(i + 1) * 100}%`,
      delay: `${pseudoRandom(i + 101) * 3}s`,
      duration: `${2.6 + pseudoRandom(i + 201) * 2.2}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      isCircle: i % 3 === 0,
    }));
  }, []);

  const stats: Array<{ label: string; value: string }> = [
    {
      label: "Sloper",
      value:
        sloper.points > 0
          ? `${formatNames(sloper.playerNames)} (${sloper.points} punten)`
          : "-",
    },
    { label: "Snurker", value: formatSnurkers() },
    { label: "Aantal inkopen", value: String(totalBuyIns) },
    {
      label: "Meeste punten in 1 ronde",
      value: formatMostPenaltyStat(mostPenalty),
    },
    { label: "Aantal ronden", value: String(roundCount) },
  ];

  return (
    <div className="tp pal-chalk">
      <div className="celebration-overlay tp-cele">
        {/* Confetti */}
        <div className="tp-confetti" aria-hidden="true">
          {confettiPieces.map((piece) => (
            <i
              key={piece.id}
              className={piece.isCircle ? "round" : ""}
              style={{
                left: piece.left,
                background: piece.color,
                animationDelay: `-${piece.delay}`,
                animationDuration: piece.duration,
              }}
            />
          ))}
        </div>

        <div className="tp-cele-body">
          <div className="tp-cele-eyebrow">Winnaar</div>
          <div className="tp-medal" aria-hidden="true">
            &#9824;
          </div>
          <h1 className="tp-cele-name">{winner?.player_name ?? "Winnaar"}</h1>
          <div className="tp-cele-sub">
            wint de pot van <b>{formatPot(pot)}</b>
          </div>

          {/* Drama heatmap */}
          {normalRounds.length > 0 && (
            <GameDramaGrid
              gameState={gameState}
              excludedPlayers={excludedPlayers}
            />
          )}

          {/* Stats */}
          <dl className="tp-cele-stats" aria-label="Spelstatistieken">
            {stats.map((s) => (
              <div className="tp-stat" key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="tp-cele-cta">
          {canWrite && (
            <button className="tp-btn-accent" onClick={onNewGame}>
              Nieuw spel
            </button>
          )}
          {isCreator && (
            <button
              className="tp-cele-secondary"
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
        </div>
      </div>
    </div>
  );
}
