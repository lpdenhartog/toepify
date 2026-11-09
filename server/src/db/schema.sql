CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stake_per_game NUMERIC NOT NULL DEFAULT 2.50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  status TEXT NOT NULL DEFAULT 'active',
  winner_player_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_tournament ON games(tournament_id, created_at DESC);

CREATE TABLE IF NOT EXISTS game_players (
  game_id UUID NOT NULL REFERENCES games(id),
  player_id UUID NOT NULL REFERENCES players(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  buy_ins INT NOT NULL DEFAULT 0,
  total_score INT NOT NULL DEFAULT 0,
  can_buy_in BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (game_id, player_id)
);

ALTER TABLE game_players ADD COLUMN IF NOT EXISTS can_buy_in BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id),
  round_number INT NOT NULL,
  round_type TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rounds ADD COLUMN IF NOT EXISTS round_type TEXT NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_rounds_game ON rounds(game_id, round_number);

CREATE TABLE IF NOT EXISTS round_scores (
  round_id UUID NOT NULL REFERENCES rounds(id),
  player_id UUID NOT NULL REFERENCES players(id),
  penalty_points INT NOT NULL DEFAULT 0,
  PRIMARY KEY (round_id, player_id)
);

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  activation_token TEXT,
  activation_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(username);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS user_tournaments (
  username TEXT NOT NULL REFERENCES users(username),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  last_visited TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, tournament_id)
);

-- Monotonic revision includes undo and buy-ins, preventing stale writer submissions.
ALTER TABLE games ADD COLUMN IF NOT EXISTS revision INT NOT NULL DEFAULT 0;

-- Keep receipts independently of rounds so retrying an undone round never recreates it.
CREATE TABLE IF NOT EXISTS round_submissions (
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (game_id, request_id)
);

-- A tournament revision detects changes across all games, including legacy writers.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS gameplay_receipts (
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  before_revision BIGINT NOT NULL,
  after_revision BIGINT NOT NULL,
  PRIMARY KEY (tournament_id, request_id)
);
CREATE OR REPLACE FUNCTION bump_tournament_game_revision() RETURNS trigger AS $$
BEGIN
  UPDATE tournaments SET revision = revision + 1 WHERE id = NEW.tournament_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS game_tournament_revision ON games;
CREATE TRIGGER game_tournament_revision AFTER INSERT OR UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION bump_tournament_game_revision();
CREATE OR REPLACE FUNCTION bump_tournament_status_revision() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.revision = OLD.revision + 1; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tournament_status_revision ON tournaments;
CREATE TRIGGER tournament_status_revision BEFORE UPDATE ON tournaments
FOR EACH ROW EXECUTE FUNCTION bump_tournament_status_revision();
