import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import getPool from "../db/connection.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

// POST /api/tournaments — create tournament (requires auth)
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, stakePerGame = 2.5, playerNames } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Toernooi naam is vereist" });
    return;
  }

  if (!Array.isArray(playerNames) || playerNames.length < 2 || playerNames.length > 6) {
    res.status(400).json({ error: "2 tot 6 speler namen zijn vereist" });
    return;
  }

  if (playerNames.some((n: unknown) => typeof n !== "string" || !(n as string).trim())) {
    res.status(400).json({ error: "Alle speler namen moeten niet-leeg zijn" });
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const tournamentId = uuidv4();
    await client.query(
      "INSERT INTO tournaments (id, name, stake_per_game, created_by) VALUES ($1, $2, $3, $4)",
      [tournamentId, name.trim(), stakePerGame, req.user!.username]
    );

    const players = [];
    for (const playerName of playerNames) {
      const result = await client.query(
        "INSERT INTO players (tournament_id, name) VALUES ($1, $2) RETURNING id, name",
        [tournamentId, (playerName as string).trim()]
      );
      players.push(result.rows[0]);
    }

    // Create initial game
    const gameResult = await client.query(
      "INSERT INTO games (tournament_id) VALUES ($1) RETURNING id",
      [tournamentId]
    );
    const gameId = gameResult.rows[0].id;

    // Add all players to the game
    for (const player of players) {
      await client.query(
        "INSERT INTO game_players (game_id, player_id) VALUES ($1, $2)",
        [gameId, player.id]
      );
    }

    // Also save to user's visited tournaments
    await client.query(
      "INSERT INTO user_tournaments (username, tournament_id) VALUES ($1, $2) ON CONFLICT (username, tournament_id) DO UPDATE SET last_visited = NOW()",
      [req.user!.username, tournamentId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      id: tournamentId,
      name: name.trim(),
      stakePerGame,
      players,
      joinLink: `/t/${tournamentId}`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to create tournament:", err);
    res.status(500).json({ error: "Toernooi aanmaken mislukt" });
  } finally {
    client.release();
  }
});

// GET /api/tournaments/mine — get user's tournaments
router.get("/mine", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT t.id, t.name, t.stake_per_game, t.created_at, t.created_by,
              COALESCE(json_agg(json_build_object('name', p.name)) FILTER (WHERE p.id IS NOT NULL), '[]') AS players,
              MAX(ut.last_visited) AS last_visited
       FROM tournaments t
       LEFT JOIN players p ON p.tournament_id = t.id
       LEFT JOIN user_tournaments ut ON ut.tournament_id = t.id AND ut.username = $1
       WHERE t.created_by = $1 OR ut.username = $1
       GROUP BY t.id
       ORDER BY COALESCE(MAX(ut.last_visited), t.created_at) DESC
       LIMIT 20`,
      [req.user!.username]
    );
    res.json({
      tournaments: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        stakePerGame: r.stake_per_game,
        createdAt: r.created_at,
        createdBy: r.created_by,
        players: r.players,
        isOwner: r.created_by === req.user!.username,
      })),
    });
  } catch (err) {
    console.error("Failed to fetch user tournaments:", err);
    res.status(500).json({ error: "Toernooien ophalen mislukt" });
  }
});

// POST /api/tournaments/visit — mark tournament as visited
router.post("/visit", requireAuth, async (req: AuthRequest, res: Response) => {
  const { tournamentId } = req.body;
  if (!tournamentId) {
    res.status(400).json({ error: "tournamentId is vereist" });
    return;
  }

  try {
    const pool = getPool();
    // Verify tournament exists
    const existing = await pool.query("SELECT 1 FROM tournaments WHERE id = $1", [tournamentId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Toernooi niet gevonden" });
      return;
    }

    await pool.query(
      "INSERT INTO user_tournaments (username, tournament_id) VALUES ($1, $2) ON CONFLICT (username, tournament_id) DO UPDATE SET last_visited = NOW()",
      [req.user!.username, tournamentId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save visit:", err);
    res.status(500).json({ error: "Bezoek opslaan mislukt" });
  }
});

// DELETE /api/tournaments/:id — delete own tournament
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const pool = getPool();
    const tournament = await pool.query("SELECT created_by FROM tournaments WHERE id = $1", [id]);
    if (tournament.rows.length === 0) {
      res.status(404).json({ error: "Toernooi niet gevonden" });
      return;
    }

    // Only owner or admin can delete
    if (tournament.rows[0].created_by !== req.user!.username && !req.user!.isAdmin) {
      res.status(403).json({ error: "Geen toestemming om dit toernooi te verwijderen" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query("DELETE FROM user_tournaments WHERE tournament_id = $1", [id]);
      await client.query(
        `DELETE FROM round_scores WHERE round_id IN (
           SELECT r.id FROM rounds r JOIN games g ON g.id = r.game_id WHERE g.tournament_id = $1
         )`,
        [id]
      );
      await client.query(
        `DELETE FROM rounds WHERE game_id IN (SELECT id FROM games WHERE tournament_id = $1)`,
        [id]
      );
      await client.query(
        `DELETE FROM game_players WHERE game_id IN (SELECT id FROM games WHERE tournament_id = $1)`,
        [id]
      );
      await client.query("DELETE FROM games WHERE tournament_id = $1", [id]);
      await client.query("DELETE FROM players WHERE tournament_id = $1", [id]);
      await client.query("DELETE FROM tournaments WHERE id = $1", [id]);

      await client.query("COMMIT");
      res.json({ deleted: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to delete tournament:", err);
    res.status(500).json({ error: "Toernooi verwijderen mislukt" });
  }
});

export default router;
