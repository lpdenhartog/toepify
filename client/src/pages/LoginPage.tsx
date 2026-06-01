import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { checkBootstrap } from "../api/auth";

export default function LoginPage() {
  const { login, loginWithPin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const from = (location.state as { from?: string })?.from || "/";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
      return;
    }
    checkBootstrap()
      .then((data) => setBootstrapAvailable(data.pinLoginAvailable))
      .catch(() => {});
  }, [isAuthenticated, navigate, from]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithPin(pin);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="card">
        <h2>Inloggen</h2>
        {!showPin ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Gebruikersnaam</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Wachtwoord</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Inloggen..." : "Inloggen"}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePinLogin}>
            <div className="form-group">
              <label htmlFor="pin">Admin PIN</label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Inloggen..." : "Inloggen met PIN"}
            </button>
          </form>
        )}
        {bootstrapAvailable && (
          <button
            type="button"
            className="btn-secondary login-toggle-btn"
            onClick={() => { setShowPin(!showPin); setError(""); }}
          >
            {showPin ? "Inloggen met account" : "Inloggen met PIN"}
          </button>
        )}
      </div>
    </div>
  );
}
