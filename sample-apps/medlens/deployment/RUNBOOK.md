# MedLens deployment & verification runbook

This sandbox has no outbound network access and no connection to NitroCloud
or a ChatGPT/MCP client, so none of the checklist items below can be
executed or confirmed from here. What follows is the exact sequence to run
yourself, plus what each step is checking for and why.

## 0. Local build check (do this first)

```bash
cd medlens-mcp
npm install
npm run build          # tsc — catches any type errors before deploying
npm run dev             # stdio transport, for local tool-by-tool testing
```

If you have an MCP inspector or CLI client, point it at the stdio process
and call each of the 8 tools once with a real drug name (e.g. "ibuprofen",
"Tylenol", "metformin") to confirm live openFDA/RxNorm responses come back
shaped as expected.

## 1. Registration check — `app.module.ts`

Open `src/app.module.ts` and confirm:
- [ ] All 8 tools are registered: `get_drug_regulatory_status`,
      `get_drug_safety_profile`, `check_medicine_combination`,
      `find_generic_equivalent`, `get_drug_cost_estimate`,
      `search_medicine_by_condition`, `manage_medicine_schedule`,
      `get_due_reminders`.
- [ ] No trace of `search_flights`, `get_flight_details`, or
      `search_airports` anywhere in `src/`.

```bash
grep -ri "search_flights\|get_flight_details\|search_airports" -r src/
# should return nothing
```

## 2. Secrets check

```bash
grep -rniE "api[_-]?key|secret|token" -r src/ package.json
```

Confirm nothing beyond descriptive text (e.g. the words "no api key
required" in comments) shows up — this codebase deliberately needs zero
credentials for openFDA or RxNorm at this scope.

## 3. Deploy to NitroCloud

This step is entirely NitroCloud-console/CLI work outside this sandbox:
1. Build the project (`npm run build`).
2. Push/deploy `dist/` (or the whole repo, per NitroCloud's build step) to
   NitroCloud under the MedLens project namespace, using the HTTP entry
   point: `node dist/server.js --transport=http --port=<NitroCloud's port>`.
3. Confirm the platform's assigned port matches what `server.ts` binds to,
   or set `--port` to whatever NitroCloud injects via environment variable.

## 4. Outbound network check (hard dependency — verify explicitly)

Every tool needs to reach `api.fda.gov` and `rxnav.nlm.nih.gov`. From
inside the deployed environment (NitroCloud shell/logs, not this sandbox):

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://api.fda.gov/drug/label.json?limit=1"
curl -s -o /dev/null -w "%{http_code}\n" "https://rxnav.nlm.nih.gov/REST/rxcui.json?name=aspirin"
```

- [ ] Both return `200`. If either is blocked by NitroCloud's egress policy,
      every tool that depends on it will silently return `{found:false}` —
      that's indistinguishable from "no data" to a user, so this check has
      to be done explicitly, not inferred from tool behavior.

## 5. Platform timeout vs. the 10-second AbortController

Check NitroCloud's own per-request timeout setting (function/route timeout,
not application code). If it's shorter than 10 seconds, a legitimately slow
openFDA response gets truncated by the platform before the app's own
timeout ever fires, and the failure will look like a network error rather
than a slow upstream. Confirm the platform timeout is ≥ 10s, or lower the
`DEFAULT_TIMEOUT_MS` in `src/utils/fetchWithTimeout.ts` to match whichever
is shorter.

## 6. ChatGPT / external MCP client connection

1. Fill in the real deployed URL in `deployment/mcp-manifest.json`
   (`transport.url`), replacing the `REPLACE_WITH_DEPLOYED_PUBLIC_URL`
   placeholder.
2. In ChatGPT (or another MCP-compatible client), add a custom connector
   pointing at `<deployed-url>/mcp`.
3. Paste the orchestration block from
   `src/orchestration/AGENT_INSTRUCTIONS.md` into that client's custom
   instructions / system prompt field — ChatGPT's own agent has no
   visibility into NitroStack's internal orchestration rules, so this step
   is what makes multi-tool sequencing work there too.
4. Test:
   - [ ] All 8 tools show up in the client's tool picker.
   - [ ] A single-drug query triggers the expected 1-2 tool calls.
   - [ ] A two-drug query ("is it safe to take X with Y?") triggers
         `check_medicine_combination` without you asking for it explicitly.

## 7. Document the public endpoint

Once steps 3–6 pass, record the final `<deployed-url>/mcp` value in your
submission write-up and in `deployment/mcp-manifest.json`.

## Final checklist (mirrors the one in the request — tick these yourself)

- [ ] Deployment live and reachable
- [ ] Outbound network access confirmed to both openFDA and RxNorm
- [ ] All 8 tools registered, zero placeholder tools remaining
- [ ] No hardcoded secrets in deployed build
- [ ] ChatGPT/external MCP client successfully connected and tool-called
- [ ] Public endpoint documented for submission
