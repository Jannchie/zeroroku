CREATE TABLE IF NOT EXISTS sponsors (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  sponsored_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_sponsors_sponsored_at
  ON sponsors (sponsored_at);
