import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  fetchLatestGame,
  finishRound,
  buyIn,
  finishGame,
  startNewGame,
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

export default function TournamentPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingPenalties, setPendingPenalties] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      .filter((p) => p.is_active)
      .map((p) => ({
        playerId: p.player_id,
        points: pendingPenalties[p.player_id] || 0,
      }));

    try {
      const newState = await finishRound(gameState.game.id, penalties);
      setGameState(newState);
      // Reset pending penalties
      const initial: Record<string, number> = {};
      for (const p of newState.players) {
        initial[p.player_id] = 0;
      }
      setPendingPenalties(initial);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij afsluiten ronde");
    }
  }, [gameState, pendingPenalties]);

  const handleBuyIn = useCallback(
    async (playerId: string) => {
      if (!gameState) return;
      try {
        const newState = await buyIn(gameState.game.id, playerId);
        setGameState(newState);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Fout bij inkopen");
      }
    },
    [gameState]
  );

  const handleFinishGame = useCallback(async () => {
    if (!gameState) return;
    try {
      const newState = await finishGame(gameState.game.id);
      setGameState(newState);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij beëindigen spel");
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
      onBuyIn={handleBuyIn}
      onFinishGame={handleFinishGame}
      onNewGame={handleNewGame}
    />
  );
}
