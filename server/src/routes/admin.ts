import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import getPool from "../db/connection.js";
import { requireAdmin, AuthRequest } from "../middleware/auth.js";

const router = Router();

// POST /api/admin/login — PIN-based login (only when no users with passwords exist)
router.post("/login", async (req: AuthRequest, res: Response) => {
  const { pin } = req.body;
  if (!pin) {
    res.status(400).json({ error: "PIN is vereist" });
    return;
  }

  // Only allow PIN login if no activated users exist
  const pool = getPool();
  const usersWithPassword = await pool.query(
    "SELECT 1 FROM users WHERE password_hash IS NOT NULL LIMIT 1"
  );
  if (usersWithPassword.rows.length > 0) {
    res.status(400).json({ error: "PIN login is niet meer beschikbaar" });
    return;
  }

  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
    res.status(401).json({ error: "Ongeldige PIN" });
    return;
  }

  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET!, {
    expiresIn: "24h",
  });
  res.json({ token });
});

// GET /api/admin/tournaments — list all tournaments (admin only)
router.get("/tournaments", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT t.id, t.name, t.stake_per_game, t.created_at, t.created_by,
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
        createdBy: r.created_by,
        players: r.players,
      })),
    });
  } catch (err) {
    console.error("Failed to fetch tournaments:", err);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});

// DELETE /api/admin/tournaments — delete tournaments (admin only)
router.delete("/tournaments", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { tournamentIds } = req.body;
  if (!Array.isArray(tournamentIds) || tournamentIds.length === 0) {
    res.status(400).json({ error: "tournamentIds must be a non-empty array" });
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    // Delete in FK order: user_tournaments → round_scores → rounds → game_players → games → players → tournaments
    await client.query(
      `DELETE FROM user_tournaments WHERE tournament_id = ANY($1)`,
      [tournamentIds]
    );
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

// POST /api/admin/users — create user (admin only)
router.post("/users", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { username, isAdmin } = req.body;

  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "Gebruikersnaam is vereist" });
    return;
  }

  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    res.status(400).json({ error: "Gebruikersnaam moet 3-30 tekens zijn" });
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    res.status(400).json({ error: "Gebruikersnaam mag alleen letters, cijfers en underscores bevatten" });
    return;
  }

  try {
    const pool = getPool();
    const existing = await pool.query("SELECT 1 FROM users WHERE username = $1", [trimmed]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Gebruikersnaam bestaat al" });
      return;
    }

    const activationToken = crypto.randomUUID();
    const activationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h

    await pool.query(
      "INSERT INTO users (username, is_admin, activation_token, activation_expires) VALUES ($1, $2, $3, $4)",
      [trimmed, !!isAdmin, activationToken, activationExpires]
    );

    res.status(201).json({
      username: trimmed,
      activationLink: `/activate/${activationToken}`,
    });
  } catch (err) {
    console.error("Failed to create user:", err);
    res.status(500).json({ error: "Gebruiker aanmaken mislukt" });
  }
});

// GET /api/admin/users — list all users (admin only)
router.get("/users", requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      "SELECT username, is_admin, password_hash IS NOT NULL as activated, created_at FROM users ORDER BY created_at"
    );
    res.json({
      users: result.rows.map((r) => ({
        username: r.username,
        isAdmin: r.is_admin,
        activated: r.activated,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Gebruikers ophalen mislukt" });
  }
});

// POST /api/admin/users/:username/reset-password — reset user password (admin only)
router.post("/users/:username/reset-password", requireAdmin, async (req: AuthRequest, res: Response) => {
  const { username } = req.params;

  try {
    const pool = getPool();
    const existing = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Gebruiker niet gevonden" });
      return;
    }

    const activationToken = crypto.randomUUID();
    const activationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await pool.query(
      "UPDATE users SET password_hash = NULL, activation_token = $1, activation_expires = $2 WHERE username = $3",
      [activationToken, activationExpires, username]
    );

    res.json({ activationLink: `/activate/${activationToken}` });
  } catch (err) {
    console.error("Failed to reset password:", err);
    res.status(500).json({ error: "Wachtwoord resetten mislukt" });
  }
});

export default router;
