import { createContext } from "react";
import type { AuthUser } from "../api/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login(username: string, password: string): Promise<void>;
  loginWithPin(pin: string): Promise<void>;
  logout(): void;
  isAuthenticated: boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
