"""Disparate Impact Ratio (DIR) computation.

The four-fifths rule (EEOC Uniform Guidelines):
  DIR = unprivileged_approval_rate / privileged_approval_rate
  DIR >= 0.80 → no adverse impact
  DIR <  0.80 → potential adverse impact (flagged)

Both functions are pure — no side effects.
"""


def approval_rate(decisions: list[bool]) -> float:
    """Fraction of True values in decisions.

    Args:
        decisions: List of boolean approval outcomes.

    Returns:
        Float in [0.0, 1.0].  Returns 0.0 for an empty list (not nan —
        callers don't need to handle None/nan).
    """
    if not decisions:
        return 0.0
    return sum(decisions) / len(decisions)


def compute_dir(
    unprivileged_approval_rate: float,
    privileged_approval_rate: float,
) -> float:
    """Compute Disparate Impact Ratio.

    Args:
        unprivileged_approval_rate: Rate for the group with proxy fields
                                    redacted (perturbed condition).
        privileged_approval_rate:   Rate for the baseline (unredacted) group.

    Returns:
        DIR value.  Special cases:
        - privileged_rate == 0 and unprivileged_rate >  0 → float("inf")
        - privileged_rate == 0 and unprivileged_rate == 0 → 1.0
          (treat as equal, no bias signal)

    Notes:
        The four-fifths threshold (DIR_THRESHOLD = 0.80) is defined in
        agent1_auditor.py, not here, to keep this module purely computational.
    """
    if privileged_approval_rate == 0:
        return float("inf") if unprivileged_approval_rate > 0 else 1.0
    return unprivileged_approval_rate / privileged_approval_rate


def compute_dir_from_counts(
    unpriv_approved: int,
    unpriv_total: int,
    priv_approved: int,
    priv_total: int,
) -> float:
    """
    Compatibility wrapper for callers with raw counts instead of
    pre-computed rates (e.g. agent3_verifier.py's fixture-based flow).
    Converts counts to rates, then delegates to compute_dir() — the
    single source of truth for the DIR formula itself.
    """
    if unpriv_total == 0 or priv_total == 0:
        raise ValueError("total counts must be nonzero")
    unpriv_rate = unpriv_approved / unpriv_total
    priv_rate = priv_approved / priv_total
    return compute_dir(unpriv_rate, priv_rate)

