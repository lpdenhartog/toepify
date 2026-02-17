const BASE = "/api/auth";

export interface AuthUser {
  username: string;
  isAdmin: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function loginWithCredentials(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Login mislukt");
  }
  return res.json();
}

export async function loginWithPin(pin: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Login mislukt");
  }
  return res.json();
}

export async function checkBootstrap(): Promise<{ pinLoginAvailable: boolean }> {
  const res = await fetch(`${BASE}/bootstrap`);
  if (!res.ok) throw new Error("Bootstrap check mislukt");
  return res.json();
}

export async function checkActivationToken(token: string): Promise<{ valid: boolean; username?: string }> {
  const res = await fetch(`${BASE}/activate/${token}`);
  if (!res.ok) throw new Error("Controle mislukt");
  return res.json();
}

export async function activateAccount(token: string, password: string): Promise<{ success: boolean; username: string }> {
  const res = await fetch(`${BASE}/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Activering mislukt");
  }
  return res.json();
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Niet ingelogd");
  return res.json();
}
