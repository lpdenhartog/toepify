import { Router, Request, Response } from "express";
import getPool from "../db/connection.js";
import { getFullGameState } from "../services/game.js";
import { gameActionLimiter } from "../middleware/rateLimiter.js";
import type { Server } from "socket.io";

const router = Router();

// GET /api/tournaments/:tournamentId/latest
router.get("/tournaments/:tournamentId/latest", async (req: Request, res: Response) => {
  const tournamentId = req.params.tournamentId as string;
  const pool = getPool();

  try {
    // Check tournament exists
    const tRes = await pool.query("SELECT id FROM tournaments WHERE id = $1", [tournamentId]);
    if (tRes.rows.length === 0) {
      res.status(404).json({ error: "Toernooi niet gevonden" });
      return;
    }

    // Get latest game
    const gRes = await pool.query(
      "SELECT id FROM games WHERE tournament_id = $1 ORDER BY created_at DESC LIMIT 1",
      [tournamentId]
    );
    if (gRes.rows.length === 0) {
      res.status(404).json({ error: "Geen spel gevonden" });
      return;
    }

    const state = await getFullGameState(pool, gRes.rows[0].id);
    res.json(state);
  } catch (err) {
    console.error("Failed to fetch game state:", err);
    res.status(500).json({ error: "Serverfout" });
  }
});

// POST /api/games/:gameId/finish-round
router.post("/games/:gameId/finish-round", gameActionLimiter, async (req: Request, res: Response) => {
  const gameId = req.params.gameId as string;
  const { penalties, excludedPlayerIds } = req.body as {
    penalties: Array<{ playerId: string; points: number }>;
    excludedPlayerIds?: string[];
  };

  if (!Array.isArray(penalties) || penalties.length === 0) {
    res.status(400).json({ error: "Strafpunten zijn vereist" });
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    // Verify game is active
    const gameRes = await client.query("SELECT status FROM games WHERE id = $1", [gameId]);
    if (gameRes.rows.length === 0 || gameRes.rows[0].status !== "active") {
      res.status(400).json({ error: "Spel is niet actief" });
      await client.query("ROLLBACK");
      return;
    }

    // Get next round number
    const roundNumRes = await client.query(
      "SELECT COALESCE(MAX(round_number), 0) + 1 as next FROM rounds WHERE game_id = $1",
      [gameId]
    );
    const roundNumber = roundNumRes.rows[0].next;

    // Remove excluded players from the game (idempotent — skips if already removed)
    if (excludedPlayerIds && excludedPlayerIds.length > 0) {
      const activeCountRes = await client.query(
        "SELECT COUNT(*) as cnt FROM game_players WHERE game_id = $1 AND player_id != ALL($2)",
        [gameId, excludedPlayerIds]
      );
      if (Number(activeCountRes.rows[0].cnt) < 2) {
        res.status(400).json({ error: "Er moeten minimaal 2 spelers overblijven" });
        await client.query("ROLLBACK");
        return;
      }
      await client.query(
        "DELETE FROM game_players WHERE game_id = $1 AND player_id = ANY($2)",
        [gameId, excludedPlayerIds]
      );
    }

    // Create round
    const roundRes = await client.query(
      "INSERT INTO rounds (game_id, round_number) VALUES ($1, $2) RETURNING id",
      [gameId, roundNumber]
    );
    const roundId = roundRes.rows[0].id;

    // Insert scores and update totals
    for (const { playerId, points } of penalties) {
      await client.query(
        "INSERT INTO round_scores (round_id, player_id, penalty_points) VALUES ($1, $2, $3)",
        [roundId, playerId, points]
      );
      await client.query(
        "UPDATE game_players SET total_score = total_score + $1 WHERE game_id = $2 AND player_id = $3 AND is_active = true",
        [points, gameId, playerId]
      );
    }

    // Reset can_buy_in for all players at the start of the round
    await client.query(
      "UPDATE game_players SET can_buy_in = false WHERE game_id = $1",
      [gameId]
    );

    // Check eliminations: players at >= 15 who are still active
    const eliminatedRes = await client.query(
      "UPDATE game_players SET is_active = false WHERE game_id = $1 AND total_score >= 15 AND is_active = true RETURNING player_id",
      [gameId]
    );

    // Allow just-eliminated players to buy in
    if (eliminatedRes.rows.length > 0) {
      const eliminatedIds = eliminatedRes.rows.map((r: { player_id: string }) => r.player_id);
      await client.query(
        `UPDATE game_players SET can_buy_in = true WHERE game_id = $1 AND player_id = ANY($2)`,
        [gameId, eliminatedIds]
      );
    }

    // Check if game should auto-finish (0 active players left — everyone eliminated at once)
    const activeRes = await client.query(
      "SELECT player_id FROM game_players WHERE game_id = $1 AND is_active = true",
      [gameId]
    );
    if (activeRes.rows.length === 0) {
      // Edge case: all remaining players eliminated simultaneously — no winner
      await client.query(
        "UPDATE games SET status = 'finished' WHERE id = $1",
        [gameId]
      );
    }
    // Note: do NOT auto-finish when 1 player remains — eliminated players may still buy in

    await client.query("COMMIT");

    const state = await getFullGameState(getPool(), gameId);

    // Broadcast via Socket.IO
    const io = req.app.get("io") as Server | undefined;
    if (io) io.to(`game:${gameId}`).emit("game_state", state);

    res.json(state);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to finish round:", err);
    res.status(500).json({ error: "Serverfout" });
  } finally {
    client.release();
  }
});

