import type { GamePlayer } from "../../api/game";
import { bigNumClass, displayScore } from "./scoreboardHelpers";

// Reusable scoreboard cells/components, shared by the portrait and landscape
// layouts. Kept component-only so React Fast Refresh works; pure helpers and
// the ScoreboardView type live in ./scoreboardHelpers.

// ---- icons -----------------------------------------------------------------
export const IconCancel = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);
export const IconCheck = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 22 22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 11.5l4.5 4.5L18 6" />
  </svg>
);
export const IconUndo = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 8h8.5a3.5 3.5 0 010 7H7" />
    <path d="M5.5 4.5L3 8l3.5 3" />
  </svg>
);
export const IconShare = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
  >
    <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
    <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
    <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M9.5 9.5h2v2M14.5 9.5v5M9.5 14.5h2" strokeLinecap="round" />
  </svg>
);
export const IconVolume = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 7v4h3l4 3.5v-11L6 7H3z" />
    <path d="M13 6.5a4 4 0 010 5" />
    <path d="M15 4a7 7 0 010 10" />
  </svg>
);

export const Suits = () => (
  <span className="tp-suits" aria-hidden="true">
    <span className="s-dark">&#9824;</span>
    <span className="s-red">&#9829;</span>
    <span className="s-red">&#9830;</span>
    <span className="s-dark">&#9827;</span>
  </span>
);

// ---- shared cells ----------------------------------------------------------
export function PlayerHead({
  player,
  abbreviation,
  showSelection,
  excluded,
  onToggle,
}: {
  player: GamePlayer;
  abbreviation: string | undefined;
  showSelection: boolean;
  excluded: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="tp-phead player-header">
      {showSelection && (
        <input
          type="checkbox"
          className="player-checkbox"
          checked={!excluded}
          onChange={() => onToggle(player.player_id)}
        />
      )}
      <span className="tp-pname player-header-name" title={player.player_name}>
        {abbreviation}
      </span>
      {!showSelection && player.is_active && player.total_score === 14 && (
        <span className="tp-chip tp-chip-pelt status-pelt">Pelt!</span>
      )}
      {!showSelection && !player.is_active && (
        <span className="tp-chip tp-chip-out status-out">Uit</span>
      )}
    </div>
  );
}

export function TapButton({
  player,
  excluded,
  value,
  popped,
  onTap,
}: {
  player: GamePlayer;
  excluded: boolean;
  value: number;
  popped: boolean;
  onTap: (id: string) => void;
}) {
  if (!(player.is_active && !excluded)) {
    return <div className="tp-gutter-dead">&mdash;</div>;
  }
  return (
    <button
      className={`penalty-btn tp-tapbtn${value > 0 ? " has-val" : ""}${
        player.total_score === 14 ? " is-pelt" : ""
      }${popped ? " tp-pop" : ""}`}
      onClick={() => onTap(player.player_id)}
      aria-label={`Strafpunten ${player.player_name}: ${value}`}
    >
      {value}
    </button>
  );
}

export function HeroNumber({
  player,
  value,
  excluded,
  bumped,
}: {
  player: GamePlayer;
  value: number;
  excluded: boolean;
  bumped: boolean;
}) {
  return (
    <div
      className={`tp-bignum ${bigNumClass(player, excluded)}${bumped ? " tp-bump" : ""}`}
    >
      {displayScore(value)}
    </div>
  );
}

export function ModeBadge({ canWrite }: { canWrite: boolean }) {
  return canWrite ? (
    <span className="tp-mode">Schrijfmodus</span>
  ) : (
    <span className="tp-mode tp-mode-viewer">
      <span className="tp-livedot" />
      Kijkmodus &middot; live
    </span>
  );
}

export function BuyInSection({
  players,
  canBuyIn,
  buyingIn,
  onBuyIn,
  stakePerGame,
}: {
  players: GamePlayer[];
  canBuyIn: (id: string) => boolean;
  buyingIn: boolean;
  onBuyIn: (id: string) => void;
  stakePerGame: number;
}) {
  const eligible = players.filter((p) => canBuyIn(p.player_id));
  if (eligible.length === 0) return null;
  const maxActiveScore = Math.max(
    ...players.filter((p) => p.is_active).map((p) => p.total_score),
    0,
  );
  return (
    <div className="buyin-section">
      {eligible.map((p) => (
        <button
          key={p.player_id}
          className="btn-buyin tp-buyin"
          disabled={buyingIn}
          onClick={() => onBuyIn(p.player_id)}
        >
          {p.player_name} inkopen op {displayScore(maxActiveScore)} (&euro;
          {stakePerGame.toFixed(2).replace(".", ",")})
        </button>
      ))}
    </div>
  );
}

export function RoundActions({
  showUndo,
  onCancel,
  onFinish,
  finishDisabled,
  undoing,
  onUndo,
}: {
  showUndo: boolean;
  onCancel: () => void;
  onFinish: () => void;
  finishDisabled: boolean;
  undoing: boolean;
  onUndo: () => void;
}) {
  return (
    <div className="tp-actions">
      <button
        className="tp-act tp-act-cancel"
        onClick={onCancel}
        aria-label="Annuleer ronde"
      >
        <IconCancel />
      </button>
      <button
        className="tp-act tp-act-finish"
        onClick={onFinish}
        disabled={finishDisabled}
        aria-label="Ronde afsluiten"
      >
        <IconCheck />
      </button>
      {showUndo && (
        <button
          className="tp-act tp-act-undo"
          disabled={undoing}
          onClick={onUndo}
          aria-label="Laatste ronde ongedaan maken"
        >
          <IconUndo />
        </button>
      )}
    </div>
  );
}

export function ScoreSpeechControls({
  supported,
  enabled,
  onToggle,
  onRead,
}: {
  supported: boolean;
  enabled: boolean;
  onToggle: () => void;
  onRead: () => void;
}) {
  return (
    <div className="tp-speech" aria-label="Stand voorlezen">
      <button
        className="tp-speech-btn"
        onClick={onRead}
        disabled={!supported}
        aria-label="Stand voorlezen"
        title={supported ? "Stand voorlezen" : "Voorlezen niet ondersteund"}
      >
        <IconVolume />
      </button>
      <label className={`tp-speech-toggle${!supported ? " is-disabled" : ""}`}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={!supported}
          onChange={onToggle}
        />
        <span>Lees stand voor</span>
      </label>
    </div>
  );
}
