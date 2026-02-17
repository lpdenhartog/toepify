import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { checkActivationToken, activateAccount } from "../api/auth";

export default function ActivatePage() {
  const { token } = useParams<{ token: string }>();
  const [username, setUsername] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    checkActivationToken(token)
      .then((data) => {
        setValid(data.valid);
        if (data.username) setUsername(data.username);
      })
      .catch(() => setValid(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Wachtwoord moet minimaal 10 tekens zijn");
      return;
    }

    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }

    setLoading(true);
    try {
      await activateAccount(token!, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activering mislukt");
    } finally {
      setLoading(false);
    }
  }

  if (valid === null) {
    return <p className="loading-text">Laden...</p>;
  }

  if (!valid) {
    return (
      <div className="card">
        <h2>Ongeldige link</h2>
        <p>Deze activatielink is ongeldig of verlopen.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card success-card">
        <h2>Account geactiveerd</h2>
        <p>Je account <strong>{username}</strong> is geactiveerd.</p>
        <Link to="/login" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "1rem" }}>
          Ga naar inloggen
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Account activeren</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Gebruikersnaam</label>
          <input type="text" value={username} readOnly />
        </div>
        <div className="form-group">
          <label htmlFor="new-password">Wachtwoord (min. 10 tekens)</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={10}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirm-password">Bevestig wachtwoord</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={10}
            required
          />
        </div>
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Activeren..." : "Account Activeren"}
        </button>
      </form>
    </div>
  );
}
