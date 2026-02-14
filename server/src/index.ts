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
import { createServer } from "http";
import { Server } from "socket.io";
import adminRoutes from "./routes/admin.js";
import gameRoutes from "./routes/games.js";
import { setupSocket } from "./socket.js";
import getPool from "./db/connection.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Make io accessible in route handlers
app.set("io", io);

app.use("/api/admin", adminRoutes);
app.use("/api", gameRoutes);

// Socket.IO event handlers
setupSocket(io);

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
  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
