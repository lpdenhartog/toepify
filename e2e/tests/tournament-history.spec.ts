import { test, expect } from "../fixtures/auth.fixture";
import {
  closeTournament,
  createTournament,
  finishGame,
  finishRound,
  getLatestGame,
  resetDb,
  startNewGame,
} from "../helpers/api";

test.describe("Tournament history", () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test("opens from the tournament name and shows games in order", async ({
    authPage,
  }) => {
    const tournament = await createTournament("Historie Test", [
      "Alice",
      "Bob",
    ]);
    const firstGame = await getLatestGame(tournament.id);
    const firstPlayers = firstGame.players;

    await finishRound(
      firstGame.game.id,
      firstPlayers.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 10 : 0,
      })),
    );
    await finishRound(
      firstGame.game.id,
      firstPlayers.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 5 : 0,
      })),
    );
    await finishGame(firstGame.game.id);

    await startNewGame(tournament.id);
    const secondGame = await getLatestGame(tournament.id);
    await finishRound(
      secondGame.game.id,
      secondGame.players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Bob" ? 1 : 0,
      })),
    );

    await authPage.goto(`/t/${tournament.id}`);
    await authPage.getByRole("link", { name: "Historie Test" }).click();

    await expect(authPage).toHaveURL(`/t/${tournament.id}/history`);
    await expect(authPage.getByRole("heading", { name: "Spel 1" })).toBeVisible();
    await expect(authPage.getByRole("heading", { name: "Spel 2" })).toBeVisible();
    await expect(authPage.locator(".tp-drama")).toHaveCount(2);

    await authPage.getByRole("link", { name: "Terug naar spel" }).click();
    await expect(authPage).toHaveURL(`/t/${tournament.id}`);
  });

  test("opens from a closed tournament", async ({ authPage }) => {
    const tournament = await createTournament("Gesloten Historie", [
      "Alice",
      "Bob",
    ]);
    const gameState = await getLatestGame(tournament.id);

    await finishRound(
      gameState.game.id,
      gameState.players.map((p: { player_id: string; player_name: string }) => ({
        playerId: p.player_id,
        points: p.player_name === "Alice" ? 15 : 0,
      })),
    );
    await finishGame(gameState.game.id);
    await closeTournament(tournament.id);

    await authPage.goto(`/t/${tournament.id}`);
    await expect(authPage.locator(".tournament-closed")).toBeVisible();

    await authPage.getByRole("link", { name: "Gesloten Historie" }).click();
    await expect(authPage).toHaveURL(`/t/${tournament.id}/history`);
    await expect(authPage.getByRole("heading", { name: "Spel 1" })).toBeVisible();
    await expect(authPage.locator(".tp-drama")).toHaveCount(1);
  });
});
