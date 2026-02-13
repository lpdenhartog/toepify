import dotenv from "dotenv";
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

httpServer.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
