ALTER TABLE obligations
  ADD COLUMN IF NOT EXISTS health_score integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_obligations_health_score
  ON obligations (health_score);
