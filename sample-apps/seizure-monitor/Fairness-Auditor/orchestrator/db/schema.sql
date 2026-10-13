CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS scan_run (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_name   TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS finding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_run_id     UUID NOT NULL REFERENCES scan_run(id),
  track           TEXT NOT NULL DEFAULT 'bias',
  combo_key       TEXT,
  dir_value       NUMERIC,
  p_value         NUMERIC,
  fdr_adjusted_p  NUMERIC,
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mitigation_policy (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_run_id         UUID NOT NULL REFERENCES scan_run(id),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  redact_fields       JSONB NOT NULL DEFAULT '[]',
  neutral_value       TEXT NOT NULL DEFAULT 'REDACTED',
  group_adjustments   JSONB NOT NULL DEFAULT '{}',
  rationale           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mitigation_edges (
  finding_id  UUID NOT NULL REFERENCES finding(id),
  policy_id   UUID NOT NULL REFERENCES mitigation_policy(id),
  PRIMARY KEY (finding_id, policy_id)
);

CREATE TABLE IF NOT EXISTS ci_gate_result (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_run_id  UUID NOT NULL REFERENCES scan_run(id),
  passed       BOOLEAN NOT NULL,
  summary      JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
