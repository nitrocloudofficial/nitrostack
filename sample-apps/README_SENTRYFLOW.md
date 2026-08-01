# SentryFlow — Amazon Return Fraud Detection MCP Server

An omnichannel e-commerce fraud & chargeback co-pilot built with NitroStack. Detects return fraud (empty-box claims, weight mismatches, COD abuse) with explainable scoring and human-in-the-loop guardrails.

## Features

- **Explainable Fraud Scoring** — 4 named signals (weight_mismatch, return_velocity, courier_seal_flag, legitimate_return_indicator) with individual weights and visibility
- **Fairness Check** — Actively looks for reasons to *clear* the buyer (e.g., prior SKU damage complaints), reducing false positives
- **Confidence-Gated Autonomy** — Guards on both claim value (>₹20k) AND ambiguous confidence band (50-80%), not just thresholds
- **Human-in-the-Loop Widget** — React component for manual review and approval of high-value or ambiguous cases
- **Append-Only Audit Trail** — Hashed, tamper-evident log of all decisions with PII redaction
- **Live Re-computation** — CLI trigger script with `--return-rate` override for Q&A demos

## Architecture

```
src/
├── modules/sentryflow/
│   ├── services/
│   │   ├── mock-amazon.service.ts       # Dispatch/return logs, order metadata (4 test cases)
│   │   ├── fraud-scoring.service.ts     # 4-signal scoring with fairness check
│   │   ├── audit-log.service.ts         # Hashed, append-only log + PII redaction
│   │   └── email.service.ts             # Resend SDK wrapper
│   ├── guards/
│   │   └── claim-review.guard.ts        # Value + confidence-band gating
│   ├── tools/
│   │   └── dispute.tools.ts             # @Tool audit_amazon_incident + dispatch_safet_claim_email
│   └── sentryflow.module.ts             # Module registration
├── widgets/app/sentry-amazon-widget/
│   └── page.tsx                         # Signal breakdown + approval UI
└── app.module.ts                        # Root MCP app
```

## Quick Start

### Install & Run

```bash
npm install
npm run dev
```

The MCP server starts on `localhost:3000` (or configured port). Connect via NitroStudio.

### Trigger a Demo Incident

```bash
npx ts-node scripts/trigger-incident.ts
```

Output:
```
🔍 SentryFlow Incident Trigger
================================

📦 Order ID: 408-98213-1102
💰 Claim value: ₹45,000
📈 Account return rate (90d): 55%
📦 Dispatch weight: 250g
📦 Return weight: 45g
📝 Courier notes: seal_intact_but_light, buyer claims empty box received

📊 Signal Analysis:
-------------------
✓ weight_mismatch                  [+55%] Dispatched 250g, returned 45g (82.0% loss)
✓ return_velocity                  [+25%] Account return rate (90d): 55%
✓ courier_seal_flag                [+20%] seal_intact_but_light, buyer claims empty box received
✗ legitimate_return_indicator      [ 0%] No pattern of SKU-level damage complaints

🎯 Final Score: 100%

🚨 HIGH FRAUD CONFIDENCE — Recommend immediate review

🛡️  Guard Decision:
-------------------
❌ BLOCKED: Claim exceeds ₹20,000 auto-dispatch threshold
```

### Live Q&A Re-run

Override the return rate to show dynamic re-computation:

```bash
npx ts-node scripts/trigger-incident.ts --return-rate 0.2
```

This drops the score from 100% to ~75% and changes the guard decision.

## Test Cases

| Order ID | Case | Dispatch | Return | Return Rate | Expected Score | Guard Decision |
|----------|------|----------|--------|-------------|-----------------|----------------|
| 408-98213-1102 | AirPods empty-box | 250g | 45g | 55% | 100% | BLOCKED (high value) |
| 408-98213-1103 | Clean order | 300g | 295g | 5% | 0% | ALLOWED (fairness check) |
| 408-98213-1104 | Ambiguous | 200g | 160g | 35% | ~65% | BLOCKED (ambiguous band) |
| 408-98213-1105 | COD chargeback | 180g | 175g | 42% | ~25% | ALLOWED (low confidence) |

## Tools

### `audit_amazon_incident`
**Read-only** — Pulls dispatch/return logs and computes fraud score with all 4 signals.

**Input:**
```json
{
  "orderId": "408-98213-1102"
}
```

**Output:**
```json
{
  "orderId": "408-98213-1102",
  "claimValueINR": 45000,
  "score": 100,
  "signals": [
    {
      "name": "weight_mismatch",
      "weight": 0.55,
      "triggered": true,
      "detail": "Dispatched 250g, returned 45g (82.0% loss)"
    },
    ...
  ]
}
```

### `dispatch_safet_claim_email`
**Guarded + Widget-bound** — Sends Safe-T Claim email. Blocked if claim > ₹20k OR fraud score 50-80.

**Input:**
```json
{
  "orderId": "408-98213-1102",
  "claimValueINR": 45000,
  "fraudScore": 100,
  "recipientEmail": "judge@example.com"
}
```

**Output:**
```json
{
  "status": "sent",
  "orderId": "408-98213-1102",
  "messageId": "msg_1234567890"
}
```

## Key Design Decisions

### 1. Fairness Check (Negative-Weight Signal)
The `legitimate_return_indicator` signal has a **negative weight** (-0.30). If this SKU has had >2 damage complaints from other buyers in 90 days, it suggests a product quality issue, not buyer fraud. This *reduces* confidence rather than adding it.

**Why?** A fraud bot that only accumulates evidence against the buyer is weaker and less trustworthy than one that actively tries to clear them first.

### 2. Confidence-Gated Autonomy
The guard doesn't just gate on claim value. It also holds cases with fraud scores in the 50-80 band (ambiguous confidence) for human review, even if low-value.

**Why?** Real fraud systems have to make judgment calls on ambiguous cases. This is more defensible than a simple threshold.

### 3. Append-Only Audit Trail
Every tool call, signal evaluation, and guard decision is logged with a hash chain (each entry's hash includes the previous entry's hash).

**Why?** If a seller disputes a decision later, they can verify the decision was made correctly and hasn't been tampered with.

### 4. PII Redaction
The audit log automatically redacts buyer names, addresses, emails, and phone numbers before logging.

**Why?** Compliance and responsible AI — the log is tamper-evident but doesn't expose sensitive data.

## Judging Criteria Alignment

| Criterion | How SentryFlow Scores |
|-----------|----------------------|
| **Technical Depth** | Zod validation, @UseGuards + @Widget binding, hashed audit trail, fairness check, confidence-gated guard |
| **Real-World Impact** | Grounded ₹4L/month estimate, 48-hour window problem, India-specific (COD abuse, UPI traces) |
| **Novelty** | Fairness check (negative-weight signal), confidence-gated guard, audit trail with PII redaction |
| **Demo Polish** | Live re-run with --return-rate override, widget approval flow, clean narration |

## Roadmap

- [ ] Flipkart Seller Central connector
- [ ] COD/UPI chargeback trace (deep-build)
- [ ] Production Resend email integration
- [ ] Multi-tenant seller account isolation
- [ ] Historical dispute trends dashboard
- [ ] Signal effectiveness metrics

## Files

- **Demo guide**: `DEMO_GUIDE.md`
- **Trigger script**: `scripts/trigger-incident.ts`
- **Core module**: `src/modules/sentryflow/`
- **Widget**: `src/widgets/app/sentry-amazon-widget/page.tsx`

## License

MIT
