# SentinelPay AI — Demo Script (≤3 minutes)

## Scenario

A user asks the connected agent:

> "Investigate transaction TX-827 and tell me whether it should be released."

## Timing

**0:00–0:20 — Setup**
State the problem: an AI agent that can *recommend* financial actions but
must never be able to *execute* them unsupervised.

**0:20–0:50 — Investigation begins**
Agent calls `getTransaction` for `TX-827`:
- Amount ₹8,42,000, vendor `VENDOR-032`, invoice `INV-5521`,
  beneficiary `XXXX8291`.

**0:50–1:30 — Evidence gathering**
Agent calls `verifyVendor`, `analyzeInvoice`, `getPaymentHistory`:
- Verified beneficiary account is `XXXX4412` — **mismatch** against the
  transaction's `XXXX8291`.
- Invoice matches the transaction amount; not flagged duplicate.
- Historical average payment to this vendor: ₹1,73,200. Current amount is
  **≈4.86×** that average.

**1:30–1:55 — Deterministic policy + risk**
Agent calls `evaluatePolicy` and `calculateRisk`:
- Policy: amount exceeds ₹5,00,000 threshold → approval required.
- Risk: `35 (mismatch) + 32 (anomaly) + 20 (policy) = 87` → **HIGH**.

**1:55–2:15 — Explanation**
Agent uses the `explain_risk` prompt structure to present: risk level,
risk score, observed evidence, derived findings, policy impact,
recommendation (**HOLD**), and that human action is required.

**2:15–2:35 — Human review**
Agent calls `prepareApproval` → case `CASE-827` created in status
`WAITING_FOR_HUMAN_APPROVAL`. Show the `ApprovalCard` widget.

**2:35–2:50 — The boundary, stated explicitly**
Point out: there is no `executePayment` tool in this codebase. The agent
cannot act on its own recommendation.

**2:50–3:00 — Close**
Restate the tagline: *Investigate. Verify. Explain. Approve.*

## Secondary fixtures available for Q&A

- `TX-101` / `VENDOR-014`: clean case, no mismatch, amount within normal
  range and below the approval threshold — recommend `RELEASE` if asked to
  contrast with TX-827.
- `TX-205` / `VENDOR-055`: beneficiary matches, but amount exceeds the
  ₹5,00,000 threshold and the invoice is flagged duplicate — a different
  path to `HOLD` than TX-827's beneficiary mismatch, useful for showing the
  policy engine independent of the risk engine.
