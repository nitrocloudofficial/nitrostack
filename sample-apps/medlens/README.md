# MedLens MCP server

A TypeScript MCP server exposing 8 tools backed by live **openFDA** and
**RxNorm** calls — no mocked or fake data. No NitroStack-specific code; the
widget uses plain CSS custom properties you remap to whatever design system
you're actually running.

## What's here

```
medlens-mcp/
  src/
    server.ts                 entry point — stdio (local dev) or streamable HTTP
    app.module.ts              registers all 8 tools; placeholder flight tools removed
    types.ts                   shared result/payload shapes
    utils/
      fetchWithTimeout.ts       shared 10s-timeout fetch wrapper (AbortController)
      scheduleStore.ts          in-memory store backing tools 7 & 8
    tools/
      getDrugRegulatoryStatus.ts
      getDrugSafetyProfile.ts
      checkMedicineCombination.ts
      findGenericEquivalent.ts
      getDrugCostEstimate.ts
      searchMedicineByCondition.ts
      manageMedicineSchedule.ts
      getDueReminders.ts
    orchestration/
      AGENT_INSTRUCTIONS.md    system-prompt text for whatever agent calls this server
      buildReportPayload.ts    helper to assemble the widget's JSON contract
  widget/
    MedLensCard.tsx            stateless comparison-card React component
    entry.tsx                  mounts MedLensCard against window.openai, bundled by esbuild
  dist-widget/
    medlens.js                 esbuild output — generated, not checked in
  deployment/
    mcp-manifest.json          connection manifest template for external MCP clients
    RUNBOOK.md                 manual deploy + verification checklist
```

## Run it

```bash
npm install
npm run build           # builds widget/entry.tsx via esbuild, then tsc
npm run dev              # stdio transport for local tool testing
# or, after building:
npm run start:http      # streamable HTTP on :3333, for external MCP clients
```

`npm run build` runs `build:widget` (esbuild bundles `widget/entry.tsx` into
`dist-widget/medlens.js`) before `tsc`. The `render_medlens_report` tool and
the `ui://widget/medlens.html` resource in `app.module.ts` both depend on
that bundle existing — the other 7 tools work without it.

## Why orchestration isn't "in" the server

MCP servers expose tools; they don't control the order in which a connected
agent calls them. The rules you described (call `check_medicine_combination`
when two drugs are mentioned, chain `find_generic_equivalent` +
`get_drug_cost_estimate` for cost questions, synthesize multi-tool answers
into one report, etc.) are agent-side behavior — see
`src/orchestration/AGENT_INSTRUCTIONS.md` for the exact text to paste into
whichever agent's system prompt is calling this server. Each tool's own
description in `app.module.ts` is written to stand alone, so an external
agent (ChatGPT, or any MCP client without NitroStack's internal rules
loaded) can still reason about *when* to call each tool individually — the
instructions file is what adds the cross-tool sequencing on top of that.

## What's verified vs. not

Built and reviewed for correctness, but **not executed** — this environment
has no outbound network access, so live calls to `api.fda.gov` /
`rxnav.nlm.nih.gov` haven't been run, and there's no connection to
NitroCloud or a ChatGPT/MCP client to deploy to or test-connect from. The
`render_medlens_report` tool and `widget/entry.tsx` bundle are in the same
boat: `npm run build:widget` (esbuild) hasn't actually been run here either,
so verify it produces `dist-widget/medlens.js` without errors before relying
on it. Run `npm install && npm run build && npm run dev` locally, then work
through `deployment/RUNBOOK.md` for the deploy + connection verification
checklist — it explains what each remaining check is for and can't be
ticked from here.

## Known scope limits (by design, not oversight)

- `get_drug_cost_estimate` never returns a dollar figure — no free
  real-time pricing API exists in scope, so it only returns a brand-tier /
  generic-tier signal.
- `manage_medicine_schedule` / `get_due_reminders` use an in-memory store
  that resets on server restart — acceptable for demo scope, not
  production-durable.
- EMA (European Medicines Agency) integration is a documented stretch goal,
  not implemented in this build.