// POST /api/games/:gameId/buy-in
router.post("/games/:gameId/buy-in", gameActionLimiter, async (req: Request, res: Response) => {
  const gameId = req.params.gameId as string;
  const { playerId } = req.body as { playerId: string };

  if (!playerId) {
    res.status(400).json({ error: "Speler-ID is vereist" });
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    // Verify game is active
    const gameRes = await client.query("SELECT status FROM games WHERE id = $1", [gameId]);
    if (gameRes.rows.length === 0 || gameRes.rows[0].status !== "active") {
      res.status(400).json({ error: "Spel is niet actief" });
      await client.query("ROLLBACK");
      return;
    }

    // Verify player is eliminated and can buy in
    const gpRes = await client.query(
      "SELECT is_active, total_score, can_buy_in FROM game_players WHERE game_id = $1 AND player_id = $2",
      [gameId, playerId]
    );
    if (gpRes.rows.length === 0) {
      res.status(404).json({ error: "Speler niet gevonden in dit spel" });
      await client.query("ROLLBACK");
      return;
    }
    if (gpRes.rows[0].is_active) {
      res.status(400).json({ error: "Speler is nog actief" });
      await client.query("ROLLBACK");
      return;
    }
    if (!gpRes.rows[0].can_buy_in) {
      res.status(400).json({ error: "Inkopen is niet meer mogelijk" });
      await client.query("ROLLBACK");
      return;
    }

    // Buy-in only allowed if there are at least 2 active players
    const activeCountRes = await client.query(
      "SELECT COUNT(*) as cnt FROM game_players WHERE game_id = $1 AND is_active = true",
      [gameId]
    );
    if (Number(activeCountRes.rows[0].cnt) < 2) {
      res.status(400).json({ error: "Inkopen is niet meer mogelijk" });
      await client.query("ROLLBACK");
      return;
    }

    // Find highest score among still-active players
    const maxScoreRes = await client.query(
      "SELECT COALESCE(MAX(total_score), 0) as max_score FROM game_players WHERE game_id = $1 AND is_active = true",
      [gameId]
    );
    const buyInScore = Number(maxScoreRes.rows[0].max_score);
    const oldScore = Number(gpRes.rows[0].total_score);
    const adjustment = buyInScore - oldScore;

    // Reactivate at the highest active player's score, increment buy_ins, clear can_buy_in
    await client.query(
      "UPDATE game_players SET is_active = true, total_score = $1, buy_ins = buy_ins + 1, can_buy_in = false WHERE game_id = $2 AND player_id = $3",
      [buyInScore, gameId, playerId]
    );

    // Insert a buy-in round with the score adjustment for the bought-in player
    const roundNumRes = await client.query(
      "SELECT COALESCE(MAX(round_number), 0) + 1 as next FROM rounds WHERE game_id = $1",
      [gameId]
    );
    const roundNumber = roundNumRes.rows[0].next;

    const roundRes = await client.query(
      "INSERT INTO rounds (game_id, round_number, round_type) VALUES ($1, $2, 'buy_in') RETURNING id",
      [gameId, roundNumber]
    );
    const roundId = roundRes.rows[0].id;

    // For the bought-in player: insert the adjustment (negative) so cumulative sum matches new score
    // For all other players: insert 0 penalty
    const allPlayersRes = await client.query(
      "SELECT player_id FROM game_players WHERE game_id = $1",
      [gameId]
    );
    for (const gp of allPlayersRes.rows) {
      const penalty = gp.player_id === playerId ? adjustment : 0;
      await client.query(
        "INSERT INTO round_scores (round_id, player_id, penalty_points) VALUES ($1, $2, $3)",
        [roundId, gp.player_id, penalty]
      );
    }

    await client.query("COMMIT");

    const state = await getFullGameState(getPool(), gameId);

    const io = req.app.get("io") as Server | undefined;
    if (io) io.to(`game:${gameId}`).emit("game_state", state);

    res.json(state);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to process buy-in:", err);
    res.status(500).json({ error: "Serverfout" });
  } finally {
    client.release();
  }
});

