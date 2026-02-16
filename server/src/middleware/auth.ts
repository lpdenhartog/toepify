import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  admin?: boolean;
  user?: { username: string; isAdmin: boolean };
}

function extractPayload(req: AuthRequest): jwt.JwtPayload | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    if (typeof payload === "object") return payload;
    return null;
  } catch {
    return null;
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    if (typeof payload === "object") {
      // Support new user tokens with isAdmin
      if (payload.isAdmin && payload.username) {
        req.admin = true;
        req.user = { username: payload.username, isAdmin: true };
        next();
        return;
      }
      // Support old PIN-based admin tokens
      if (payload.admin) {
        req.admin = true;
        next();
        return;
      }
    }
    res.status(403).json({ error: "Not an admin token" });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const payload = extractPayload(req);
  if (!payload) {
    res.status(401).json({ error: "Missing or invalid token" });
    return;
  }

  if (payload.username) {
    req.user = { username: payload.username, isAdmin: !!payload.isAdmin };
    req.admin = !!payload.isAdmin;
  } else if (payload.admin) {
    // PIN-based admin token — treat as authenticated admin
    req.admin = true;
    req.user = { username: "__pin_admin__", isAdmin: true };
  } else {
    res.status(401).json({ error: "Invalid token payload" });
    return;
  }

  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const payload = extractPayload(req);
  if (payload) {
    if (payload.username) {
      req.user = { username: payload.username, isAdmin: !!payload.isAdmin };
      req.admin = !!payload.isAdmin;
    } else if (payload.admin) {
      req.admin = true;
      req.user = { username: "__pin_admin__", isAdmin: true };
    }
  }
  next();
}
