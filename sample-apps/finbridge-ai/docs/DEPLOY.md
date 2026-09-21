# Deploy runbook — Jeevan

Everything here was verified against the shipped CLI and the official docs on
2026-07-26. **Nothing in this file was generated from a model's memory of other
MCP SDKs.** Where the docs and the actual CLI disagree, that disagreement is
recorded rather than smoothed over.

---

## How to actually deploy — from the NitroStack Studio Handbook

Source: `NitroStack_Studio_Handbook.pdf`, section 9 "Cloud & Deployment". This
supersedes the earlier note in this file. **There IS a deploy path — it just
isn't a CLI command.**

For the record, the CLI genuinely has no `login` or `deploy` (verified against
`@nitrostack/cli` 1.0.15). The docs site's `nitrostack deploy` snippet is wrong.
Deployment happens in Studio's UI or the NitroCloud dashboard instead.

### Step 0 — sign in to Studio (required for all paths)

Local features work signed out, but deployment does not.

- Launcher sidebar footer → **Sign in**, or App sidebar footer → **Connect to
  NitroCloud**
- Modal is titled "Sign in to NitroStudio", two tabs: **Browser** (recommended)
  and **API Key**
- Browser tab → **Continue with NitroCloud** → complete sign-in in your system
  browser. Studio shows "Waiting for login…" and picks the session up
  automatically.

**If Studio hangs on "Waiting for login…"**, a **Switch to API Key** link appears
after ~10 seconds. Use it: get a key from <https://nitrocloud.ai/home/api-keys>
(keys start with `nsk_live_`) and paste it into the API Key tab. This is the
documented workaround when the browser redirect doesn't come back.

### ⚠ Node version

The handbook says Studio requires Node 18+, but **Node 20 is what NitroCloud
uses internally** (bundled Node + cloud Docker images) and is called "the safest
choice for the hackathon". Our Dockerfile already pins `node:20-slim`. If a
deploy builds locally but fails in the cloud, a Node version mismatch is the
first thing to check.

---

## Path A — GitHub auto-deploy (RECOMMENDED for us)

Best fit: our code is already on GitHub, and every push to `main` redeploys
automatically — which is exactly Jeevan's "redeploy after every merge" job, done
for free.

1. NitroCloud → **Create Nitrostack App** (on `/home` or `/home/apps`). Enter an
   app name (min 2 chars) + optional description → **Create App**. You land on
   `/apps/:id`.
2. Go to **MCP → Deployments**. If GitHub isn't connected, the "Deploy from
   GitHub" card says the GitHub App needs installing → click **Go to
   Organization Integrations**.
3. On Integrations, under **GitHub App**, click **Install App** and authorise
   NitroStack for your GitHub org/account.
4. Back on **Deployments → Connect Repository**: search and select
   `Jeevan0814/Finbridge-ai`, choose branch `main`, then **Link Repository &
   Enable Auto-Deploy**.
5. Click **Deploy from GitHub**. The Deployment Details page streams
   Processing → Building → Deploying, with build and deploy logs. When it turns
   **Live**, the **Service URL** appears.

Status always moves Pending → Building → Deploying → Live.

---

## Path B — Deploy from Studio's App Canvas

**Deployment is NOT a sidebar page.** It lives on the App Canvas (`/`) and inside
Compose. That's why it's hard to find.

1. On the **App Canvas header** (or the Compose MCP chat header): if no cloud app
   is linked, use **Link to app…** to pick one, or **Create Cloud App**.
2. Click **Deploy**. The "Deploy to NitroCloud" modal walks through: Preparing
   bundle → Uploading project → Waiting for confirmation → Building and
   deploying → Deployment live.
3. At the confirmation step click **Open Confirmation Page** (confirms in your
   browser). You can also **Run in background**.
4. When live, the modal shows the **service URL** with Copy, plus **View
   deployments in NitroCloud**.

From Compose specifically, Deploy first runs `npm run build` locally; if that
fails the error goes back to the agent rather than deploying.

---

## Path C — Upload a zip

NitroCloud → `/apps/:id/mcp` ("Ship your MCP server") offers three paths:
**Start from CLI**, **Connect GitHub**, or **Upload a code package** — drag a
`.zip`, **max 100MB**, then **Upload & Deploy**.

