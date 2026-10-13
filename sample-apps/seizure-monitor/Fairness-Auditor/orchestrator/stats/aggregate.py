"""
stats/aggregate.py — Aggregate approval-rate delta check.

Complements the per-combo DIR check in dir.py.  After a policy patch, the
per-combo DIR for the *flagged* combos may improve while the overall approval
rate across all applicants drifts unexpectedly.  This module detects that
drift.

Threshold note
--------------
The 5-percentage-point (0.05) default threshold is a **judgment call** for
demo purposes.  It is NOT derived from a regulatory standard (the EEOC
four-fifths rule in 29 CFR §1607.4(D) applies to group-level selection rates,
not to aggregate before/after deltas).  A product-grade deployment should
set this threshold through a documented business-risk policy review.
"""

from __future__ import annotations


def compute_aggregate_approval_rate(
    pre_patch: dict,
    post_patch: dict,
    threshold: float = 0.05,
) -> dict:
    """
    Compute overall approval rate before and after a policy patch and flag a
    WARNING if the absolute change exceeds *threshold*.

    Args:
        pre_patch:  {"approved": int, "total": int} — counts before patching.
        post_patch: {"approved": int, "total": int} — counts after patching.
        threshold:  Absolute delta (in rate units, 0–1) above which a WARNING
                    is flagged.  Default 0.05 = 5 percentage points.  This is
                    a judgment call, not a regulatory number.

    Returns:
        {
            "pre_patch_rate":  float,  # e.g. 0.68 for 340/500
            "post_patch_rate": float,  # e.g. 0.67 for 335/500
            "delta":           float,  # absolute |post - pre|
            "flagged":         bool,   # True → delta > threshold (WARNING)
            "message":         str,    # human-readable summary
        }

    Raises:
        ValueError: If ``total`` is 0 for either input dict (guard against
                    silent division by zero).
        KeyError:   If either dict is missing "approved" or "total" keys.
    """
    pre_total  = int(pre_patch["total"])
    post_total = int(post_patch["total"])

    if pre_total == 0:
        raise ValueError(
            "pre_patch['total'] is 0 — cannot compute approval rate "
            "for an empty pre-patch applicant pool."
        )
    if post_total == 0:
        raise ValueError(
            "post_patch['total'] is 0 — cannot compute approval rate "
            "for an empty post-patch applicant pool."
        )

    pre_rate  = int(pre_patch["approved"])  / pre_total
    post_rate = int(post_patch["approved"]) / post_total
    delta     = abs(post_rate - pre_rate)
    flagged   = delta > threshold

    if flagged:
        message = (
            f"WARNING: aggregate approval rate shifted by "
            f"{delta:.4f} ({delta*100:.2f} pp), which exceeds the "
            f"{threshold*100:.1f} pp warning threshold.  "
            f"Pre-patch: {pre_rate:.4f} ({pre_patch['approved']}/{pre_total}), "
            f"Post-patch: {post_rate:.4f} ({post_patch['approved']}/{post_total}).  "
            "Review whether the policy patch inadvertently altered overall "
            "model calibration or approval volume."
        )
    else:
        message = (
            f"OK: aggregate approval rate is stable.  "
            f"Delta = {delta:.4f} ({delta*100:.2f} pp), "
            f"within the {threshold*100:.1f} pp warning threshold.  "
            f"Pre-patch: {pre_rate:.4f} ({pre_patch['approved']}/{pre_total}), "
            f"Post-patch: {post_rate:.4f} ({post_patch['approved']}/{post_total})."
        )

    return {
        "pre_patch_rate":  round(pre_rate,  6),
        "post_patch_rate": round(post_rate, 6),
        "delta":           round(delta,     6),
        "flagged":         flagged,
        "message":         message,
    }
