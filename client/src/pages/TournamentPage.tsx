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
import {
  joinGame,
  onGameState,
  onPenaltyUpdated,
  onNewGameStarted,
  sendPenaltyUpdate,
  leaveGame,
  disconnectSocket,
} from "../api/socket";
import Scoreboard from "../components/Scoreboard";
import { saveRecentTournament, getRecentTournaments } from "./LandingPage";
import { useAuth } from "../contexts/AuthContext";
import { visitTournament } from "../api/tournaments";

const MIGRATED_KEY = "toepify_tournaments_migrated";

export default function TournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { isAuthenticated, token } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingPenalties, setPendingPenalties] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [finishingRound, setFinishingRound] = useState(false);
  const [buyingIn, setBuyingIn] = useState(false);
  const buyingInRef = useRef(false);
  const [excludedPlayers, setExcludedPlayers] = useState<Set<string>>(new Set());
  const [undoingRound, setUndoingRound] = useState(false);

  // Load initial state and set up socket
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

        // Save visit to account if logged in
        if (token) {
          visitTournament(token, state.tournament.id).catch(() => {});

          // Migrate localStorage tournaments to account on first load
          if (!localStorage.getItem(MIGRATED_KEY)) {
            const recentLocal = getRecentTournaments();
            for (const t of recentLocal) {
              if (t.id !== state.tournament.id) {
                visitTournament(token, t.id).catch(() => {});
              }
            }
            localStorage.setItem(MIGRATED_KEY, "true");
          }
        }

        // Initialize pending penalties to 0 for all active players
        const initial: Record<string, number> = {};
        for (const p of state.players) {
          initial[p.player_id] = 0;
        }
        setPendingPenalties(initial);

        // Join socket room
        joinGame(state.game.id);

        // Listen for server state updates
        onGameState((newState) => {
          setGameState(newState);
        });

        // Listen for optimistic penalty updates from other clients
        onPenaltyUpdated(({ playerId, penalty }) => {
          setPendingPenalties((prev) => ({ ...prev, [playerId]: penalty }));
        });

        // Listen for new game started
        onNewGameStarted(async ({ gameId }) => {
          const newState = await fetchLatestGame(tournamentId!);
          setGameState(newState);
          const initial: Record<string, number> = {};
          for (const p of newState.players) {
            initial[p.player_id] = 0;
          }
          setPendingPenalties(initial);
          setExcludedPlayers(new Set());
          joinGame(gameId);
        });
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Fout bij laden");
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      leaveGame("");
      disconnectSocket();
    };
  }, [tournamentId]);

  const handlePenaltyChange = useCallback(
    (playerId: string, delta: number) => {
      if (!gameState) return;
      setPendingPenalties((prev) => {
        const newVal = Math.max(0, (prev[playerId] || 0) + delta);
        sendPenaltyUpdate(gameState.game.id, playerId, newVal);
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
      sendPenaltyUpdate(gameState.game.id, p.player_id, 0);
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
      joinGame(newState.game.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij starten nieuw spel");
    }
  }, [tournamentId]);

  if (loading) return <p className="loading-text">Laden...</p>;
  if (error) return <p className="error-msg">{error}</p>;
  if (!gameState) return null;

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
    />
  );
}
