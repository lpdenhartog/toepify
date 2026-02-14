import { useState } from "react";
import { login } from "../api/admin";

interface Props {
  onLogin: (token: string) => void;
}

export default function PinLogin({ onLogin }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await login(pin);
      onLogin(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Admin Inloggen</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="pin">Pincode</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Voer admin pincode in"
            required
          />
        </div>
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Controleren..." : "Inloggen"}
        </button>
      </form>
    </div>
  );
}
