import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../contexts/AuthContext";
import { createTournament } from "../api/tournaments";
import type { Tournament } from "../api/tournaments";

interface Props {
  onCreated?: () => void;
}

export default function CreateTournament({ onCreated }: Props) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [stakePerGame, setStakePerGame] = useState(2.5);
  const [playerNames, setPlayerNames] = useState(["", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Tournament | null>(null);
  const [copied, setCopied] = useState(false);

  function addPlayer() {
    if (playerNames.length < 6) {
      setPlayerNames([...playerNames, ""]);
    }
  }

  function removePlayer(index: number) {
    if (playerNames.length > 2) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  }

  function updatePlayerName(index: number, value: string) {
    const updated = [...playerNames];
    updated[index] = value;
    setPlayerNames(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const tournament = await createTournament(token, {
        name,
        stakePerGame,
        playerNames,
      });
      setResult(tournament);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toernooi aanmaken mislukt");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!result) return;
    const url = `${window.location.origin}${result.joinLink}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    const joinUrl = `${window.location.origin}${result.joinLink}`;
    return (
      <div className="card success-card">
        <h2>Toernooi Aangemaakt</h2>
        <p className="tournament-name">{result.name}</p>
        <p className="detail">&euro;{result.stakePerGame.toFixed(2)} per spel</p>
        <div className="players-list">
          {result.players.map((p) => (
            <span key={p.id} className="player-chip">{p.name}</span>
          ))}
        </div>
        <div className="qr-section">
          <QRCodeSVG value={joinUrl} size={200} />
        </div>
        <div className="share-section">
          <label>Deel deze link met spelers</label>
          <div className="share-row">
            <input type="text" readOnly value={joinUrl} />
            <button type="button" className="btn-secondary btn-small" onClick={copyLink}>
              {copied ? "Gekopieerd!" : "Kopieer"}
            </button>
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setResult(null)}
          style={{ marginTop: "1rem" }}
        >
          Nieuw Toernooi
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Nieuw Toernooi</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Toernooi Naam</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bijv. Vrijdagavond Toepen"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="stake">Inzet per Spel (&euro;)</label>
          <input
            id="stake"
            type="number"
            value={stakePerGame}
            onChange={(e) => setStakePerGame(Number(e.target.value))}
            min={0}
            step={0.5}
          />
        </div>
        <fieldset>
          <legend>Spelers (2&ndash;6)</legend>
          {playerNames.map((pname, i) => (
            <div key={i} className="player-row">
              <span className="player-number">{i + 1}</span>
              <input
                type="text"
                value={pname}
                onChange={(e) => updatePlayerName(i, e.target.value)}
                placeholder={`Speler ${i + 1}`}
                required
              />
              {playerNames.length > 2 && (
                <button type="button" className="btn-danger btn-small" onClick={() => removePlayer(i)}>
                  Verwijder
                </button>
              )}
            </div>
          ))}
          {playerNames.length < 6 && (
            <button type="button" className="btn-secondary btn-small" onClick={addPlayer} style={{ marginTop: "0.25rem" }}>
              + Speler Toevoegen
            </button>
          )}
        </fieldset>
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Aanmaken..." : "Toernooi Aanmaken"}
        </button>
      </form>
    </div>
  );
}
