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
npx tsx scripts/trigger-incident.ts
```

### Live Q&A Re-run

```bash
npx tsx scripts/trigger-incident.ts --return-rate 0.2
```

## Tools

### `audit_amazon_incident`
Read-only tool for pulling dispatch/return logs and computing the fraud score.

### `dispatch_safet_claim_email`
Guarded + widget-bound tool for Safe-T claim dispatch.

## Files

- **Demo guide**: `DEMO_GUIDE.md`
- **Trigger script**: `scripts/trigger-incident.ts`
- **Core module**: `src/modules/sentryflow/`
- **Widget**: `src/widgets/app/sentry-amazon-widget/page.tsx`

## License

MIT
