import type { GameState } from '../api/game';
import type { Command } from '../../../server/src/shared/gameplay';
export interface LocalSession {
  version: 1;
  id: string;
  offline: boolean;
  base: GameState;
  state: GameState;
  commands: Command[];
  inputs: Record<string, number>;
  excluded: string[];
  conflict?: string;
  draft?: { inputs: Record<string, number>; excluded: string[] };
}
const MODE_KEY = 'toepify_offline_tournament';
const listeners = new Set<() => void>();
export const subscribeOffline = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const offlineTournament = () => localStorage.getItem(MODE_KEY);
export function setOfflineTournament(id: string | null) {
  if (id) localStorage.setItem(MODE_KEY, id); else localStorage.removeItem(MODE_KEY);
  listeners.forEach(fn => fn());
}
window.addEventListener('storage', () => listeners.forEach(fn => fn()));
export const localUpdates = new EventTarget();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('toepify-local') : null;
channel?.addEventListener('message', () => localUpdates.dispatchEvent(new Event('change')));
let database: Promise<IDBDatabase> | undefined;
function db() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('toepify-offline', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sessions', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browseropslag is niet beschikbaar.'));
  });
}
export async function loadSession(id: string): Promise<LocalSession | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction('sessions').objectStore('sessions').get(id);
    request.onsuccess = () => {
      const value = request.result as LocalSession | undefined;
      if (value && value.version !== 1) reject(new Error('Deze opgeslagen versie kan niet worden geopend.'));
      else resolve(value);
    };
    request.onerror = () => reject(new Error('Opgeslagen spel kon niet worden geladen.'));
  });
}
export async function saveSession(session: LocalSession) {
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put(session);
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(new Error('Opslaan is niet mogelijk. Controleer de browseropslag en probeer opnieuw.'));
  }).catch(() => { throw new Error('Opslaan is niet mogelijk. Controleer de browseropslag en probeer opnieuw.'); });
  channel?.postMessage(session.id);
}
// All normal application requests obey explicit offline mode. Only a user-initiated
// sync uses networkFetch directly; the service worker never queues API requests.
export const networkFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
  if (offlineTournament() && url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
    return Promise.reject(new Error('Deze functie is niet beschikbaar in offline modus. Synchroniseer eerst.'));
  }
  return networkFetch(input, init);
};
export async function cachedScore(id: string) { return (await loadSession(id))?.state; }

/** Refresh a confirmed cache only while no tab owns the tournament writer lock. */
export async function cacheOnlineState(state: GameState): Promise<LocalSession> {
  const id = state.tournament.id;
  const update = async (canWrite: boolean) => {
    const stored = await loadSession(id);
    if (stored && (!canWrite || stored.offline || stored.commands.length || (stored.base.tournament.revision ?? 0) > (state.tournament.revision ?? 0))) return stored;
    const next: LocalSession = { version: 1, id, base: state, state, offline: false, commands: [], inputs: stored?.inputs ?? {}, excluded: stored?.excluded ?? [] };
    if (canWrite) await saveSession(next);
    return next;
  };
  if (!navigator.locks) return update(false);
  return navigator.locks.request(`toepify-writer:${id}`, { ifAvailable: true }, lock => update(!!lock));
}
