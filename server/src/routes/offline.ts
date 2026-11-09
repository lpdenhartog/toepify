import { Router } from 'express';
import type { PoolClient } from 'pg';
import getPool from '../db/connection.js';
import { readFullGameState } from '../services/game.js';
import { transition, type Command, type State } from '../shared/gameplay.js';
import { gameActionLimiter } from '../middleware/rateLimiter.js';
const router = Router();
const conflict = 'De online versie is gewijzigd. Synchroniseren is gestopt. Vraag een beheerder om hulp.';
class SyncError extends Error { constructor(public status: number, message: string) { super(message); } }
async function persist(client: PoolClient, before: State, state: State) {
  const id = state.game.id;
  if (id !== before.game.id) {
    await client.query("INSERT INTO games (id, tournament_id, created_at) VALUES ($1, $2, clock_timestamp())", [id, state.tournament.id]);
  } else {
    await client.query('UPDATE games SET status = $2, winner_player_id = $3, revision = $4 WHERE id = $1', [id, state.game.status, state.game.winner_player_id, state.game.revision]);
    await client.query('DELETE FROM round_scores WHERE round_id IN (SELECT id FROM rounds WHERE game_id = $1)', [id]);
    await client.query('DELETE FROM rounds WHERE game_id = $1', [id]);
    await client.query('DELETE FROM game_players WHERE game_id = $1', [id]);
  }
  for (const p of state.players) {
    await client.query('INSERT INTO game_players (game_id, player_id, is_active, buy_ins, total_score, can_buy_in) VALUES ($1,$2,$3,$4,$5,$6)', [id, p.player_id, p.is_active, p.buy_ins, p.total_score, p.can_buy_in]);
  }
  for (const round of state.rounds) {
    const r = await client.query('INSERT INTO rounds (game_id, round_number, round_type) VALUES ($1,$2,$3) RETURNING id', [id, round.round_number, round.round_type ?? 'normal']);
    for (const score of round.scores) await client.query('INSERT INTO round_scores (round_id, player_id, penalty_points) VALUES ($1,$2,$3)', [r.rows[0].id, score.player_id, score.penalty_points]);
  }
}
// A batch is all-or-nothing. Receipts allow only a contiguous, unchanged own prefix.
for (const endpoint of ['commands', 'sync']) router.post(`/tournaments/:tournamentId/${endpoint}`, gameActionLimiter, async (req, res) => {
  const { baseRevision, commands } = (req.body ?? {}) as { baseRevision: number; commands: Command[] };
  if (!Number.isSafeInteger(baseRevision) || baseRevision < 0 || !Array.isArray(commands) || commands.length > 10000 || (endpoint === 'commands' && commands.length !== 1) || commands.some(c => !c || typeof c.requestId !== 'string' || !c.requestId || c.requestId.length > 100 || typeof c.gameId !== 'string' || !c.action) || new Set(commands.map(c => c.requestId)).size !== commands.length) {
    res.status(400).json({ error: 'Ongeldige synchronisatie' }); return;
  }
  const id = req.params.tournamentId;
  let client: PoolClient;
  try { client = await getPool().connect(); }
  catch { res.status(503).json({ error: 'Server niet beschikbaar' }); return; }
  try {
    await client.query('BEGIN');
    const t = await client.query('SELECT revision, status FROM tournaments WHERE id = $1 FOR UPDATE', [id]);
    if (!t.rows.length) throw new SyncError(409, conflict);
    const current = Number(t.rows[0].revision);
    if (t.rows[0].status !== 'active') throw new SyncError(409, conflict);
    let revision = baseRevision;
    let prefix = 0;
    for (const command of commands) {
      const receipt = await client.query('SELECT payload = $3::jsonb AS matches, before_revision, after_revision FROM gameplay_receipts WHERE tournament_id = $1 AND request_id = $2', [id, command.requestId, JSON.stringify(command)]);
      if (!receipt.rows.length) break;
      const r = receipt.rows[0];
      if (!r.matches || Number(r.before_revision) !== revision) throw new SyncError(409, conflict);
      revision = Number(r.after_revision); prefix++;
    }
    if (revision !== current) throw new SyncError(409, conflict);
    const latest = await client.query('SELECT id FROM games WHERE tournament_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1', [id]);
    if (!latest.rows.length) throw new SyncError(409, conflict);
    let state = await readFullGameState(client, latest.rows[0].id);
    for (const command of commands.slice(prefix)) {
      const duplicate = await client.query('SELECT 1 FROM gameplay_receipts WHERE tournament_id = $1 AND request_id = $2', [id, command.requestId]);
      if (duplicate.rows.length || state.game.id !== command.gameId) throw new SyncError(409, conflict);
      let next: State;
      try { next = transition(state, command); } catch (error) { throw new SyncError(400, error instanceof Error ? error.message : 'Ongeldige actie'); }
      await persist(client, state, next);
      const after = await readFullGameState(client, next.game.id);
      await client.query('INSERT INTO gameplay_receipts (tournament_id, request_id, payload, before_revision, after_revision) VALUES ($1,$2,$3,$4,$5)', [id, command.requestId, JSON.stringify(command), revision, after.tournament.revision]);
      revision = after.tournament.revision!;
      state = after;
    }
    await client.query('COMMIT');
    res.json({ state, acknowledged: commands.map(c => c.requestId) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (!(error instanceof SyncError)) console.error('Gameplay sync failed:', error);
    res.status(error instanceof SyncError ? error.status : 500).json({ error: error instanceof SyncError ? error.message : 'Serverfout' });
  } finally { client.release(); }
});
export default router;
