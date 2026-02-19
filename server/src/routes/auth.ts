import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import getPool from "../db/connection.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// POST /api/auth/login — username + password login (or PIN fallback)
router.post("/login", authLimiter, async (req: AuthRequest, res: Response) => {
  const { username, password, pin } = req.body;

  // PIN fallback: only if no users with passwords exist and ADMIN_PIN is set
  if (pin) {
    const pool = getPool();
    const usersWithPassword = await pool.query(
      "SELECT 1 FROM users WHERE password_hash IS NOT NULL LIMIT 1"
    );
    if (usersWithPassword.rows.length === 0 && process.env.ADMIN_PIN) {
      if (pin !== process.env.ADMIN_PIN) {
        res.status(401).json({ error: "Ongeldige PIN" });
        return;
      }
      const token = jwt.sign({ admin: true }, process.env.JWT_SECRET!, {
        expiresIn: "24h",
      });
      res.json({ token, user: { username: "__pin_admin__", isAdmin: true } });
      return;
    }
    res.status(400).json({ error: "PIN login is niet meer beschikbaar" });
    return;
  }

  if (!username || !password) {
    res.status(400).json({ error: "Gebruikersnaam en wachtwoord zijn vereist" });
    return;
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      "SELECT username, password_hash, is_admin FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Ongeldige inloggegevens" });
      return;
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      res.status(401).json({ error: "Account is nog niet geactiveerd" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Ongeldige inloggegevens" });
      return;
    }

    const token = jwt.sign(
      { username: user.username, isAdmin: user.is_admin },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.json({ token, user: { username: user.username, isAdmin: user.is_admin } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Inloggen mislukt" });
  }
});

// POST /api/auth/activate — set password for new account
router.post("/activate", authLimiter, async (req: AuthRequest, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ error: "Token en wachtwoord zijn vereist" });
    return;
  }

  if (password.length < 10) {
    res.status(400).json({ error: "Wachtwoord moet minimaal 10 tekens zijn" });
    return;
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      "SELECT username, activation_expires FROM users WHERE activation_token = $1",
      [token]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: "Ongeldige activatielink" });
      return;
    }

    const user = result.rows[0];
    if (new Date(user.activation_expires) < new Date()) {
      res.status(400).json({ error: "Activatielink is verlopen" });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "UPDATE users SET password_hash = $1, activation_token = NULL, activation_expires = NULL WHERE username = $2",
      [hash, user.username]
    );

    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error("Activation error:", err);
    res.status(500).json({ error: "Activering mislukt" });
  }
});

// GET /api/auth/activate/:token — check activation link validity
router.get("/activate/:token", async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      "SELECT username, activation_expires FROM users WHERE activation_token = $1",
      [req.params.token]
    );

    if (result.rows.length === 0) {
      res.json({ valid: false });
      return;
    }

    const user = result.rows[0];
    if (new Date(user.activation_expires) < new Date()) {
      res.json({ valid: false });
      return;
    }

    res.json({ valid: true, username: user.username });
  } catch (err) {
    console.error("Check activation error:", err);
    res.status(500).json({ error: "Controle mislukt" });
  }
});

// GET /api/auth/me — get current user info
router.get("/me", requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ username: req.user!.username, isAdmin: req.user!.isAdmin });
});

// GET /api/auth/bootstrap — check if PIN login is available
router.get("/bootstrap", async (_req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      "SELECT 1 FROM users WHERE password_hash IS NOT NULL LIMIT 1"
    );
    const pinLoginAvailable = result.rows.length === 0 && !!process.env.ADMIN_PIN;
    res.json({ pinLoginAvailable });
  } catch (err) {
    console.error("Bootstrap check error:", err);
    res.status(500).json({ error: "Controle mislukt" });
  }
});

export default router;
