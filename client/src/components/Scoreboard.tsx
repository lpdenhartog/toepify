import { useMemo, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { GameState } from "../api/game";
import CelebrationStatsOverlay from "./CelebrationStatsOverlay";
import ScoreboardPortrait from "./ScoreboardPortrait";
import ScoreboardLandscape from "./ScoreboardLandscape";
import { getUniqueAbbreviations } from "./scoreboard/getUniqueAbbreviations";
import {
  useIsLandscapePhone,
  type ScoreboardView,
} from "./scoreboard/scoreboardHelpers";
import type { TournamentMode } from "../App";

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
  // Buy-in allowed if: game active, server says can_buy_in, and >= 2 active.
  const canBuyIn = (playerId: string) => {
    if (!isActive) return false;
    const player = players.find((p) => p.player_id === playerId);
    if (!player || !player.can_buy_in) return false;
    return activePlayers.length >= 2;
  };

  // Build cumulative scores per round per player.
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

  // Split into history (scrollable) and current (always-visible hero row).
  const historyScores = cumulativeScores.slice(0, -1);
  const currentScores: Record<string, number> =
    cumulativeScores.length > 0
      ? cumulativeScores[cumulativeScores.length - 1]
      : Object.fromEntries(players.map((p) => [p.player_id, 0]));

  // Auto-scroll history to bottom so the most recent rounds stay visible.
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
    // Fire only when a round commits (rounds.length changes); diff against the
    // previous totals to bump the cells that increased.
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

  const colStyle = {
    "--cols": `repeat(${players.length}, minmax(0, 1fr))`,
  } as React.CSSProperties;
  const meta = `${players.length} spelers`;
  const sortedBalances = [...balances].sort((a, b) => b.balance - a.balance);

  const undoConfirm = () => {
    if (window.confirm("Laatste ronde ongedaan maken?")) onUndoRound();
  };

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

  const view: ScoreboardView = {
    tournament,
    players,
    rounds,
    pot,
    meta,
    abbreviations,
    historyScores,
    currentScores,
    sortedBalances,
    canWrite,
    isActive,
    isCreator,
    showPlayerSelection,
    excludedPlayers,
    pendingPenalties,
    popped,
    bumped,
    penaltiesValid,
    finishingRound,
    undoingRound,
    buyingIn,
    scrollRef,
    colStyle,
    celebration,
    qrOverlay,
    onTogglePlayer,
    onTap: handleTap,
    onCancelRound,
    onFinishRound,
    onUndo: undoConfirm,
    onBuyIn,
    canBuyIn,
    onOpenShare: () => setShowQR(true),
    onCloseTournament,
  };

  return isLandscape ? (
    <ScoreboardLandscape view={view} />
  ) : (
    <ScoreboardPortrait view={view} />
  );
}
