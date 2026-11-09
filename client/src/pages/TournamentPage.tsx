import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Scoreboard from '../components/Scoreboard';
import BuyInRainOverlay from '../components/BuyInRainOverlay';
import TournamentClosed from '../components/TournamentClosed';
import { useAuth } from '../contexts/useAuth';
import { closeTournament, fetchSettlement, visitTournament, type SettlementData } from '../api/tournaments';
import { saveRecentTournament } from '../utils/recentTournaments';
import type { TournamentMode } from '../App';
import { useTournamentSession } from '../offline/useTournamentSession';
import { offlineTournament } from '../offline/store';

export default function TournamentPage({ mode, onEnableWriter }: { mode: TournamentMode; onEnableWriter: () => void }) {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { token, user } = useAuth();
  const local = useTournamentSession(tournamentId, mode === 'writer');
  const { session, loading, busy, uncertain, hasLock, execute, editInputs } = local;
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [closeError, setCloseError] = useState('');
  const [closing, setClosing] = useState(false);
  const [rain, setRain] = useState(false);
  const previousBuyIns = useRef<number | undefined>(undefined);
  const state = session && !session.offline && session.commands[0]?.action.type === 'new-game' ? session.base : session?.state;
  const offline = !!session?.offline;
  const blocked = busy || closing || uncertain || (mode === 'writer' && !hasLock);
  useEffect(() => {
    if (!state) return;
    saveRecentTournament(state.tournament.id, state.tournament.name, state.players.map(p => p.player_name));
  }, [state]);
  useEffect(() => {
    if (!token || !tournamentId || offlineTournament()) return;
    void visitTournament(token, tournamentId).catch(() => {});
  }, [token, tournamentId, offline]);
  useEffect(() => {
    if (!tournamentId || state?.tournament.status !== 'closed' || offlineTournament()) return;
    void fetchSettlement(tournamentId).then(setSettlement).catch(() => {});
  }, [tournamentId, state?.tournament.status]);
  useEffect(() => {
    if (!state) return;
    const total = state.players.reduce((sum, p) => sum + p.buy_ins, 0);
    if (previousBuyIns.current !== undefined && total > previousBuyIns.current) setRain(true);
    previousBuyIns.current = total;
    const timer = window.setTimeout(() => setRain(false), 6800);
    return () => clearTimeout(timer);
  }, [state]);
  const close = async () => {
    if (!tournamentId || !token || offlineTournament() || blocked) return;
    setClosing(true); setCloseError('');
    try {
      const data = await closeTournament(token, tournamentId);
      setSettlement({ ...data, name: state?.tournament.name ?? '' });
    } catch (err) { setCloseError(err instanceof Error ? err.message : 'Toernooi afsluiten mislukt'); }
    finally { setClosing(false); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...session }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `toepify-herstel-${tournamentId}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (loading) return <p className="loading-text">Laden...</p>;
  if (!state || !session) return <p className="error-msg" role="alert">{local.error || 'Geen opgeslagen toernooi beschikbaar.'}</p>;
  if (settlement) return <TournamentClosed settlementData={settlement} tournamentId={state.tournament.id} />;
  const inputs = session.inputs;
  const excluded = new Set(session.excluded);
  return <>
    {offline && <div className="offline-status" role="status">
      <div><strong>Offline modus</strong><span>Scores blijven op dit apparaat. Andere apparaten zien de laatste online stand.</span></div>
      {mode !== 'writer' && <button className="offline-secondary" onClick={onEnableWriter}>Schrijfmodus</button>}
      <button className="btn-primary" disabled={busy || !hasLock || mode !== 'writer'} onClick={() => void local.retry()}>{busy ? 'Synchroniseren…' : 'Synchroniseren'}</button>
      <button className="offline-secondary" onClick={download}>Herstelbestand downloaden</button>
    </div>}
    {mode === 'writer' && !hasLock && <p className="round-save-status" role="status">{navigator.locks ? 'Een ander tabblad schrijft in dit toernooi. Dit tabblad is alleen-lezen.' : 'Schrijven vereist een browser met ondersteuning voor veilige tabbladvergrendeling.'}</p>}
    {busy && !offline && <p className="round-save-status" role="status">Opslaan…</p>}
    {(local.error || closeError || session.conflict) && <div className="round-save-status offline-error" role="alert">
      {local.error || closeError || session.conflict}
      {uncertain && hasLock && <div className="offline-choices">
        <button className="btn-primary" disabled={busy} onClick={() => void local.retry()}>Opnieuw proberen</button>
        <button className="offline-secondary" disabled={busy} onClick={() => void local.goOffline()}>Offline verder spelen</button>
      </div>}
    </div>}
    <fieldset disabled={blocked} className="round-save-controls" aria-busy={busy}>
      <Scoreboard gameState={state} pendingPenalties={inputs}
        onPenaltyChange={(id, delta) => void editInputs({ ...inputs, [id]: Math.max(0, (inputs[id] ?? 0) + delta) }, session.excluded)}
        onFinishRound={() => void execute({ type: 'round', penalties: state.players.filter(p => p.is_active && !excluded.has(p.player_id)).map(p => ({ playerId: p.player_id, points: inputs[p.player_id] ?? 0 })), excludedPlayerIds: session.excluded })}
        finishingRound={busy} onCancelRound={() => void editInputs({}, session.excluded)}
        onBuyIn={playerId => void execute({ type: 'buy-in', playerId })} buyingIn={busy}
        onNewGame={() => void execute({ type: 'new-game', newGameId: crypto.randomUUID() })} celebrationBusy={blocked}
        excludedPlayers={excluded} onTogglePlayer={id => void editInputs(inputs, excluded.has(id) ? session.excluded.filter(p => p !== id) : [...session.excluded, id])}
        onUndoRound={() => void execute({ type: 'undo' })} undoingRound={busy}
        isCreator={!offline && !!user && state.tournament.created_by === user.username}
        onCloseTournament={() => void close()} mode={mode === 'writer' && hasLock ? 'writer' : 'viewer'} />
    </fieldset>
    {rain && <BuyInRainOverlay />}
  </>;
}