// POST /api/games/:gameId/finish
router.post("/games/:gameId/finish", gameActionLimiter, async (req: Request, res: Response) => {
  const gameId = req.params.gameId as string;
  const { excludedPlayerIds } = req.body as { excludedPlayerIds?: string[] };
  const pool = getPool();

  try {
    // Remove excluded players from the game before finishing
    if (excludedPlayerIds && excludedPlayerIds.length > 0) {
      await pool.query(
        "DELETE FROM game_players WHERE game_id = $1 AND player_id = ANY($2)",
        [gameId, excludedPlayerIds]
      );
    }

    // Find the sole active player
    const activeRes = await pool.query(
      "SELECT player_id FROM game_players WHERE game_id = $1 AND is_active = true",
      [gameId]
    );
    if (activeRes.rows.length !== 1) {
      res.status(400).json({ error: "Spel kan alleen beëindigd worden als er één speler over is" });
      return;
    }

    const winnerId = activeRes.rows[0].player_id;
    await pool.query(
      "UPDATE games SET status = 'finished', winner_player_id = $1 WHERE id = $2 AND status = 'active'",
      [winnerId, gameId]
    );

    const state = await getFullGameState(pool, gameId);

    const io = req.app.get("io") as Server | undefined;
    if (io) io.to(`game:${gameId}`).emit("game_state", state);

    res.json(state);
  } catch (err) {
    console.error("Failed to finish game:", err);
    res.status(500).json({ error: "Serverfout" });
  }
});

// POST /api/tournaments/:tournamentId/games — start new game
router.post("/tournaments/:tournamentId/games", gameActionLimiter, async (req: Request, res: Response) => {
  const tournamentId = req.params.tournamentId as string;
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    // Verify tournament is not closed
    const tournamentRes = await client.query(
      "SELECT status FROM tournaments WHERE id = $1",
      [tournamentId]
    );
    if (tournamentRes.rows.length > 0 && tournamentRes.rows[0].status === "closed") {
      res.status(400).json({ error: "Toernooi is afgesloten" });
      await client.query("ROLLBACK");
      return;
    }

    // Verify latest game is finished
    const latestRes = await client.query(
      "SELECT id, status FROM games WHERE tournament_id = $1 ORDER BY created_at DESC LIMIT 1",
      [tournamentId]
    );
    if (latestRes.rows.length > 0 && latestRes.rows[0].status !== "finished") {
      res.status(400).json({ error: "Het huidige spel is nog niet afgelopen" });
      await client.query("ROLLBACK");
      return;
    }

    const oldGameId = latestRes.rows[0]?.id;

    // Get all tournament players
    const playersRes = await client.query(
      "SELECT id FROM players WHERE tournament_id = $1 ORDER BY created_at, name, id",
      [tournamentId]
    );

    // Create new game
    const gameRes = await client.query(
      "INSERT INTO games (tournament_id) VALUES ($1) RETURNING id",
      [tournamentId]
    );
    const newGameId = gameRes.rows[0].id;

    // Add all players
    for (const player of playersRes.rows) {
      await client.query(
        "INSERT INTO game_players (game_id, player_id) VALUES ($1, $2)",
        [newGameId, player.id]
      );
    }

    await client.query("COMMIT");

    const state = await getFullGameState(getPool(), newGameId);

    // Broadcast to old game room so clients can switch
    const io = req.app.get("io") as Server | undefined;
    if (io && oldGameId) {
      io.to(`game:${oldGameId}`).emit("new_game_started", { gameId: newGameId, tournamentId });
    }

    res.status(201).json(state);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to start new game:", err);
    res.status(500).json({ error: "Serverfout" });
  } finally {
    client.release();
  }
});

