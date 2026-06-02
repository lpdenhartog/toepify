import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Try both: relative to source file and relative to cwd (for workspace setups)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config(); // also try cwd/.env as fallback
import express from "express";
import cors from "cors";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import tournamentRoutes from "./routes/tournaments.js";
import gameRoutes from "./routes/games.js";
import getPool from "./db/connection.js";
import { generalLimiter } from "./middleware/rateLimiter.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Global rate limit for all API endpoints
app.use("/api", generalLimiter);

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api", gameRoutes);

// Test-only: reset database endpoint (truncate game data, keep users)
if (process.env.NODE_ENV === "test") {
  app.post("/__test__/reset", async (_req, res) => {
    try {
      const pool = getPool();
      await pool.query(`
        TRUNCATE round_scores, rounds, game_players, games, players, user_tournaments, tournaments CASCADE
      `);
      res.json({ ok: true });
    } catch (err) {
      console.error("Test reset failed:", err);
      res.status(500).json({ error: "Reset failed" });
    }
  });
}

// Serve frontend static files in production
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

async function initDb() {
  const schemaPath = path.resolve(__dirname, "db/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  await getPool().query(sql);
  console.log("Database schema applied");
}

initDb().then(() => {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
