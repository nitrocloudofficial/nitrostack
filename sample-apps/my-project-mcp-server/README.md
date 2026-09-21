# Care Mediator

A healthcare insurance mediator platform that gives Hospital, Patient, and
Insurer users three role-scoped views over **one shared case record** —
no more "he said / she said" between what the hospital billed, what the
insurer approved, and what the patient sees. Every figure is checked
against a neutral CGHS-style rate list before anyone reviews it.

Two independent pieces live in this repo:

| | What it is | Where |
|---|---|---|
| **Web app** | Next.js frontend + Express API — the actual product | repo root + `backend/` |
| **MCP server** | A NitroStack MCP server exposing the same domain logic as agent tools + interactive widgets, for use inside AI clients (Claude, ChatGPT, NitroStudio) | `my_project_hackathon/` |

If you just want to run the app, you only need the **Web app** row below.

---

## Quick start (web app)

Needs **both** servers running — the frontend calls the backend over
HTTP, there's no local fake data.

```bash
# Terminal 1 — backend (port 4000)
cd backend
npm install
cp .env.example .env
npm run dev

# Terminal 2 — frontend (port 3000), from the repo root
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on a
login screen — pick a role and either use a 1-click demo login or fill in
the form yourself (any name/ID works, it's a demo).

**Demo cases** (switchable from the sidebar or the amber DEV switcher,
bottom-right):

| Case ID | Story |
|---|---|
| `clean-case` | Meera Nair — full approval, zero gap, no objectivity flags |
| `gotcha-case` | Arjun Verma — partial approval, ₹1,60,000 gap, objectivity flags raised, one financing offer flagged as predatory |

Anything you submit through the Hospital view also shows up in that list
automatically.

If the backend isn't running, pages show a clear "could not reach the
backend" error instead of failing silently — start it and reload.

---

## What it does

- **Shared case record** — hospital, patient, and insurer all read the
  exact same `CaseData` object. No syncing, no version drift.
- **Objectivity check** — hospital estimates are automatically
  cross-checked against a CGHS-style rate list and the insurer's policy
  terms; discrepancies are flagged before the insurer ever looks at it.
- **Insurer adjudication** — approve in full, approve a custom amount,
  request more info, or deny, each with a reason. Every decision is
  appended to a shared timeline all three roles can see.
- **Financing offers** — any coverage gap automatically generates
  deterministic loan offers, sorted by *true* effective annual rate, with
  predatory-APR offers clearly flagged rather than hidden.
- **Document upload & consent** — patients see exactly what's been
  uploaded and when consent was recorded; hospitals attach evidence
  inline during submission.
- **Issue reporting** — patients can dispute a decision directly from
  the case view; it's logged to the same shared timeline.
- **Role-based auth** — client-side role gating (`ProtectedPage`) so each
  portal only renders for its role, with a role switcher for demoing all
  three in one session.

---

## Tech stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Express + TypeScript, JSON-file persistence (no external DB)
- **Design**: a glassmorphism system (`.glass`, `.glass-strong`, `.glass-soft`,
  `.glass-nav`, `.glass-dark`, `.glass-input` — see `app/globals.css`) —
  translucent, backdrop-blurred panels over a soft gradient backdrop
- **MCP server**: [NitroStack](https://nitrostack.ai) (`@nitrostack/core` +
  `@nitrostack/widgets`), Zod-validated tool schemas

---

## Structure

```
app/                Next.js App Router pages
  page.tsx             Login / role picker / marketing landing
  login/               Redirect shim -> /
  hospital/            Case submission + rate audit
  patient/             Cost breakdown, coverage, documents, financing
  insurer/             Adjudication queue

components/          UI — CaseFileShell (3-rail layout), Sidebar, AppHeader,
                     Ledger, CoverageExplainerCard, LoanOffers, DocumentChecklist,
                     InsurerActionPanel, CaseStatusStepper, TimelineRail,
                     VerificationRail/Stamp, ReportIssueModal, ui/Card, ui/Badge

lib/                 types.ts (shared CaseData contract), api.ts (backend client),
                     auth-context.tsx (client-side role auth), case-context.tsx
                     (shared case state + cross-tab polling), utils.ts

backend/             Express API — see backend/README.md for the full
                     endpoint reference and domain-logic writeup
  src/domain/          CGHS rate check, policy-terms lookup, objectivity
                       check, deterministic loan-offer generation
  src/db/              JSON-file persistence + seed/reset scripts

my_project_hackathon/  NitroStack MCP server — same domain logic, exposed
                       as 11 agent tools + 9 interactive widgets. See its
                       own README + backend/README.md's domain-logic
                       section for what the rules actually do.
  src/modules/           hospital / insurer / lender / objectivity /
                         orchestrator tools, each backed by a data service
  src/widgets/           Next.js app bundled as MCP widgets (case-summary,
                         loan-offers, objectivity-report, treatment-estimate,
                         city-procedures, claim-status, network-check,
                         decision-receipt, case-queue)

src/                 Mirror of my_project_hackathon/src — kept in sync but
                     has no build config of its own; my_project_hackathon/
                     is the one you actually run.
```

---

## Running the MCP server

```bash
cd my_project_hackathon
npm install
npm run dev      # nitrostack-cli dev
```

It talks to the **same backend** as the web app (`BACKEND_API_URL`,
defaults to `http://localhost:4000`) — start `backend/` first. Point
NitroStudio or an MCP-compatible client at it to call tools like
`reconcile_case_by_id`, `submit_decision`, or `get_loan_offers` and see
the matching widget render inline.

---

## Learn more

- [`backend/README.md`](backend/README.md) — full API reference and what
  the domain logic (CGHS checks, policy rules, objectivity check,
  financing) actually does under the hood
- [`my_project_hackathon/README.md`](my_project_hackathon/README.md) —
  NitroStack template notes
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [NitroStack Documentation](https://docs.nitrostack.ai)
