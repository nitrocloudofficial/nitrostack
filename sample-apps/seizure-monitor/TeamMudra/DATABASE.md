# CareFlow Logistics database foundation

CareFlow uses Prisma ORM 7.9.1, SQLite, TypeScript, and Prisma's
`better-sqlite3` adapter. All records are fictional. The seed is deterministic,
uses the fixed reference time `2026-07-01T00:00:00.000Z` and seed `24072026`,
and is safe to rerun because stable IDs are upserted or inserted only when
missing.

## Architecture

- `prisma/schema.prisma` defines the normalized operational and audit model.
- `prisma/migrations` contains the versioned SQLite DDL.
- `src/generated/prisma` is generated code and must not be edited manually.
- `src/data/client.ts` is the single adapter-backed Prisma client boundary.
- `src/data/seed` contains phased, strongly typed deterministic generators.
- `src/data/queries.ts` contains application-neutral read models suitable for
  later NitroStack resources.
- `src/data/validation/validate.ts` independently recomputes balances and
  scenario arithmetic.
- `data/careflow.db` is the ignored local runtime database.

The seed phases create core organisation data, the catalogue, suppliers,
inventory history, materialized balances, and linked scenarios. Phase result
interfaces make dependencies explicit. Existing rows outside the stable
CareFlow namespace are not deleted.

## Event-sourced inventory

`InventoryTransaction` is the business header and
`InventoryLedgerEntry` is the immutable source of truth. Each ledger entry is a
signed integer movement against an exact position dimension:

`item + location + batch/serial + stock status + ownership + reservation key`

`positionKey` is the deterministic concatenation of those dimensions.
`StockPosition` is a materialized projection rebuilt from ledger sums for fast
reads; application code must never treat direct balance changes as inventory
events. Status changes such as quarantine use equal negative and positive
ledger movements. Transfers use distinct source and destination movements when
executed.

Physical quantities are integer base units. Money is integer Indian paise and
GST is integer basis points. Tracking mode (`BATCH`, `SERIAL`) is separate from
storage requirements and cold-chain evidence. Important operational and audit
history uses restricted deletion semantics.

## Demonstration scenarios

1. **ICU shortage and redistribution** — requirement `REQ-ICU-2026-001` needs
   120 units. ICU has 20 eligible units, Central can safely transfer 45, and
   Pharmacy can safely transfer 25. Internal fulfilment is 90 and the residual
   procurement gap is 30. The query excludes 50 quarantined units, 15 reserved
   units, 10 expired units, and 70 safety-stock-protected units. FEFO selects
   `batch-icu-near`.
2. **Procurement and quote comparison** — the 30-unit gap traces through a
   procurement need and RFQ line to four quotes. Price, lead time, full
   availability, compliance, and prior performance are stored independently.
   The fastest compliant full-quantity offer is recommended, approved, and
   executed into `PO-ICU-2026-001` for 163,500 paise before GST and 183,120
   paise total.
3. **Recall and quarantine** — a confirmed recall and a probable investigation
   affect batches at Central, Pharmacy, ICU-related storage, and Ward A. Prior
   issue history is retained, quarantine locations reconcile to stock
   positions, and the status changes are immutable ledger events.
4. **Receiving discrepancy** — `PO-GR-2026-001` orders 100 units; 92 arrive, 80
   are accepted, 12 rejected, and 8 are short. Damage (5), low remaining shelf
   life (4), and cold-chain evidence failure (3) reconcile to the rejected 12.
5. **Asset allocation** — 40 assets include idle, actively allocated,
   maintenance-overdue, quarantined, and unavailable states. Every in-use asset
   has one active allocation; the overdue example has a failed execution rather
   than an inconsistent allocation.
6. **Linen logistics** — a 200-piece flow records clean issue to Ward A, soiled
   return, laundering, and five rejected/lost pieces while conserving physical
   quantity.
7. **Medical oxygen** — 42 cylinders are represented as 28 full at the gas
   store, seven full allocated to ICU, five empty returns, and two on safety
   hold. This is operational status tracking, not a clinical prediction.

## Workflows and approvals

Prepared actions can be requested by `USER`, `AGENT`, or `SYSTEM` actors. They
retain payload, evidence, and reasoning metadata, then link to a tiered approval
policy. Approval requests and human decisions are separate from executions.
The seed includes successful, pending, rejected, and failed examples. An action
cannot have an execution unless its approval request has an approving human
decision; the validation command enforces this and verifies that every purchase
order has a successful approved execution.

## Commands

From the repository root:

```powershell
npm run db:validate
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run db:check
npm run typecheck
npm run build
```

Use `npm run db:inspect` to open Prisma Studio. During schema development use
`npm run db:migrate -- --name descriptive_change`. To regenerate the local demo
from migrations, run `npm run db:reset -- --force`; this is destructive only to
the ignored local demo database, so do not use it against a database containing
non-demo records.

## MCP readiness

The functions in `src/data/queries.ts` can back NitroStack resources for
inventory availability, redistribution candidates, expiring stock, recall
exposure, quote comparison, purchase-order and receipt status, discrepancies,
asset availability, pending approvals, and audit trails.

Future tools can prepare transfers, RFQs and purchase orders; compare quotes;
quarantine recalled stock; allocate assets; request and record approval
decisions; execute approved actions; and prepare supplier notifications. Those
tools should call deterministic query/calculation services, record a prepared
action and evidence, enforce approval policy, execute separately, and append an
audit event. External email or supplier delivery is intentionally not part of
this database task.

## Intentional exclusions

The schema contains no forecasting, predictive demand, outbreak prediction,
diagnosis, treatment recommendation, or autonomous clinical decision model or
function. AI may later orchestrate workflows, but quantities, balances,
comparisons, eligibility, money, and validation remain deterministic code and
database operations.
