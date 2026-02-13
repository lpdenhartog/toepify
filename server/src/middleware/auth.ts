import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  admin?: boolean;
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
    if (typeof payload === "object" && payload.admin) {
      req.admin = true;
      next();
    } else {
      res.status(403).json({ error: "Not an admin token" });
    }
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
