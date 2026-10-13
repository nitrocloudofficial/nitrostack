"""Fisher's exact test + Benjamini-Hochberg FDR correction.

Gap #1 — correct_pvalues() is a hard, PR-blocking requirement.
Every raw p-value from the sweep MUST pass through this function
before any combo is flagged.  The BH-adjusted p-value (not the raw p-value)
is what gets written to finding.fdr_adjusted_p.

Why Fisher's exact vs. chi-square?
  Fisher's exact computes the exact probability of the observed 2×2
  contingency table under the null hypothesis.  With per-combo sample
  sizes in the tens, the chi-square large-sample approximation can be
  unreliable — Fisher's exact stays valid regardless of cell counts.

Why BH-FDR vs. Bonferroni?
  Bonferroni controls the probability of *any* false positive (FWER),
  growing more conservative as the number of combos grows.  BH controls
  the *expected proportion* of false positives among flagged findings (FDR)
  — less conservative, so across dozens of combo sweeps it catches real
  drift that Bonferroni would wash out, at the cost of a controlled
  false-discovery rate rather than zero false-positive tolerance.
"""
from scipy.stats import fisher_exact
from statsmodels.stats.multitest import multipletests


def fisher_test(
    privileged_approved: int,
    privileged_denied: int,
    unprivileged_approved: int,
    unprivileged_denied: int,
) -> tuple[float, float]:
    """Run a two-sided Fisher's exact test on a 2×2 contingency table.

    Args:
        privileged_approved:   # approved in baseline (unredacted) group.
        privileged_denied:     # denied  in baseline (unredacted) group.
        unprivileged_approved: # approved in perturbed (redacted) group.
        unprivileged_denied:   # denied  in perturbed (redacted) group.

    Returns:
        (odds_ratio, p_value) — p_value is the two-sided Fisher's exact p.
    """
    table = [
        [privileged_approved, privileged_denied],
        [unprivileged_approved, unprivileged_denied],
    ]
    odds_ratio, p_value = fisher_exact(table)
    return float(odds_ratio), float(p_value)


def correct_pvalues(
    raw_pvalues: list[float],
    alpha: float = 0.05,
) -> tuple[list[bool], list[float]]:
    """Apply Benjamini-Hochberg FDR correction across a batch of raw p-values.

    Gap #1 gate — this is the PR-blocking requirement.  Call this once,
    after all raw p-values are collected, before flagging ANY combo.

    Args:
        raw_pvalues: Raw p-values from fisher_test(), one per combo tested.
                     Must be in the SAME ORDER as your raw_results list so
                     the returned arrays align correctly.
        alpha:       Target FDR level.  Defaults to BH_FDR_ALPHA from .env
                     (0.05).

    Returns:
        (reject, adjusted) where:
          reject   — list[bool], True if the BH-corrected result is significant.
          adjusted — list[float], BH-adjusted p-values (always >= raw p-values).

    Notes:
        - Returns ([], []) for an empty input — safe to call with no combos.
        - adjusted[i] >= raw_pvalues[i] is guaranteed by construction of BH.
          test_fisher_bh.py verifies this invariant explicitly.
    """
    if not raw_pvalues:
        return [], []
    reject, adjusted, _, _ = multipletests(raw_pvalues, alpha=alpha, method="fdr_bh")
    return list(reject), list(adjusted)

# Alias for Agent 3 / smoke_test.py compatibility.
# NOTE: argument order is REVERSED from fisher_test() — test_combo expects
# (unpriv_approved, unpriv_denied, priv_approved, priv_denied), fisher_test
# expects (priv_approved, priv_denied, unpriv_approved, unpriv_denied).
# VERIFIED: test_combo(a,b,c,d) maps unpriv to row 1, priv to row 0 in fisher_test; p-value is identical for two-sided test.
def test_combo(unpriv_approved, unpriv_denied, priv_approved, priv_denied):
    return fisher_test(priv_approved, priv_denied, unpriv_approved, unpriv_denied)