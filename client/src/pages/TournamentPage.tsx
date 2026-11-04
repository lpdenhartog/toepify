import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  fetchLatestGame,
  finishRound,
  buyIn,
  RoundSaveError,
  startNewGame,
  undoRound,
  type GameState,
} from "../api/game";
import Scoreboard from "../components/Scoreboard";
import BuyInRainOverlay from "../components/BuyInRainOverlay";
import TournamentClosed from "../components/TournamentClosed";
import { saveRecentTournament, getRecentTournaments } from "../utils/recentTournaments";
import { useAuth } from "../contexts/useAuth";
import { visitTournament, closeTournament, fetchSettlement, type SettlementData } from "../api/tournaments";
import type { TournamentMode } from "../App";

import { predictRound, type RoundSubmission } from "../utils/optimisticRound";

interface PendingRound {
  before: GameState;
  submission: RoundSubmission;
  inputs: Record<string, number>;
}

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
  const pendingRoundRef = useRef<PendingRound | null>(null);
  const savingRoundRef = useRef(false);
  const [roundSaveError, setRoundSaveError] = useState("");
  const [retryRound, setRetryRound] = useState(false);
  const [buyingIn, setBuyingIn] = useState(false);
  const buyingInRef = useRef(false);
  const [excludedPlayers, setExcludedPlayers] = useState<Set<string>>(new Set());
  const [undoingRound, setUndoingRound] = useState(false);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [showBuyInRain, setShowBuyInRain] = useState(false);
  const [buyInRainKey, setBuyInRainKey] = useState(0);
  const observedBuyInsRef = useRef<Set<string>>(new Set());
  const buyInRainTimerRef = useRef<number | null>(null);

  const getBuyInKeys = useCallback((state: GameState) => {
    return state.rounds
      .filter((round) => round.round_type === "buy_in")
      .map((round) => {
        const scores = round.scores
          .map((score) => `${score.player_id}:${score.penalty_points}`)
          .sort()
          .join(",");
        return `${state.game.id}:${round.round_number}:${scores}`;
      });
  }, []);

  const showBuyInAnimation = useCallback(() => {
    if (buyInRainTimerRef.current) {
      window.clearTimeout(buyInRainTimerRef.current);
    }
    setBuyInRainKey((key) => key + 1);
    setShowBuyInRain(true);
    buyInRainTimerRef.current = window.setTimeout(() => {
      setShowBuyInRain(false);
      buyInRainTimerRef.current = null;
    }, 6_800);
  }, []);

  const syncGameState = useCallback(
    (state: GameState, options?: { animateNewBuyIns?: boolean }) => {
      const buyInKeys = getBuyInKeys(state);
      const hasNewBuyIn = buyInKeys.some((key) => !observedBuyInsRef.current.has(key));
      observedBuyInsRef.current = new Set(buyInKeys);

      if (options?.animateNewBuyIns && hasNewBuyIn) {
        showBuyInAnimation();
      }

      setGameState(state);
    },
    [getBuyInKeys, showBuyInAnimation],
  );

  const resetLocalRoundState = useCallback((state: GameState) => {
    const initial: Record<string, number> = {};
    for (const p of state.players) {
      initial[p.player_id] = 0;
    }
    setPendingPenalties(initial);
    setExcludedPlayers(new Set());
  }, []);

  const savePendingRound = useCallback(async (pending: PendingRound, recovering = false) => {
    if (savingRoundRef.current) return;
    savingRoundRef.current = true;
    setRetryRound(false);
    setRoundSaveError("");
    const key = `toepify_pending_round:${pending.before.tournament.id}`;
    const clearPending = () => {
      sessionStorage.removeItem(key);
      pendingRoundRef.current = null;
      setFinishingRound(false);
    };
    try {
      let confirmed: GameState;
      try {
        confirmed = await finishRound(pending.before.game.id, pending.submission);
      } catch (err) {
        // Only retry uncertain failures; reuse the same ID even if the server already saved.
        if (err instanceof RoundSaveError && [400, 404, 409].includes(err.status)) throw err;
        confirmed = await finishRound(pending.before.game.id, pending.submission);
      }
      // A recovered submission may belong to a game since replaced by another writer.
      const latest = recovering ? await fetchLatestGame(pending.before.tournament.id) : confirmed;
      syncGameState(latest);
      resetLocalRoundState(latest);
      clearPending();
    } catch (err) {
      if (err instanceof RoundSaveError && [400, 404, 409].includes(err.status)) {
        if (err.status === 409) {
          try {
            const latest = await fetchLatestGame(pending.before.tournament.id);
            syncGameState(latest);
            resetLocalRoundState(latest);
          } catch {
            setRoundSaveError("Spel gewijzigd. De actuele scores konden niet worden geladen. Probeer opnieuw.");
            setRetryRound(true);
            return;
          }
        } else {
          syncGameState(pending.before);
          setPendingPenalties(pending.inputs);
          setExcludedPlayers(new Set(pending.submission.excludedPlayerIds));
        }
        setRoundSaveError(err.message);
        clearPending();
      } else {
        // A timeout is not proof of failure. Keep the prediction and block dependent actions.
        setRoundSaveError("Opslaan niet bevestigd. Probeer opnieuw om deze ronde veilig te synchroniseren.");
        setRetryRound(true);
      }
    } finally {
      savingRoundRef.current = false;
    }
  }, [resetLocalRoundState, syncGameState]);

  // Load initial state.
  useEffect(() => {
    if (!tournamentId) return;

    let cancelled = false;

    async function init() {
      try {
        const state = await fetchLatestGame(tournamentId!);
        if (cancelled) return;
        syncGameState(state);
        setLoading(false);

        // Save to recent tournaments
        saveRecentTournament(
          state.tournament.id,
          state.tournament.name,
          state.players.map((p) => p.player_name)
        );

        resetLocalRoundState(state);
        const stored = sessionStorage.getItem(`toepify_pending_round:${tournamentId}`);
        if (stored) {
          const pending = JSON.parse(stored) as PendingRound;
          pendingRoundRef.current = pending;
          setFinishingRound(true);
          if (state.game.id === pending.before.game.id && state.game.revision === pending.submission.expectedRevision) {
            syncGameState(predictRound(pending.before, pending.submission));
          }
          void savePendingRound(pending, true);
        }
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
  }, [resetLocalRoundState, savePendingRound, syncGameState, tournamentId]);

  // Viewer mode refreshes persisted state periodically. Writer mode only updates from its own HTTP actions.
  useEffect(() => {
    if (!tournamentId || mode !== "viewer" || finishingRound || !gameState) return;

    let cancelled = false;
    const refresh = async () => {
      try {
        const state = await fetchLatestGame(tournamentId);
        if (cancelled) return;
        if (gameState.game.id !== state.game.id) {
          resetLocalRoundState(state);
        }
        syncGameState(state, { animateNewBuyIns: true });
      } catch {
        // Keep the last visible state; the next poll may recover.
      }
    };

    const intervalId = window.setInterval(refresh, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [finishingRound, gameState, mode, resetLocalRoundState, syncGameState, tournamentId]);

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
      if (!gameState || pendingRoundRef.current) return;
      setPendingPenalties((prev) => {
        const newVal = Math.max(0, (prev[playerId] || 0) + delta);
        return { ...prev, [playerId]: newVal };
      });
    },
    [gameState]
  );

  const handleFinishRound = useCallback(() => {
    if (!gameState || pendingRoundRef.current || buyingInRef.current || undoingRound || mode !== "writer") return;
    const penalties = gameState.players
      .filter((p) => p.is_active && !excludedPlayers.has(p.player_id))
      .map((p) => ({ playerId: p.player_id, points: pendingPenalties[p.player_id] || 0 }));
    if (penalties.length < 2 || penalties.filter((p) => p.points === 0).length !== 1) return;
    const pending: PendingRound = {
      before: gameState,
      inputs: pendingPenalties,
      submission: {
        requestId: crypto.randomUUID(),
        expectedRevision: gameState.game.revision,
        penalties,
        excludedPlayerIds: Array.from(excludedPlayers),
        autoFinish: true,
      },
    };
    // Persist only this in-flight request so reloads can safely recover its receipt.
    try {
      sessionStorage.setItem(`toepify_pending_round:${gameState.tournament.id}`, JSON.stringify(pending));
    } catch {
      setRoundSaveError("Opslaan is niet mogelijk. Controleer de browseropslag en probeer opnieuw.");
      return;
    }
    pendingRoundRef.current = pending;
    setFinishingRound(true);
    const prediction = predictRound(gameState, pending.submission);
    syncGameState(prediction);
    resetLocalRoundState(prediction);
    void savePendingRound(pending);
  }, [gameState, pendingPenalties, excludedPlayers, mode, undoingRound, syncGameState, resetLocalRoundState, savePendingRound]);

  const handleBuyIn = useCallback(
    async (playerId: string) => {
      if (!gameState || buyingInRef.current || pendingRoundRef.current) return;
      buyingInRef.current = true;
      setBuyingIn(true);
      try {
        const newState = await buyIn(gameState.game.id, playerId);
        syncGameState(newState, { animateNewBuyIns: true });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Fout bij inkopen");
      } finally {
        buyingInRef.current = false;
        setBuyingIn(false);
      }
    },
    [gameState, syncGameState]
  );

  const handleTogglePlayer = useCallback((playerId: string) => {
    if (pendingRoundRef.current) return;
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
    if (!gameState || pendingRoundRef.current) return;
    const reset: Record<string, number> = {};
    for (const p of gameState.players) {
      reset[p.player_id] = 0;
    }
    setPendingPenalties(reset);
  }, [gameState]);

  const handleUndoRound = useCallback(async () => {
    if (!gameState || pendingRoundRef.current) return;
    setUndoingRound(true);
    try {
      const newState = await undoRound(gameState.game.id);
      syncGameState(newState);
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
  }, [gameState, syncGameState]);

  const handleNewGame = useCallback(async () => {
    if (!tournamentId || pendingRoundRef.current) return;
    try {
      const newState = await startNewGame(tournamentId);
      syncGameState(newState);
      const initial: Record<string, number> = {};
      for (const p of newState.players) {
        initial[p.player_id] = 0;
      }
      setPendingPenalties(initial);
      setExcludedPlayers(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fout bij starten nieuw spel");
    }
  }, [syncGameState, tournamentId]);

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
    if (pendingRoundRef.current) return;
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

  useEffect(
    () => () => {
      if (buyInRainTimerRef.current) {
        window.clearTimeout(buyInRainTimerRef.current);
      }
    },
    [],
  );

  if (loading) return <p className="loading-text">Laden...</p>;
  if (error) return <p className="error-msg">{error}</p>;
  if (!gameState) return null;

  // Show closed tournament view
  if (gameState.tournament.status === "closed" && settlementData) {
    return (
      <>
        <TournamentClosed
          settlementData={settlementData}
          tournamentId={gameState.tournament.id}
        />
        {showBuyInRain && <BuyInRainOverlay key={buyInRainKey} />}
      </>
    );
  }

  return (
    <>
      {finishingRound && !retryRound && <p className="round-save-status" role="status">Opslaan…</p>}
      {roundSaveError && (
        <div className="round-save-status" role="alert">
          {roundSaveError}{" "}
          {retryRound ? (
            <button onClick={() => { if (pendingRoundRef.current) void savePendingRound(pendingRoundRef.current, true); }}>Opnieuw proberen</button>
          ) : <button onClick={() => setRoundSaveError("")}>Sluiten</button>}
        </div>
      )}
      <fieldset disabled={finishingRound} className="round-save-controls" aria-busy={finishingRound}>
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
      </fieldset>
      {showBuyInRain && <BuyInRainOverlay key={buyInRainKey} />}
    </>
  );
}
