INSERT INTO scan_run (
  id,
  target_name,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'loan-decision-service',
  'completed'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO mitigation_policy (
  id,
  scan_run_id,
  redact_fields,
  neutral_value,
  group_adjustments,
  rationale,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '["zip_code"]'::jsonb,
  'REDACTED',
  '{"10044": {"threshold_delta": 0.06}}'::jsonb,
  'Geographic bias mitigation policy for zip code 10044',
  true
) ON CONFLICT (id) DO UPDATE SET is_active = true;
