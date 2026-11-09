import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { fetchLatestGame, type GameState } from '../api/game';
import { transition, type Action, type Command } from '../../../server/src/shared/gameplay';
import { loadSession, saveSession, setOfflineTournament, offlineTournament, localUpdates, networkFetch, subscribeOffline, cacheOnlineState, type LocalSession } from './store';
export const CONFLICT = 'De online versie is gewijzigd. Synchroniseren is gestopt. Vraag een beheerder om hulp.';
class RequestError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } }
async function send(session: LocalSession, sync: boolean) {
  const fetcher = sync ? networkFetch : window.fetch;
  const response = await fetcher(`/api/tournaments/${session.id}/${sync ? 'sync' : 'commands'}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseRevision: session.base.tournament.revision, commands: session.commands }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new RequestError(data.error ?? 'Opslaan mislukt', response.status);
  if (!data.state || !Array.isArray(data.acknowledged) || session.commands.some(c => !data.acknowledged.includes(c.requestId))) throw new Error('Synchronisatie niet bevestigd.');
  return data.state as GameState;
}
export function useTournamentSession(id: string | undefined, writer: boolean) {
  const offlineId = useSyncExternalStore(subscribeOffline, offlineTournament);
  const [session, setSession] = useState<LocalSession>();
  const current = useRef<LocalSession | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const idleWaiters = useRef(new Set<() => void>());
  const finishBusy = useCallback(() => {
    busyRef.current = false; setBusy(false);
    idleWaiters.current.forEach(resolve => resolve()); idleWaiters.current.clear();
  }, []);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [hasLock, setHasLock] = useState(false);
  const lockRef = useRef(false);
  const commit = useCallback(async (next: LocalSession) => {
    await saveSession(next);
    current.current = next; setSession(next);
  }, []);
  useEffect(() => {
    if (!id || !writer || !navigator.locks) return;
    const controller = new AbortController();
    const waiters = idleWaiters.current;
    let release: (() => void) | undefined;
    void navigator.locks.request(`toepify-writer:${id}`, { signal: controller.signal }, async () => {
      if (controller.signal.aborted) return;
      const released = new Promise<void>(resolve => { release = resolve; });
      // A waiting tab takes the latest durable state when the writer leaves.
      const stored = await loadSession(id);
      if (controller.signal.aborted) return;
      if (stored) { current.current = stored; setSession(stored); setUncertain(value => value || (stored.commands.length > 0 && !stored.offline)); }
      lockRef.current = true; setHasLock(true);
      await released;
      lockRef.current = false; setHasLock(false);
    }).catch(() => {});
    return () => {
      controller.abort(); lockRef.current = false;
      // Keep ownership until any in-flight save/sync has durably completed.
      // A handover must not let a late response erase the next writer's work.
      if (busyRef.current && release) waiters.add(release); else release?.();
    };
  }, [id, writer]);
  useEffect(() => {
    if (!id) return;
    current.current = undefined; setSession(undefined); setLoading(true); setError(''); setUncertain(false);
    let cancelled = false;
    async function init() {
      try {
        const stored = await loadSession(id!);
        if (cancelled) return;
        if (stored) { current.current = stored; setSession(stored); }
        if (stored?.offline) {
          setOfflineTournament(id!); setLoading(false); return;
        }
        if (stored?.commands.length) { setUncertain(true); setError('Opslaan niet bevestigd. Kies opnieuw proberen of offline verder spelen.'); setLoading(false); return; }
        if (offlineTournament()) { setLoading(false); return; }
        try {
          const state = await fetchLatestGame(id!);
          if (cancelled) return;
          const fresh = await cacheOnlineState(state);
          if (cancelled) return;
          current.current = fresh; setSession(fresh);
        } catch (err) {
          if (!cancelled) { setUncertain(!!stored); setError(err instanceof Error ? err.message : 'Laden mislukt'); }
        }
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : 'Browseropslag niet beschikbaar'); }
      if (!cancelled) setLoading(false);
    }
    void init();
    return () => { cancelled = true; };
  }, [id, commit]);
  useEffect(() => {
    if (!id) return;
    const refresh = async () => {
      if (lockRef.current || busyRef.current) return;
      const stored = await loadSession(id);
      if (stored) { current.current = stored; setSession(stored); }
    };
    localUpdates.addEventListener('change', refresh);
    return () => { localUpdates.removeEventListener('change', refresh); };
  }, [id]);
  const attempt = useCallback(async (pending: LocalSession, sync: boolean) => {
    try {
      const state = await send(pending, sync);
      const next = { ...pending, base: state, state, commands: [], offline: false, conflict: undefined, draft: undefined };
      await commit(next);
      if (offlineTournament() === pending.id) setOfflineTournament(null);
      setUncertain(false); setError('');
    } catch (err) {
      if (err instanceof RequestError && err.status < 500 && err.status !== 429) {
        if (sync || pending.offline) {
          const message = err.status === 409 ? CONFLICT : err.message;
          await commit({ ...pending, offline: true, conflict: message });
          setError(message);
        } else {
          await commit({ ...pending, state: pending.base, commands: [], inputs: pending.draft?.inputs ?? {}, excluded: pending.draft?.excluded ?? [], draft: undefined });
          if (err.status === 409) {
            try {
              const state = await fetchLatestGame(pending.id);
              await commit({ ...pending, base: state, state, commands: [], inputs: {}, excluded: [], draft: undefined });
            } catch { /* retain the confirmed baseline and the error */ }
          }
          setUncertain(false); setError(err.status === 409 ? 'Het spel is gewijzigd. Controleer de scores en probeer opnieuw.' : err.message);
        }
      } else { setUncertain(!pending.offline); setError('Opslaan niet bevestigd. Probeer opnieuw of speel offline verder.'); }
    }
  }, [commit]);
  const execute = useCallback(async (action: Action) => {
    const before = current.current;
    if (!before || (offlineId && offlineId !== before.id) || busyRef.current || !lockRef.current || (!before.offline && before.commands.length)) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const command: Command = { requestId: crypto.randomUUID(), gameId: before.state.game.id, action };
      const state = transition(before.state, command);
      const pending = { ...before, state, commands: [...before.commands, command], inputs: action.type === 'buy-in' ? before.inputs : {}, excluded: action.type === 'buy-in' ? before.excluded : [], draft: { inputs: before.inputs, excluded: before.excluded } };
      await commit(pending);
      if (!before.offline) await attempt(pending, false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Opslaan mislukt'); }
    finally { finishBusy(); }
  }, [attempt, commit, offlineId, finishBusy]);
  const retry = useCallback(async () => {
    const pending = current.current;
    if (!pending || busyRef.current || !lockRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      if (pending.commands.length || pending.offline) await attempt(pending, pending.offline);
      else {
        const state = await fetchLatestGame(pending.id);
        await commit({ ...pending, state, base: state }); setError(''); setUncertain(false);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Synchroniseren mislukt'); }
    finally { finishBusy(); }
  }, [attempt, commit, finishBusy]);
  const goOffline = useCallback(async () => {
    const pending = current.current;
    if (!pending || (offlineId && offlineId !== pending.id) || busyRef.current || !lockRef.current) return;
    const previousMode = offlineTournament();
    busyRef.current = true; setBusy(true);
    try {
      setOfflineTournament(pending.id);
      await commit({ ...pending, offline: true });
      setUncertain(false); setError('');
    } catch (err) {
      setOfflineTournament(previousMode);
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally { finishBusy(); }
  }, [commit, offlineId, finishBusy]);
  const editInputs = useCallback(async (inputs: Record<string, number>, excluded: string[]) => {
    const pending = current.current;
    if (!pending || busyRef.current || !lockRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await commit({ ...pending, inputs, excluded }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Opslaan mislukt'); }
    finally { finishBusy(); }
  }, [commit, finishBusy]);
  // Viewers poll only online, never overwriting a pending local session.
  useEffect(() => {
    if (!id || writer || session?.offline || session?.commands.length || offlineTournament()) return;
    const timer = window.setInterval(async () => {
      if (busyRef.current) return;
      try {
        const state = await fetchLatestGame(id);
        const next = await cacheOnlineState(state);
        if (lockRef.current) return;
        current.current = next; setSession(next);
      } catch { /* retain last visible state */ }
    }, 10000);
    return () => clearInterval(timer);
  }, [id, writer, session?.offline, session?.commands.length, commit, offlineId]);
  return { session, loading, busy, error, uncertain, hasLock, execute, retry, goOffline, editInputs };
}
