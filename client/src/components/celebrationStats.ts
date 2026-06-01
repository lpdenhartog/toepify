import type { GamePlayer, Round } from "../api/game";

export interface MostPenaltyStat {
  points: number;
  playerNames: string[];
}

export interface PlayerPointsStat {
  points: number;
  playerNames: string[];
}

export interface PlayerRoundCountEntry {
  playerName: string;
  matchingRounds: number;
  playedRounds: number;
}

export interface PlayerRoundCountStat {
  rounds: number;
  players: PlayerRoundCountEntry[];
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

function getPlayerNameMap(players: GamePlayer[]): Map<string, string> {
  return new Map(players.map((player) => [player.player_id, player.player_name]));
}

function namesForTopPlayers(
  totals: Map<string, number>,
  playerNames: Map<string, string>,
  topValue: number
): string[] {
  if (topValue <= 0) return [];

  return Array.from(totals.entries())
    .filter(([, total]) => total === topValue)
    .map(([playerId]) => playerNames.get(playerId))
    .filter((name): name is string => Boolean(name));
}

export function getSloperStat(
  rounds: Round[],
  players: GamePlayer[]
): PlayerPointsStat {
  const playerNames = getPlayerNameMap(players);
  const damageByPlayer = new Map(players.map((player) => [player.player_id, 0]));

  for (const round of getNormalRounds(rounds)) {
    const damage = round.scores
      .filter((score) => score.penalty_points >= 2)
      .reduce((sum, score) => sum + score.penalty_points, 0);

    if (damage === 0) continue;

    for (const score of round.scores) {
      if (score.penalty_points === 0 && damageByPlayer.has(score.player_id)) {
        damageByPlayer.set(
          score.player_id,
          (damageByPlayer.get(score.player_id) ?? 0) + damage
        );
      }
    }
  }

  const points = Math.max(0, ...damageByPlayer.values());

  return {
    points,
    playerNames: namesForTopPlayers(damageByPlayer, playerNames, points),
  };
}

export function getSnurkerStat(
  rounds: Round[],
  players: GamePlayer[]
): PlayerRoundCountStat {
  const playerNames = getPlayerNameMap(players);
  const onePointRoundsByPlayer = new Map(
    players.map((player) => [player.player_id, 0])
  );
  const playedRoundsByPlayer = new Map(
    players.map((player) => [player.player_id, 0])
  );

  for (const round of getNormalRounds(rounds)) {
    for (const score of round.scores) {
      if (!playedRoundsByPlayer.has(score.player_id)) continue;

      playedRoundsByPlayer.set(
        score.player_id,
        (playedRoundsByPlayer.get(score.player_id) ?? 0) + 1
      );

      if (score.penalty_points === 1) {
        onePointRoundsByPlayer.set(
          score.player_id,
          (onePointRoundsByPlayer.get(score.player_id) ?? 0) + 1
        );
      }
    }
  }

  const roundCount = Math.max(0, ...onePointRoundsByPlayer.values());

  return {
    rounds: roundCount,
    players: Array.from(onePointRoundsByPlayer.entries())
      .filter(([, total]) => total === roundCount && roundCount > 0)
      .map(([playerId, matchingRounds]) => {
        const playerName = playerNames.get(playerId);
        if (!playerName) return null;

        return {
          playerName,
          matchingRounds,
          playedRounds: playedRoundsByPlayer.get(playerId) ?? 0,
        };
      })
      .filter((entry): entry is PlayerRoundCountEntry => Boolean(entry)),
  };
}
