import { useState } from "react";
import { createTournament } from "../api/admin";
import type { Tournament } from "../api/admin";

interface Props {
  token: string;
}

export default function CreateTournament({ token }: Props) {
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
    setError("");
    setLoading(true);
    try {
      const tournament = await createTournament(token, {
        name,
        stakePerGame,
        playerNames,
      });
      setResult(tournament);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tournament");
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
        <h2>Tournament Created</h2>
        <p className="tournament-name">{result.name}</p>
        <p className="detail">&euro;{result.stakePerGame.toFixed(2)} per game</p>
        <div className="players-list">
          {result.players.map((p) => (
            <span key={p.id} className="player-chip">{p.name}</span>
          ))}
        </div>
        <div className="share-section">
          <label>Share this link with players</label>
          <div className="share-row">
            <input type="text" readOnly value={joinUrl} />
            <button type="button" className="btn-secondary btn-small" onClick={copyLink}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setResult(null)}
          style={{ marginTop: "1rem" }}
        >
          Create Another
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>New Tournament</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Tournament Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Friday Game Night"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="stake">Stake per Game (&euro;)</label>
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
          <legend>Players (2&ndash;6)</legend>
          {playerNames.map((pname, i) => (
            <div key={i} className="player-row">
              <span className="player-number">{i + 1}</span>
              <input
                type="text"
                value={pname}
                onChange={(e) => updatePlayerName(i, e.target.value)}
                placeholder={`Player ${i + 1}`}
                required
              />
              {playerNames.length > 2 && (
                <button type="button" className="btn-danger btn-small" onClick={() => removePlayer(i)}>
                  Remove
                </button>
              )}
            </div>
          ))}
          {playerNames.length < 6 && (
            <button type="button" className="btn-secondary btn-small" onClick={addPlayer} style={{ marginTop: "0.25rem" }}>
              + Add Player
            </button>
          )}
        </fieldset>
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create Tournament"}
        </button>
      </form>
    </div>
  );
}
