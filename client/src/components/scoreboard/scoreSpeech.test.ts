import { describe, expect, it } from "vitest";
import {
  buildScoreSpeechText,
  formatScoreForSpeech,
  getBestDutchVoice,
  type ScoreSpeechPlayer,
} from "./scoreSpeech";

const players: ScoreSpeechPlayer[] = [
  { player_id: "p1", player_name: "Jan" },
  { player_id: "p2", player_name: "Sophie" },
  { player_id: "p3", player_name: "Daan" },
];

describe("score speech", () => {
  it("formats normal scores as Dutch point labels", () => {
    expect(formatScoreForSpeech(0)).toBe("0 punten");
    expect(formatScoreForSpeech(1)).toBe("1 punt");
    expect(formatScoreForSpeech(7)).toBe("7 punten");
    expect(formatScoreForSpeech(16)).toBe("16 punten");
  });

  it("formats 14 as pelt", () => {
    expect(formatScoreForSpeech(14)).toBe("pelt");
  });

  it("builds score text in player order", () => {
    expect(
      buildScoreSpeechText(players, {
        p1: 4,
        p2: 14,
        p3: 16,
      }),
    ).toBe("Jan, 4 punten. Sophie, pelt. Daan, 16 punten.");
  });

  it("falls back to zero for missing scores", () => {
    expect(buildScoreSpeechText(players.slice(0, 1), {})).toBe(
      "Jan, 0 punten.",
    );
  });

  it("prefers exact Dutch voices before other Dutch variants", () => {
    const voices = [
      { lang: "en-US", name: "English" },
      { lang: "nl-BE", name: "Flemish" },
      { lang: "nl-NL", name: "Dutch" },
    ] as SpeechSynthesisVoice[];

    expect(getBestDutchVoice(voices)?.name).toBe("Dutch");
  });
});
