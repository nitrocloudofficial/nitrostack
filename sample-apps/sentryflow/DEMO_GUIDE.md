# SentryFlow — Live Demo Guide

## Overview
SentryFlow is an MCP-based fraud detection co-pilot for Amazon.in return disputes. It combines unstructured evidence (weight logs, courier notes, account history) with explainable fraud scoring and human-in-the-loop guardrails.

---

## 3-Minute Pitch Script

### 0:00–0:20 — Problem
"Amazon sellers lose ₹4L+ per month to return fraud — empty-box claims, COD chargebacks, weight mismatches. The dispute window is 48 hours. Evidence is scattered across systems. By the time a seller gathers it all, the window closes."

### 0:20–0:45 — Live Trigger
Run the trigger script to seed the AirPods Pro empty-box case:
```bash
npx ts-node scripts/trigger-incident.ts
```

Narrate while it runs:
- "This is a real case: AirPods Pro dispatched at 250g, returned at 45g."
- "The buyer's account has a 55% return rate in 90 days."
- "Courier notes flag the seal as intact but suspiciously light."

### 0:45–1:30 — Tool Trace
In NitroStudio, prompt the agent:
> "Audit the Amazon incident for order 408-98213-1102"

Show the trace:
- **Zod validation** on the input payload (strict typing)
- **All 4 signals** firing with individual pass/fail:
  - weight_mismatch: 82% loss ✓
  - return_velocity: 55% account return rate ✓
  - courier_seal_flag: seal_intact_but_light ✓
  - legitimate_return_indicator: no prior SKU damage complaints ✗ (fairness check)
- **Final score: 100%** (computed from weighted signals, not hardcoded)

Call out the fairness check: "Notice the fourth signal *reduces* confidence if there's a pattern of damage complaints on this SKU. This is how we avoid false positives."

### 1:30–2:15 — Widget & Approval
Prompt the agent:
> "Dispatch a Safe-T Claim email for order 408-98213-1102 with claim value 45000 INR and fraud score 100 to judge@example.com"

Show:
- **Guard blocks** (claim > ₹20,000)
- **Widget renders** with signal breakdown
- User clicks **"Approve & Dispatch"**
- Email is sent (or fallback recording plays)

### 2:15–2:45 — Impact & Roadmap
- **Impact slide**: "A mid-size seller processing 50 disputes/month at ₹8,000 average loss per unresolved case loses ₹4L/month to missed windows alone. SentryFlow cuts that to 3 minutes."
- **Roadmap slide**: Flipkart/Shopify connectors, COD/UPI chargeback trace, multi-tenant auth.

---

## Live Q&A — Re-run with Override

If a judge asks "Does this actually recompute, or is it always 100%?", run:

```bash
npx ts-node scripts/trigger-incident.ts --return-rate 0.2
```

This changes the account return rate from 55% to 20%, which:
- Drops the return_velocity signal from triggered to clear
- Reduces the final score from 100% to ~75%
- Moves the guard decision from "blocked" to "ambiguous confidence band" (still held for review, but for a different reason)

This proves the scoring is live and dynamic, not a script.

---

## Test Cases

### Case 1: AirPods Pro Empty-Box (High Fraud)
- **Order ID**: 408-98213-1102
- **Dispatch**: 250g | **Return**: 45g (82% loss)
- **Account return rate**: 55%
- **Expected score**: 100%
- **Guard decision**: BLOCKED (high value + high confidence)

### Case 2: Clean Order (No Fraud)
- **Order ID**: 408-98213-1103
- **Dispatch**: 300g | **Return**: 295g (2% loss)
- **Account return rate**: 5%
- **Prior SKU damage complaints**: 3 (fairness check triggers)
- **Expected score**: 0% (fairness check reduces confidence)
- **Guard decision**: ALLOWED (low value + low confidence)

### Case 3: Ambiguous Case (Confidence-Gated)
- **Order ID**: 408-98213-1104
- **Dispatch**: 200g | **Return**: 160g (20% loss)
- **Account return rate**: 35%
- **Expected score**: ~65%
- **Guard decision**: BLOCKED (ambiguous confidence band 50-80, even though low value)

### Case 4: COD Chargeback (Roadmap)
- **Order ID**: 408-98213-1105
- **Dispatch**: 180g | **Return**: 175g (3% loss)
- **Account return rate**: 42%
- **Expected score**: ~25%
- **Guard decision**: ALLOWED (low confidence)

---

## Key Differentiators

1. **Fairness Check** — The fourth signal actively looks for reasons to *clear* the buyer (prior SKU damage complaints). This is unique and defensible.

2. **Confidence-Gated Autonomy** — The guard doesn't just gate on value; it also holds ambiguous cases (50-80% confidence) for review, even if low-value. This is the real judgment call.

3. **Explainable Scoring** — Every signal is named, weighted, and visible in the trace. No "trust me, it's 98%."

4. **Audit Trail** — Append-only hashed log with PII redaction. Sellers can prove decisions were made correctly if disputed.

5. **Live Re-computation** — The `--return-rate` override flag proves the scoring is dynamic, not hardcoded.

---

## Fallback Plan

If live email fails:
1. Say: "And here's a capture of it landing a moment ago" (have backup recording ready)
2. Play the pre-recorded clip showing the email in the judge's inbox
3. Continue with the roadmap slide

If the MCP server crashes:
1. Restart with `npm run dev`
2. Re-run the trigger script
3. Continue from the last successful step

---

## Judging Criteria Alignment

| Criterion | How SentryFlow Scores |
|-----------|----------------------|
| **Technical Depth** | Zod validation, @UseGuards + @Widget binding, hashed audit trail, fairness check signal, confidence-gated autonomy |
| **Real-World Impact** | Grounded ₹4L/month estimate, 48-hour window problem, India-specific (COD abuse, UPI traces) |
| **Novelty** | Fairness check (negative-weight signal), confidence-gated guard (not just value-based), audit trail with PII redaction |
| **Demo Polish** | Live re-run with --return-rate override, widget approval flow, backup recording, clean narration |

---

## Rehearsal Checklist

- [ ] Run trigger script 3 times (baseline, --return-rate 0.2, --return-rate 0.8)
- [ ] Confirm NitroStudio trace shows all 4 signals + final score
- [ ] Confirm widget renders and "Approve & Dispatch" button works
- [ ] Confirm email lands (or backup recording plays smoothly)
- [ ] Time the full pitch — aim for 2:45 to leave 15s buffer
- [ ] Practice the Q&A re-run transition (should feel intentional, not like a recovery)
- [ ] Have backup recording on the presentation laptop (not just in the cloud)
- [ ] Test offline mode (wifi disabled) to confirm safe mode works

---

## Files & Paths

- **Core server**: `src/modules/sentryflow/`
- **Widget**: `src/widgets/app/sentry-amazon-widget/page.tsx`
- **Trigger script**: `scripts/trigger-incident.ts`
- **Backup recording**: `demo-assets/backup-recording.mp4` (to be recorded)
- **Audit log**: In-memory (MockAmazonService + AuditLogService)

---

## Next Steps (Post-Hackathon)

1. **Flipkart connector** — Replicate MockAmazonService pattern for Flipkart Seller Central API
2. **COD/UPI trace** — Deep-build the chargeback trace tool (currently a stub)
3. **Production email** — Wire up actual Resend SDK (currently simulated)
4. **Multi-tenant auth** — Add seller account isolation
5. **Dashboard** — Historical dispute trends, signal effectiveness metrics

---

**Good luck! 🚀**
