# MedLens — Deployment & Verification Status

## What I could actually do vs. what needs your environment

I built and can verify the **code** in this sandbox. I could **not** perform
the NitroCloud deployment or the ChatGPT/external-MCP-client connection test,
because I don't have access to NitroCloud or ChatGPT from here, and this
sandbox's network egress is disabled (so I couldn't even live-call
api.fda.gov / rxnav.nlm.nih.gov to test the tools myself). Those steps need
to run in your NitroStack/NitroCloud environment.

## Verification checklist

- [x] **All 8 tools registered, zero placeholder tools remaining** —
      `src/index.ts` lists exactly the 8 MedLens tools; `search_flights`,
      `get_flight_details`, `search_airports` don't appear anywhere in
      `src/`.
- [x] **No hardcoded secrets in the build** — grepped the source tree below;
      no API keys or credentials anywhere (openFDA and RxNorm need none).
- [ ] **Deployment live and reachable** — not run; requires your NitroCloud
      access.
- [ ] **Outbound network access confirmed to openFDA and RxNorm** — not
      run; requires deploying to NitroCloud and testing from that runtime.
      Flag to check: some PaaS sandboxes block outbound HTTPS by default —
      confirm your NitroCloud project's egress policy allows
      `api.fda.gov` and `rxnav.nlm.nih.gov` before relying on this.
- [ ] **ChatGPT/external MCP client successfully connected and tool-called**
      — not run; requires an actual ChatGPT MCP connector session pointed
      at your deployed instance.
- [ ] **Public endpoint documented** — no endpoint exists yet since nothing
      has been deployed.

## Platform timeout risk (flagged per your request)

Every tool uses a 10s `AbortController` timeout. If NitroCloud's own request/
platform timeout is shorter than 10s, it will truncate legitimate slow
openFDA responses before our own timeout fires — check your NitroCloud
function/route timeout setting and raise it above 10s, or lower our
`AbortController` timeout to stay safely under it.

## MCP manifest for external clients (ChatGPT, etc.)

The tool `name`, `description`, and `inputSchema` fields in `src/index.ts`
are written to be self-contained — they don't reference NitroStack's
internal orchestration rules (e.g. "always call check_medicine_combination
when two drugs are mentioned"). An external client's own reasoning has to
infer that from the tool descriptions alone, which is why
`check_medicine_combination`'s description explicitly says "Always call this
when a user mentions two or more medicines together" — that instruction now
lives in the tool description itself, not just in NitroStack's internal
agent config, so it survives outside NitroStack.

Once deployed, the manifest a client discovers is just the `ListTools`
response (the `TOOLS` array in `index.ts`) served over whatever transport
NitroCloud exposes (stdio wrapped in an HTTP/SSE bridge, typically). I can't
generate the actual public URL — that's assigned at deploy time.

## Next steps for you

1. `npm install @modelcontextprotocol/sdk` in this project, wire up
   NitroStack's actual deploy config around `src/index.ts`.
2. Deploy to NitroCloud under the MedLens namespace.
3. Confirm egress to the two domains from that runtime.
4. Connect a real MCP client (ChatGPT or otherwise) and run a two-drug query
   to confirm sequential tool calls happen correctly using only the
   in-schema descriptions (no NitroStack orchestration present).
5. Paste the resulting public endpoint back to me if you want help writing
   up the demo/submission text once you have it.
