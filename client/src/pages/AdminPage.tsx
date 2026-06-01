import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import TournamentList from "../components/TournamentList";

interface User {
  username: string;
  isAdmin: boolean;
  activated: boolean;
  createdAt: string;
}

const ADMIN_BASE = "/api/admin";

export default function AdminPage() {
  const { isAuthenticated, user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [activationLink, setActivationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.isAdmin) {
      navigate("/login", { state: { from: "/admin" } });
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingUsers(true);
      const res = await fetch(`${ADMIN_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Laden mislukt");
      const data = await res.json();
      setUsers(data.users);
    } catch {
      // silent
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && user?.isAdmin) loadUsers();
  }, [token, user, loadUsers]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setActivationLink(null);
    setCreatingUser(true);
    try {
      const res = await fetch(`${ADMIN_BASE}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername, isAdmin: newUserIsAdmin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aanmaken mislukt");
      setActivationLink(`${window.location.origin}${data.activationLink}`);
      setNewUsername("");
      setNewUserIsAdmin(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aanmaken mislukt");
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleResetPassword(username: string) {
    if (!token) return;
    const confirmed = window.confirm(`Wachtwoord resetten voor ${username}?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`${ADMIN_BASE}/users/${username}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset mislukt");
      const link = `${window.location.origin}${data.activationLink}`;
      setActivationLink(link);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset mislukt");
    }
  }

  function copyLink() {
    if (!activationLink) return;
    navigator.clipboard.writeText(activationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (authLoading) return <p className="loading-text">Laden...</p>;
  if (!isAuthenticated || !user?.isAdmin) return null;

  return (
    <>
      <div className="card">
        <h2>Gebruikers Beheren</h2>
        <form onSubmit={handleCreateUser} className="user-create-form">
          <div className="form-group">
            <label htmlFor="new-user">Nieuwe gebruiker</label>
            <div className="landing-input-group">
              <input
                id="new-user"
                type="text"
                placeholder="Gebruikersnaam"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                pattern="^[a-zA-Z0-9_]{3,30}$"
                title="3-30 tekens, letters, cijfers en underscores"
              />
              <button type="submit" className="btn-primary landing-go-btn" disabled={creatingUser}>
                {creatingUser ? "..." : "Aanmaken"}
              </button>
            </div>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newUserIsAdmin}
              onChange={(e) => setNewUserIsAdmin(e.target.checked)}
            />
            Admin
          </label>
        </form>

        {activationLink && (
          <div className="activation-link-box">
            <label>Activatielink</label>
            <div className="share-row">
              <input type="text" readOnly value={activationLink} />
              <button type="button" className="btn-secondary btn-small" onClick={copyLink}>
                {copied ? "Gekopieerd!" : "Kopieer"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        {loadingUsers ? (
          <p className="loading-text">Laden...</p>
        ) : users.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", fontSize: "0.9rem" }}>
            Geen gebruikers
          </p>
        ) : (
          <div className="users-list">
            {users.map((u) => (
              <div key={u.username} className="user-row">
                <div style={{ flex: 1 }}>
                  <span className="user-name">{u.username}</span>
                  {u.isAdmin && <span className="user-badge admin-badge">admin</span>}
                  {!u.activated && <span className="user-badge pending-badge">niet actief</span>}
                </div>
                <button
                  className="btn-secondary btn-small"
                  onClick={() => handleResetPassword(u.username)}
                >
                  Reset
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <TournamentList token={token!} />
    </>
  );
}
