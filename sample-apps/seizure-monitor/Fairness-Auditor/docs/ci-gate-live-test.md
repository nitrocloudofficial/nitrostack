# AFO CI Gate Live Test Evidence

This document was added as part of the live CI gate test (Hour 14-17 slot).

**Purpose:** Trigger the `afo-gate.yml` GitHub Actions workflow by opening a PR
from `test/ci-gate-live-check` → `feat/agent2-3-policy` with a trivial change.

**What was tested:**
1. PASSING case: DIR=0.94, both combos crossing 0.80 threshold, adjusted_p=0.2424 (not significant)
2. FAILING case: Temporary fixture with DIR=0.55, still_significant=true

**Note on target branch:** This PR targets `feat/agent2-3-policy` (NOT `main`) because:
- A's and B's branches are not yet merged
- `main` only has the baseSetup commit and merging here would contaminate it
- `feat/agent2-3-policy` is the stable, working base for this gate test
