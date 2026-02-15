import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import getPool from "../db/connection.js";
import { requireAdmin, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/login", (req: AuthRequest, res: Response) => {
  const { pin } = req.body;
  if (!pin || pin !== process.env.ADMIN_PIN) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET!, {
    expiresIn: "24h",
  });
  res.json({ token });
});

router.post("/tournaments", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, stakePerGame = 2.5, playerNames } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Tournament name is required" });
    return;
  }

  if (!Array.isArray(playerNames) || playerNames.length < 2 || playerNames.length > 6) {
    res.status(400).json({ error: "2 to 6 player names are required" });
    return;
  }

  if (playerNames.some((n: unknown) => typeof n !== "string" || !(n as string).trim())) {
    res.status(400).json({ error: "All player names must be non-empty strings" });
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const tournamentId = uuidv4();
    await client.query(
      "INSERT INTO tournaments (id, name, stake_per_game) VALUES ($1, $2, $3)",
      [tournamentId, name.trim(), stakePerGame]
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
    res.status(500).json({ error: "Failed to create tournament" });
  } finally {
    client.release();
  }
});

router.get("/tournaments", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT t.id, t.name, t.stake_per_game, t.created_at,
              COALESCE(json_agg(json_build_object('name', p.name)) FILTER (WHERE p.id IS NOT NULL), '[]') AS players
       FROM tournaments t
       LEFT JOIN players p ON p.tournament_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at DESC
       LIMIT 10`
    );
    res.json({
      tournaments: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        stakePerGame: r.stake_per_game,
        createdAt: r.created_at,
        players: r.players,
      })),
    });
  } catch (err) {
    console.error("Failed to fetch tournaments:", err);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});

router.delete("/tournaments", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { tournamentIds } = req.body;
  if (!Array.isArray(tournamentIds) || tournamentIds.length === 0) {
    res.status(400).json({ error: "tournamentIds must be a non-empty array" });
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    // Delete in FK order: round_scores → rounds → game_players → games → players → tournaments
    await client.query(
      `DELETE FROM round_scores WHERE round_id IN (
         SELECT r.id FROM rounds r
         JOIN games g ON g.id = r.game_id
         WHERE g.tournament_id = ANY($1)
       )`,
      [tournamentIds]
    );
    await client.query(
      `DELETE FROM rounds WHERE game_id IN (
         SELECT id FROM games WHERE tournament_id = ANY($1)
       )`,
      [tournamentIds]
    );
    await client.query(
      `DELETE FROM game_players WHERE game_id IN (
         SELECT id FROM games WHERE tournament_id = ANY($1)
       )`,
      [tournamentIds]
    );
    await client.query(
      `DELETE FROM games WHERE tournament_id = ANY($1)`,
      [tournamentIds]
    );
    await client.query(
      `DELETE FROM players WHERE tournament_id = ANY($1)`,
      [tournamentIds]
    );
    await client.query(
      `DELETE FROM tournaments WHERE id = ANY($1)`,
      [tournamentIds]
    );

    await client.query("COMMIT");
    res.json({ deleted: tournamentIds.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to delete tournaments:", err);
    res.status(500).json({ error: "Failed to delete tournaments" });
  } finally {
    client.release();
  }
});

export default router;