```bash
npm run build
npx nitrostack-cli pack --dry-run    # data/ must be IN, .env must be OUT
npx nitrostack-cli pack -o finbridge-ai.zip
```

Never pass `--include-env`. Note `pack` edits `.gitignore` unless you pass
`--no-sync-gitignore` — check `git diff .gitignore` afterwards.

---

## Path D — Docker (only if NitroCloud is unusable)

`Dockerfile` in the repo root runs anywhere that takes a container.

```bash
docker build -t finbridge-ai .
docker run -p 3000:3000 finbridge-ai
```

**`COPY data ./data` is load-bearing.** `knowledge.resources.ts` resolves the
data directory relative to its own module file, so `dist/` and `data/` must stay
siblings.

⚠ Check whether the hackathon **requires** a NitroCloud deployment before relying
on this. A Cloud Run URL may not satisfy the judges.

---

## Transport

From `.env.example`, `MCP_TRANSPORT_TYPE` takes `stdio | http | dual`, defaulting
to `stdio` in development and `dual` when `NODE_ENV=production`. Anything
hosted needs HTTP reachable, so leave it at `dual` (the Dockerfile sets this
explicitly) and confirm the deployed URL answers before you call the gate green.

---

## Pre-deploy checklist

Condensed from `docs.nitrostack.ai/deployment/checklist`, keeping only what
applies to us:

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run sweep` green — 4 tools, 2 resources, 2 prompts
- [ ] `npm run audit:secrets` green
- [ ] No `console.log` in server code (`ctx.logger` only)
- [ ] Input validation on every tool — already enforced by the contract schemas
- [ ] `NITRO_LOG_LEVEL` at `info` or `warn`, not `debug`
- [ ] `.env` not in the zip / image / repo

## Post-deploy — this is what makes the gate green

- [ ] Deployed URL responds
- [ ] `tools/list` returns all **4** tools
- [ ] `resources/list` returns both `finbridge://` URIs
- [ ] `prompts/list` returns both prompts
- [ ] `finbridge://schemes` returns 7 schemes — **the check that catches a
      missing `data/` directory**
- [ ] One real tool call end to end from an MCP client, not just a listing

---

## Hourly sweep, from +4:00

```bash
npm run sweep          # rebuild server, then sweep
npm run sweep:fast     # sweep the existing dist/
```

Spawns the built server over stdio, speaks raw MCP JSON-RPC, and checks:

- all 4 tools, 2 resources, 2 prompts are discoverable
- every tool output carries a non-empty `risk_note` and `educational_only: true`
- every `ineligible` entry names a `failedCondition`
- `highEstimate >= lowEstimate`, `assumptions` non-empty, `navSource` present
- both resources parse as non-empty JSON arrays
- both prompts return messages

It counts errors per tool and prints a **cut from the video** warning at two or
more, per the rule in `CONTRIBUTING.md`. Each run writes JSON to `sweeps/`
(gitignored), so you have the history at 06:00 instead of a memory of it.

Exit codes: `0` all green, `1` at least one check failed, `2` could not run.

### What the sweep proves

It drives the server through the **official MCP client SDK** — the same code
path a real client uses. Green means a real client will work.

It caught three protocol bugs that unit tests and `tsc` could not see:
`project_investment_growth` and `calculate_financial_health` declared an
`outputSchema` the framework never populated, so both failed with MCP error
-32600 on every call; and both resources double-wrapped their payload, so
clients received an envelope nested inside `.text` instead of the data. All
three are fixed. **Run the sweep after every merge** — this class of bug is
invisible to typechecking.

If the sweep can't connect at all, run `npm run verify:tools` instead: it checks
the same logic in-process with no transport, so a green there tells you the
problem is deployment rather than code.

---

## Still unverified — do not guess these

Three submission requirements could not be confirmed from any public source,
and the hackathon isn't named anywhere in the repo:

1. Exact **demo video length limit**
2. **Sample Apps PR format** — there is no `sample-apps` directory or repo under
   the `nitrocloudofficial` org, so this is likely a hackathon-specific process,
   not a NitroStack one
3. **Discord post tag requirements** — the community server is
   <https://discord.gg/uVWey6UhuD>; tag rules will be in its rules or
   announcements channel

Get these from the organiser's brief in hour one. Guessing a video length is how
you record twice.
