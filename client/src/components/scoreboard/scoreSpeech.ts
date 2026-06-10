import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePlayer } from "../../api/game";

const STORAGE_KEY = "toepify_score_speech_enabled";

export type ScoreSpeechPlayer = Pick<GamePlayer, "player_id" | "player_name">;

export function formatScoreForSpeech(score: number): string {
  if (score === 14) return "pelt";
  return `${score} ${score === 1 ? "punt" : "punten"}`;
}

export function buildScoreSpeechText(
  players: ScoreSpeechPlayer[],
  currentScores: Record<string, number>,
): string {
  return players
    .map((player) => {
      const score = currentScores[player.player_id] ?? 0;
      return `${player.player_name}, ${formatScoreForSpeech(score)}.`;
    })
    .join(" ");
}

export function getBestDutchVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return (
    voices.find((voice) => voice.lang.toLowerCase() === "nl-nl") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("nl-"))
  );
}

export function canUseScoreSpeech(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function speakScoreText(text: string): boolean {
  if (!canUseScoreSpeech()) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "nl-NL";
  utterance.rate = 0.92;

  const voice = getBestDutchVoice(window.speechSynthesis.getVoices());
  if (voice) utterance.voice = voice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function useScoreSpeech({
  players,
  currentScores,
  roundsLength,
  canWrite,
}: {
  players: ScoreSpeechPlayer[];
  currentScores: Record<string, number>;
  roundsLength: number;
  canWrite: boolean;
}) {
  const [supported, setSupported] = useState(() => canUseScoreSpeech());
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });
  const previousRoundsLengthRef = useRef(roundsLength);
  const didInitRef = useRef(false);

  useEffect(() => {
    if (!canUseScoreSpeech()) return;

    const syncSupport = () => setSupported(canUseScoreSpeech());
    syncSupport();
    window.speechSynthesis.addEventListener("voiceschanged", syncSupport);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", syncSupport);
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  }, [enabled]);

  const speakCurrentScore = useCallback(() => {
    return speakScoreText(buildScoreSpeechText(players, currentScores));
  }, [currentScores, players]);

  useEffect(() => {
    const previousRoundsLength = previousRoundsLengthRef.current;
    previousRoundsLengthRef.current = roundsLength;

    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }

    if (!supported || !enabled || !canWrite) return;
    if (roundsLength > previousRoundsLength) {
      speakCurrentScore();
    }
  }, [canWrite, enabled, roundsLength, speakCurrentScore, supported]);

  return {
    enabled,
    setEnabled,
    supported,
    speakCurrentScore,
  };
}
