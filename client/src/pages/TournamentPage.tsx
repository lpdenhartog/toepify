import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  fetchLatestGame,
  finishRound,
  buyIn,
  finishGame,
  startNewGame,
  undoRound,
  type GameState,
} from "../api/game";
import Scoreboard from "../components/Scoreboard";
import TournamentClosed from "../components/TournamentClosed";
import { saveRecentTournament, getRecentTournaments } from "../utils/recentTournaments";
import { useAuth } from "../contexts/useAuth";
import { visitTournament, closeTournament, fetchSettlement, type SettlementData } from "../api/tournaments";
import type { TournamentMode } from "../App";

interface TournamentPageProps {
  mode: TournamentMode;
}

export default function TournamentPage({ mode }: TournamentPageProps) {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { token, user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingPenalties, setPendingPenalties] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [finishingRound, setFinishingRound] = useState(false);
  const [buyingIn, setBuyingIn] = useState(false);
  const buyingInRef = useRef(false);
  const [excludedPlayers, setExcludedPlayers] = useState<Set<string>>(new Set());
  const [undoingRound, setUndoingRound] = useState(false);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);

  const resetLocalRoundState = useCallback((state: GameState) => {
    const initial: Record<string, number> = {};
    for (const p of state.players) {
      initial[p.player_id] = 0;
    }
    setPendingPenalties(initial);
    setExcludedPlayers(new Set());
  }, []);

  // Load initial state.
  useEffect(() => {
    if (!tournamentId) return;

    let cancelled = false;

    async function init() {
      try {
        const state = await fetchLatestGame(tournamentId!);
        if (cancelled) return;
        setGameState(state);
        setLoading(false);

        // Save to recent tournaments
        saveRecentTournament(
          state.tournament.id,
          state.tournament.name,
          state.players.map((p) => p.player_name)
        );

        resetLocalRoundState(state);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Fout bij laden");
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [resetLocalRoundState, tournamentId]);

  // Viewer mode refreshes persisted state periodically. Writer mode only updates from its own HTTP actions.
  useEffect(() => {
    if (!tournamentId || mode !== "viewer" || !gameState) return;

    let cancelled = false;
    const refresh = async () => {
      try {
        const state = await fetchLatestGame(tournamentId);
        if (cancelled) return;
        if (gameState.game.id !== state.game.id) {
          resetLocalRoundState(state);
        }
        setGameState(state);
      } catch {
        // Keep the last visible state; the next poll may recover.
      }
    };

    const intervalId = window.setInterval(refresh, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [gameState, mode, resetLocalRoundState, tournamentId]);

  // Save visit to account when logged in (separate effect so it runs once auth is ready)
  useEffect(() => {
    if (!token || !user || !tournamentId) return;
    visitTournament(token, tournamentId).catch(() => {});

    // Migrate localStorage tournaments to account on first load
    const migratedKey = `toepify_tournaments_migrated_${user.username}`;
    if (!localStorage.getItem(migratedKey)) {
      const recentLocal = getRecentTournaments();
      for (const t of recentLocal) {
        if (t.id !== tournamentId) {
          visitTournament(token, t.id).catch(() => {});
        }
      }
      localStorage.setItem(migratedKey, "true");
    }
  }, [token, user, tournamentId]);

  const handlePenaltyChange = useCallback(
    (playerId: string, delta: number) => {
      if (!gameState) return;
      setPendingPenalties((prev) => {
        const newVal = Math.max(0, (prev[playerId] || 0) + delta);
        return { ...prev, [playerId]: newVal };
      });
    },
    [gameState]
  );

  const handleFinishRound = useCallback(async () => {
    if (!gameState) return;
    const penalties = gameState.players
      .filter((p) => p.is_active && !excludedPlayers.has(p.player_id))
      .map((p) => ({
        playerId: p.player_id,
        points: pendingPenalties[p.player_id] || 0,
      }));

    setFinishingRound(true);
    try {
      const excludedArr = excludedPlayers.size > 0 ? Array.from(excludedPlayers) : undefined;
      const newState = await finishRound(gameState.game.id, penalties, excludedArr);
      setGameState(newState);
      // Reset pending penalties
      const initial: Record<string, number> = {};
      for (const p of newState.players) {
        initial[p.player_id] = 0;
      }
      setPendingPenalties(initial);

      // Auto-finish game when only 1 active player remains (excluding sat-out players)
      const activePlayers = newState.players.filter((p) => p.is_active && !excludedPlayers.has(p.player_id));
      if (activePlayers.length === 1 && newState.game.status === "active") {
        const excludedIds = excludedPlayers.size > 0 ? Array.from(excludedPlayers) : undefined;
        const finishedState = await finishGame(newState.game.id, excludedIds);
        setGameState(finishedState);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij afsluiten ronde");
    } finally {
      setFinishingRound(false);
    }
  }, [gameState, pendingPenalties, excludedPlayers]);

  const handleBuyIn = useCallback(
    async (playerId: string) => {
      if (!gameState || buyingInRef.current) return;
      buyingInRef.current = true;
      setBuyingIn(true);
      try {
        const newState = await buyIn(gameState.game.id, playerId);
        setGameState(newState);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Fout bij inkopen");
      } finally {
        buyingInRef.current = false;
        setBuyingIn(false);
      }
    },
    [gameState]
  );

  const handleTogglePlayer = useCallback((playerId: string) => {
    setExcludedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }, []);

  const handleCancelRound = useCallback(() => {
    if (!gameState) return;
    const reset: Record<string, number> = {};
    for (const p of gameState.players) {
      reset[p.player_id] = 0;
    }
    setPendingPenalties(reset);
  }, [gameState]);

  const handleUndoRound = useCallback(async () => {
    if (!gameState) return;
    setUndoingRound(true);
    try {
      const newState = await undoRound(gameState.game.id);
      setGameState(newState);
      const initial: Record<string, number> = {};
      for (const p of newState.players) {
        initial[p.player_id] = 0;
      }
      setPendingPenalties(initial);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij ongedaan maken ronde");
    } finally {
      setUndoingRound(false);
    }
  }, [gameState]);

  const handleNewGame = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const newState = await startNewGame(tournamentId);
      setGameState(newState);
      const initial: Record<string, number> = {};
      for (const p of newState.players) {
        initial[p.player_id] = 0;
      }
      setPendingPenalties(initial);
      setExcludedPlayers(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij starten nieuw spel");
    }
  }, [tournamentId]);

  const tournamentStatus = gameState?.tournament.status;

  // Fetch settlement data when tournament is closed
  useEffect(() => {
    if (tournamentStatus !== "closed" || !tournamentId) return;
    fetchSettlement(tournamentId)
      .then(setSettlementData)
      .catch(() => {});
  }, [tournamentStatus, tournamentId]);

  const isCreator = !!(user && gameState && gameState.tournament.created_by === user.username);

  const handleCloseTournament = useCallback(async () => {
    if (!tournamentId || !token) return;
    try {
      const data = await closeTournament(token, tournamentId);
      setSettlementData({ ...data, name: gameState?.tournament.name ?? "" });
      // Update game state to reflect closed status
      setGameState((prev) => prev ? {
        ...prev,
        tournament: { ...prev.tournament, status: "closed" },
      } : prev);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij afsluiten toernooi");
    }
  }, [tournamentId, token, gameState?.tournament.name]);

  if (loading) return <p className="loading-text">Laden...</p>;
  if (error) return <p className="error-msg">{error}</p>;
  if (!gameState) return null;

  // Show closed tournament view
  if (gameState.tournament.status === "closed" && settlementData) {
    return <TournamentClosed settlementData={settlementData} />;
  }

  return (
    <Scoreboard
      gameState={gameState}
      pendingPenalties={pendingPenalties}
      onPenaltyChange={handlePenaltyChange}
      onFinishRound={handleFinishRound}
      finishingRound={finishingRound}
      onCancelRound={handleCancelRound}
      onBuyIn={handleBuyIn}
      buyingIn={buyingIn}
      onNewGame={handleNewGame}
      excludedPlayers={excludedPlayers}
      onTogglePlayer={handleTogglePlayer}
      onUndoRound={handleUndoRound}
      undoingRound={undoingRound}
      isCreator={isCreator}
      onCloseTournament={handleCloseTournament}
      mode={mode}
    />
  );
}
