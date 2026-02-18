CREATE TABLE eval_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  f1              REAL NOT NULL,
  precision_score REAL NOT NULL,
  recall          REAL NOT NULL,
  latency_ms      INTEGER NOT NULL,
  token_cost      REAL NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
