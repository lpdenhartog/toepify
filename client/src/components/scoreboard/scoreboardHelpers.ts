import { useEffect, useState } from "react";
import type { GamePlayer, GameState, PlayerBalance } from "../../api/game";

// ---- landscape detection ---------------------------------------------------
// Landscape phone layout (e.g. iPhone lying down): short viewport where scores
// + pot must stay visible without scrolling. Desktop/tablet keep portrait.
export function useIsLandscapePhone(): boolean {
  const query = "(orientation: landscape) and (max-height: 540px)";
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return matches;
}

// ---- formatting helpers ----------------------------------------------------
export const displayScore = (val: number): string | number =>
  val === 14 ? "P" : val;

export const formatEuro = (amount: number): string => {
  const formatted = Math.abs(amount).toFixed(2).replace(".", ",");
  return amount >= 0 ? `+€${formatted}` : `−€${formatted}`;
};

export const formatPot = (amount: number): string =>
  `€${amount.toFixed(2).replace(".", ",")}`;

export function bigNumClass(player: GamePlayer, excluded: boolean): string {
  if (excluded || !player.is_active) return "is-dead";
  if (player.total_score === 14) return "is-pelt";
  if (player.total_score >= 15) return "is-out";
  return "";
}

// ---- view-model passed from the container to the layout components ----------
export interface ScoreboardView {
  tournament: GameState["tournament"];
  players: GamePlayer[];
  rounds: GameState["rounds"];
  pot: number;
  meta: string;
  abbreviations: Map<string, string>;
  historyScores: Array<Record<string, number>>;
  currentScores: Record<string, number>;
  sortedBalances: PlayerBalance[];
  canWrite: boolean;
  isActive: boolean;
  isCreator: boolean;
  showPlayerSelection: boolean;
  excludedPlayers: Set<string>;
  pendingPenalties: Record<string, number>;
  popped: string | null;
  bumped: Record<string, boolean>;
  penaltiesValid: boolean;
  finishingRound: boolean;
  undoingRound: boolean;
  buyingIn: boolean;
  scoreSpeechSupported: boolean;
  scoreSpeechEnabled: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  colStyle: React.CSSProperties;
  celebration: React.ReactNode;
  qrOverlay: React.ReactNode;
  onTogglePlayer: (id: string) => void;
  onTap: (id: string) => void;
  onCancelRound: () => void;
  onFinishRound: () => void;
  onUndo: () => void;
  onBuyIn: (id: string) => void;
  canBuyIn: (id: string) => boolean;
  onToggleScoreSpeech: () => void;
  onReadScore: () => void;
  onOpenShare: () => void;
  onCloseTournament: () => void;
}
