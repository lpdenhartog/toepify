import type { GamePlayer, Round } from "../api/game";

export interface MostPenaltyStat {
  points: number;
  playerNames: string[];
}

export function isBuyInRound(round: Round): boolean {
  return (
    round.round_type === "buy_in" ||
    (round.round_type === undefined &&
      round.scores.some((score) => score.penalty_points < 0))
  );
}

export function getNormalRounds(rounds: Round[]): Round[] {
  return rounds.filter((round) => !isBuyInRound(round));
}

export function getMostPenaltyStat(
  rounds: Round[],
  players: GamePlayer[]
): MostPenaltyStat {
  const playerNames = new Map(
    players.map((player) => [player.player_id, player.player_name])
  );
  let points = 0;
  const playerIds = new Set<string>();

  for (const round of getNormalRounds(rounds)) {
    for (const score of round.scores) {
      if (score.penalty_points > points) {
        points = score.penalty_points;
        playerIds.clear();
      }
      if (score.penalty_points === points && points > 0) {
        playerIds.add(score.player_id);
      }
    }
  }

  return {
    points,
    playerNames: Array.from(playerIds)
      .map((playerId) => playerNames.get(playerId))
      .filter((name): name is string => Boolean(name)),
  };
}
