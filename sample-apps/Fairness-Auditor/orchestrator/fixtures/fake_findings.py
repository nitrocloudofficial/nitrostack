"""
Fake findings data for development/testing.

Used as seed data so Agent 2 and Agent 3 skeletons can run without
waiting for Agent 1 (Person B's branch) to merge at Hour 6.
"""

FAKE_SCAN_RUN_ID = "00000000-0000-0000-0000-000000000001"

FAKE_FINDINGS = [
    {
        "id": "00000000-0000-0000-0000-000000000101",
        "scan_run_id": FAKE_SCAN_RUN_ID,
        "track": "bias",
        "combo_key": "zip_code=90210",
        "dir_value": 0.58,
        "p_value": 0.001,
        "fdr_adjusted_p": 0.004,
        "status": "open",
    },
    {
        "id": "00000000-0000-0000-0000-000000000102",
        "scan_run_id": FAKE_SCAN_RUN_ID,
        "track": "bias",
        "combo_key": "applicant_name=Jamal",
        "dir_value": 0.62,
        "p_value": 0.003,
        "fdr_adjusted_p": 0.009,
        "status": "open",
    },
]

# ---------------------------------------------------------------------------
# Aggregate approval counts — baseline for aggregate decision rate check.
# Pre-patch:  340 out of 500 applicants approved (68.0%).
# Post-patch: 335 out of 500 applicants approved (67.0%).
# Delta = |0.670 - 0.680| = 0.010 (1 percentage point) — below the 0.05
# warning threshold, so flagged=False in compute_aggregate_approval_rate().
#
# TODO(Hour 9-12 target-service integration): replace these fixture counts
# with real aggregate approval counts queried from target-service's full
# applicant pool, once that integration exists.
# ---------------------------------------------------------------------------
FAKE_AGGREGATE_PRE_PATCH  = {"approved": 340, "total": 500}
FAKE_AGGREGATE_POST_PATCH = {"approved": 335, "total": 500}