// POST /api/games/:gameId/undo-round
router.post("/games/:gameId/undo-round", gameActionLimiter, async (req: Request, res: Response) => {
  const gameId = req.params.gameId as string;
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    // Verify game exists and is active or finished
    const gameRes = await client.query("SELECT status FROM games WHERE id = $1", [gameId]);
    if (gameRes.rows.length === 0) {
      res.status(404).json({ error: "Spel niet gevonden" });
      await client.query("ROLLBACK");
      return;
    }
    const gameStatus = gameRes.rows[0].status;
    if (gameStatus !== "active" && gameStatus !== "finished") {
      res.status(400).json({ error: "Kan ronde niet ongedaan maken" });
      await client.query("ROLLBACK");
      return;
    }

    // Find the last round
    const lastRoundRes = await client.query(
      "SELECT id, round_number, round_type FROM rounds WHERE game_id = $1 ORDER BY round_number DESC LIMIT 1",
      [gameId]
    );
    if (lastRoundRes.rows.length === 0) {
      res.status(404).json({ error: "Geen rondes om ongedaan te maken" });
      await client.query("ROLLBACK");
      return;
    }
    const lastRound = lastRoundRes.rows[0];

    // If it's a buy-in round, decrement buy_ins for the player who bought in
    if (lastRound.round_type === "buy_in") {
      // The bought-in player has a non-zero penalty in this round
      const buyInPlayerRes = await client.query(
        "SELECT player_id FROM round_scores WHERE round_id = $1 AND penalty_points != 0",
        [lastRound.id]
      );
      if (buyInPlayerRes.rows.length > 0) {
        const buyInPlayerId = buyInPlayerRes.rows[0].player_id;
        await client.query(
          "UPDATE game_players SET buy_ins = GREATEST(buy_ins - 1, 0) WHERE game_id = $1 AND player_id = $2",
          [gameId, buyInPlayerId]
        );
      }
    }

    // Delete round_scores and round
    await client.query("DELETE FROM round_scores WHERE round_id = $1", [lastRound.id]);
    await client.query("DELETE FROM rounds WHERE id = $1", [lastRound.id]);

    // Recalculate all game_players state from remaining rounds
    await client.query(
      `UPDATE game_players SET
        total_score = COALESCE((
          SELECT SUM(rs.penalty_points)
          FROM round_scores rs
          JOIN rounds r ON r.id = rs.round_id
          WHERE r.game_id = $1 AND rs.player_id = game_players.player_id
        ), 0),
        can_buy_in = false
      WHERE game_id = $1`,
      [gameId]
    );
    await client.query(
      "UPDATE game_players SET is_active = (total_score < 15) WHERE game_id = $1",
      [gameId]
    );

    // If game was finished, reopen it
    if (gameStatus === "finished") {
      await client.query(
        "UPDATE games SET status = 'active', winner_player_id = NULL WHERE id = $1",
        [gameId]
      );
    }

    await client.query("COMMIT");

    const state = await getFullGameState(getPool(), gameId);

    // Broadcast via Socket.IO
    const io = req.app.get("io") as Server | undefined;
    if (io) io.to(`game:${gameId}`).emit("game_state", state);

    res.json(state);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to undo round:", err);
    res.status(500).json({ error: "Serverfout" });
  } finally {
    client.release();
  }
});

export default router;
