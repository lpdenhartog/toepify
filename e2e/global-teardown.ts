import pg from "pg";

export default async function globalTeardown() {
  const databaseUrl =
    process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) return;

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    // Truncate game data first to avoid FK violations, then delete the test user
    await pool.query(
      `TRUNCATE round_scores, rounds, game_players, games, players, user_tournaments, tournaments CASCADE`
    );
    await pool.query(`DELETE FROM users WHERE username = 'e2e_admin'`);
  } finally {
    await pool.end();
  }
}
