# Care Mediator — Backend

A real REST API standing in for the "NitroStack MCP backend" the frontend
(`lib/fake-data.ts`) currently fakes locally. It implements the exact
`CaseData` contract the Next.js app already renders against, plus the
mutations the UI needs: hospital case submission, the objectivity check,
insurer decisions, document uploads, and issue reports.

No external database to install — state persists to JSON files under
`data/` and uploaded files under `uploads/`. Swap `src/db/store.ts` for a
real DB client later without touching any route.

## Run it

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Starts on `http://localhost:4000` (change `PORT` in `.env`). On first
boot it seeds two demo cases — `clean-case` and `gotcha-case` — with the
exact same data the frontend's fake-data module ships with, so pointing
the UI at this API instead is a same-IDs, same-shape swap.

Other scripts:

- `npm run build` / `npm start` — compile to `dist/` and run it.
- `npm run seed:reset` — wipes all stored cases, documents, issues, and
  uploaded files, then reseeds the two demo cases. Handy after a lot of
  manual testing has drifted the data.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/cases` | List all cases (newest first) |
| GET | `/api/cases/:caseId` | Full `CaseData` for one case |
| POST | `/api/cases` | Hospital submits a new case — see body below |
| POST | `/api/cases/:caseId/objectivity-check` | Runs the rule-based objectivity check and appends a timeline event |
| POST | `/api/cases/:caseId/decision` | Insurer action: approve / partial / deny / more-info — see body below |
| GET | `/api/cases/:caseId/documents` | List uploaded evidence documents |
| POST | `/api/cases/:caseId/documents` | Upload one (multipart: `file` + `documentId`) |
| GET | `/api/cases/:caseId/issues` | List issues reported on a case |
| POST | `/api/cases/:caseId/issues` | Report an issue — appends a timeline event too |

Uploaded files are also served back statically at `/uploads/<path>`
(the `storedPath` returned by the documents endpoints).

### `POST /api/cases`

```json
{
  "patientName": "Meera Nair",
  "hospitalName": "Sunrise General Hospital",
  "procedure": "Laparoscopic Appendectomy",
  "patientHistory": "No prior conditions.",
  "insuranceProvider": "Star Health — Comprehensive Plan",
  "estimatedCost": 185000
}
```

Generates a `CM-XXXXXX` case ID (same format the frontend already
generates client-side), logs a patient-consent timeline event followed
by the hospital-submission event, and runs the policy-terms check
immediately (populates `coverageExplainer`). The objectivity check does
**not** run automatically — call the endpoint below when you're ready to
simulate it resolving, so a "queued" state has something to transition
from.

### `POST /api/cases/:caseId/decision`

Body is one of, based on `action`:

```json
{ "action": "approve" }
{ "action": "partial", "approvedAmount": 300000, "note": "optional context" }
{ "action": "deny", "note": "required reason" }
{ "action": "more-info", "note": "required — what's needed" }
```

`approve`/`partial` auto-generate financing offers for whatever gap is
left (mirrors `gotcha-case`'s story: gaps over ₹1,00,000 get a flagged
predatory offer alongside a fair recommended one), and append the
matching timeline events.

### `POST /api/cases/:caseId/documents`

`multipart/form-data` with fields `file` and `documentId`, where
`documentId` is one of `discharge-summary`, `id-proof`,
`policy-document`, `itemized-bill` (matches
`components/DocumentChecklist.tsx` on the frontend exactly).

### `POST /api/cases/:caseId/issues`

```json
{ "issueType": "Billing discrepancy", "description": "..." }
```

## The "domain logic" isn't just stubs

- `src/domain/cghs.ts` — a small mock CGHS-style rate list. The
  objectivity check compares the submitted estimate against it and
  flags anything more than 50% over the median — this is what actually
  backs the frontend's "Verified — CGHS rate list" stamp.
- `src/domain/policyRules.ts` — mock policy-terms lookup keyed on the
  insurer name and patient-history text (waiting-period and exclusion
  keywords). Backs the "Cross-checked — policy terms" stamp.
- `src/domain/objectivityCheck.ts` — combines the above with a couple of
  completeness heuristics (missing/short patient history, vague
  procedure name) into real, explainable flags — not canned text.
- `src/domain/loanOffers.ts` — deterministic on gap size, not random, so
  demos are reproducible: gaps over ₹1,00,000 always get the flagged
  QuickCash offer alongside the fair Suraksha one.

None of this is meant to be real underwriting logic — it's just enough
rule-based behavior that the demo tells a coherent, reproducible story
instead of returning static fixtures for every request.

## Frontend integration — done

The frontend is wired to this API, not local fixtures. Both servers need
to be running for the app to work: `npm run dev` here (port 4000) and
`npm run dev` at the repo root (port 3000).

What changed on the frontend side:

- `lib/api.ts` — the one place that calls `fetch` against this API.
- `lib/fake-data.ts` — kept its name/exports (`getCaseData`,
  `DEFAULT_CASE_ID`) for compatibility, but now proxies `lib/api.ts`
  instead of returning local fixtures. Also exports `getAllCaseIds()`,
  used to populate the dev case switcher dynamically.
- `lib/case-context.tsx` — `availableCaseIds` now comes from
  `GET /api/cases` (falls back to `['clean-case', 'gotcha-case']` if the
  backend is unreachable), and exposes `applyCaseUpdate` / `refreshCases`
  for components to sync after a mutation.
- `app/hospital/page.tsx` — submits via `POST /api/cases`, then
  immediately calls `POST /api/cases/:id/objectivity-check` so the check
  resolves instead of staying "queued" with nothing behind it.
- `components/InsurerActionPanel.tsx` — calls
  `POST /api/cases/:id/decision`; the response (real, persisted) replaces
  local state via `applyCaseUpdate`.
- `components/DocumentChecklist.tsx` — real uploads via
  `POST /api/cases/:id/documents`; takes a `caseId: string | null` prop
  (null renders a disabled preview before a case exists).
- `components/ReportIssueModal.tsx` — calls
  `POST /api/cases/:id/issues`, then refetches the case so the new
  timeline entry shows immediately.

If the backend isn't running, `lib/api.ts` throws a clear
"Could not reach the backend… is it running?" error rather than a
cryptic network failure, and every page that surfaces it renders that
as a normal error state (see `components/StateCard.tsx`).

## Structure

```
backend/
  src/
    index.ts              Express app bootstrap
    config.ts              Env vars (PORT, CORS_ORIGIN)
    types.ts                CaseData contract (mirrors frontend lib/types.ts) + backend-only types
    db/
      store.ts               JSON-file persistence layer
      seed.ts                 Seeds clean-case / gotcha-case
      reset.ts                 `npm run seed:reset` script
    domain/
      caseId.ts               CM-XXXXXX id generation
      cghs.ts                   Mock CGHS rate list + comparison
      policyRules.ts             Mock policy-terms lookup
      objectivityCheck.ts        Combines the above into real flags
      loanOffers.ts                Deterministic financing offer generation
    routes/
      health.ts, cases.ts, documents.ts, issues.ts
    middleware/
      errorHandler.ts          Zod + HttpError -> JSON error responses
    utils/
      asyncHandler.ts, httpError.ts
  data/                    JSON "database" files (gitignored, created at runtime)
  uploads/                 Uploaded documents (gitignored, created at runtime)
```
