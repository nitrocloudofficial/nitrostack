# Delivery-Correction Speech Coach Agent

NitroStack × MCP To The Moon — 24h buildathon.

Give it your script and a recording of you delivering it. The agent correlates
what you **said** against what you **planned** to say, and returns timestamped,
falsifiable corrections: filler words, pacing drift, and whether your stress
points landed where the script says they should.

It does not score your confidence. It corrects delivery mechanics against your
own script — and its closing action points you back toward a real human to
rehearse with, rather than toward itself.

## Read in this order

1. [`docs/ARCHITECTURE_BRIEF.md`](docs/ARCHITECTURE_BRIEF.md) — what NitroStack
   is, and the agentic-vs-automation rule the whole build turns on.
2. [`docs/SPEC.md`](docs/SPEC.md) — the locked build: tool chain, schema, demo.
3. [`CONVENTIONS.md`](CONVENTIONS.md) — the common structure. Units, IDs,
   determinism, error handling, how to change the contract.
4. [`packages/contracts/src/index.ts`](packages/contracts/src/index.ts) — the
   contract itself. The one file all four workstreams share.

Then your own plan in [`docs/TEAM_PLANS.md`](docs/TEAM_PLANS.md), and
[`docs/VOICE_STACK.md`](docs/VOICE_STACK.md) for the audio decisions.

## Layout

    packages/contracts     THE SEAM — types, Zod, frozen signatures, fixtures
    packages/core-logic    P1 · pure TypeScript, zero NitroStack
    packages/widget        P3 · delivery timeline
    apps/server            P2 · NitroStack MCP server, thin @Tool shells
    fixtures/audio         P4 · curated demo recordings
    scripts/               shared tooling

The rule that holds it together: **`core-logic` never imports the server, and
the server never contains logic worth unit-testing.**

## Getting started

```bash
npm install
```

Then confirm the contract typechecks:

```bash
npm run typecheck
```

## Running the demo

One command brings up the server and the widget:

```bash
npm run dev
```

- Widget: <http://127.0.0.1:5173>
- Server: <http://127.0.0.1:8787> (`GET /api/health` reports the effective adapter selection)

Vite proxies `/api` to the server, so there is no CORS configuration. Pick a take
in the header to analyse it live, or drop a recording onto the panel to upload
and analyse a new one.

`STT_PROVIDER` defaults to `fixture`, so a clean checkout runs **offline and
deterministic**: the staged takes replay the frozen transcripts in
`packages/contracts/fixtures/`. Live Deepgram is opt-in:

```bash
STT_PROVIDER=deepgram DEEPGRAM_API_KEY=... npm run dev
```

The key is read once, in `apps/server/src/config.ts`, and never logged. A
missing key with `STT_PROVIDER=deepgram` fails at boot rather than mid-demo.

`ENABLE_PROSODY=false` skips the ffmpeg decode entirely — useful if
`ffmpeg-static` has no binary for your platform. Prosody only feeds the
key-point rising-pitch check; every other rule derives from word timings.

If the server is unreachable the widget falls back to the committed report
fixtures rather than rendering nothing.

## Tests

```bash
npm test
```

The one that matters most is `apps/server/src/integration.test.ts`: it boots the
server in-process, posts to `/api/analyze` for both staged takes, and asserts
the response deep-equals the committed golden report. It fails if any adapter,
tool wrapper, or wiring step corrupts the pipeline.

## Status

Integration complete — the pipeline runs end-to-end behind HTTP and the widget
renders live reports. NitroStack decorators replace only the transport layer
from here.
