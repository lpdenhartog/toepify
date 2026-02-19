import pg from "pg";
import bcrypt from "bcryptjs";

const TEST_USER = {
  username: "e2e_admin",
  password: "e2e-test-password-secure",
  isAdmin: true,
};

export default async function globalSetup() {
  const databaseUrl =
    process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL or DATABASE_URL must be set for E2E tests"
    );
  }

  // 1. Upsert test user directly in DB
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const hash = await bcrypt.hash(TEST_USER.password, 12);
    await pool.query(
      `INSERT INTO users (username, password_hash, is_admin)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE
         SET password_hash = $2, is_admin = $3`,
      [TEST_USER.username, hash, TEST_USER.isAdmin]
    );
  } finally {
    await pool.end();
  }

  // 2. Login via API to get JWT
  const baseURL = "http://localhost:3000";
  const res = await fetch(`${baseURL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: TEST_USER.username,
      password: TEST_USER.password,
    }),
  });

  if (!res.ok) {
    throw new Error(`Login failed during global setup: ${res.status}`);
  }

  const { token } = (await res.json()) as { token: string };

  // 3. Write storageState file for Playwright
  // The app stores the JWT in localStorage under "toepify_auth_token"
  const fs = await import("fs");
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [{ name: "toepify_auth_token", value: token }],
      },
    ],
  };

  fs.writeFileSync(
    "e2e/.auth-state.json",
    JSON.stringify(storageState, null, 2)
  );
}
