import type { GamePlayer } from "../../api/game";

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
