# Deploying PassportIQ to NitroCloud — the full process

Goal: a live, public MCP endpoint so the hackathon form's **Step 2 of 5**
("Pick your deployed MCP") stops saying *"No live MCP yet"*.

---

## 0. The two bugs that would have broken this deploy

Both were found by simulating NitroCloud's exact environment locally, and both
fail **silently** — you'd get a "deployed" app whose health check never turns
green, with no error message explaining why. Both are already fixed in this
repo; this section exists so you can explain it if a judge asks.

### Bug A — the upstream CLI overrides the port the platform gives you

`nitrostack-cli start` (`@nitrostack/cli` v1.0.15,
`dist/commands/start.js`) spawns the server like this:

```js
const port = options.port || '3000';
// ...
spawn('node', [distIndexPath], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port,          // <-- clobbers the platform's PORT
  },
});
```

`PORT: port` is written **after** `...process.env`, so it wins. NitroCloud
injects `PORT`, the CLI throws it away and substitutes `3000`, the app binds
`3000`, and the platform probes the port it assigned. Nothing ever answers.

**Fix applied** — `package.json` no longer routes production start through the
CLI:

```diff
- "start":      "npm run build && nitrostack-cli start",
- "start:prod": "nitrostack-cli start",
+ "start":      "npm run build && node dist/index.js",
+ "start:prod": "node dist/index.js",
```

`node dist/index.js` is exactly what the CLI spawns anyway — minus the env
clobbering. (The `Dockerfile` already did the right thing.)

### Bug B — the framework binds loopback inside a container

`@nitrostack/core` `dist/core/server.js:947`:

```js
const host = process.env.HOST || 'localhost';
```

`localhost` inside a container answers only the loopback adapter. The
platform's health probe dials the **pod IP**, so it times out forever.

Related: transport selection reads `NODE_ENV`. Unset ⇒ **stdio only** ⇒ there
is no `/mcp` at all.

**Fix applied** — `src/index.ts` now normalises the environment before
`create()`:

```ts
function applyManagedHostEnvDefaults(): void {
  const onManagedHost = Boolean(process.env['PORT']);

  if (!process.env['HOST']) {
    process.env['HOST'] = '0.0.0.0';
  }
  if (onManagedHost && !process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'production';
  }
}
```

`NODE_ENV` is only forced when `PORT` is present — an injected `PORT` is the
reliable "I'm on a platform" signal. A developer wiring this into Claude
Desktop over stdio never sets one, so local stdio behaviour is preserved.
Anything the operator sets explicitly always wins.

### Proof the fix works

Booted with **only `PORT`** set — nothing else — exactly as a managed host does:

```console
$ env -u NODE_ENV -u HOST PORT=9099 node dist/index.js

🌐 MCP Streamable HTTP transport listening on http://0.0.0.0:9099/mcp
📡 STDIO: Ready for direct MCP connections
✓ Officer console: http://0.0.0.0:9099/console

$ ss -ltn | grep 9099
LISTEN 0  511  0.0.0.0:9099  0.0.0.0:*        # 0.0.0.0, not 127.0.0.1

$ curl -X POST http://169.254.0.21:9099/mcp ... -d '{"method":"initialize",...}'
200                                            # answered on the POD IP

$ # tools/list over a real MCP session
44                                             # all 44 tools live
```

---

## 1. Merge your work to `main` first

NitroCloud deploys a branch — by default `main`. Your work is on
`genspark_ai_developer` behind PR #2, so `main` is currently missing all 44
tools.

> https://github.com/RomitDeokar/Nitrostack-Passport/pull/2

Merge it. (You *can* point NitroCloud at a non-default branch instead, but for
a hackathon judged from your repo, `main` should be the real thing.)

---

## 2. Create the app on NitroCloud

1. Go to **https://cloud.nitrostack.ai** and sign in.
   (Not `nitrocloud.ai` — that domain does not resolve.)
   Use the **same account** as your hackathon submission, or the app won't
   appear in the Step 2 dropdown.
2. **New App** → **Deploy from GitHub**.
3. Authorise the GitHub App, granting access to `RomitDeokar/Nitrostack-Passport`.
4. Select the repo, branch **`main`**, root directory **`/`**.

NitroCloud advertises *"automatic containerization … no Dockerfiles, no YAML"*,
so it detects the NitroStack project and runs `npm install` → `npm run build` →
`npm start`. The `Dockerfile` in this repo is a self-hosting fallback and is
harmless if ignored.

---

## 3. Environment variables

Set these in the app's **Environment / Secrets** panel.

**Required — none.** Thanks to the §0 fix the server now self-configures from
the injected `PORT`. Setting them explicitly is still good hygiene:

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Selects dual HTTP+stdio transport. Auto-defaulted when `PORT` is present. |
| `HOST` | `0.0.0.0` | Bind all interfaces. Auto-defaulted. |
| `PORT` | *(leave unset)* | **Injected by NitroCloud.** Do not hardcode. |

**Optional — feature flags:**

| Variable | Value | Effect |
|---|---|---|
| `PASSPORTIQ_CASEFLOW` | `true` | Arms the background case orchestrator — cases advance on their own. **Recommended for judging: this is the "agentic" demo.** |
| `PASSPORTIQ_AUTOPILOT` | `true` | Arms the queue-sweep autopilot. |
| `GEMINI_API_KEY` | *(secret)* | Enables LLM planning + narration (`gemini-2.0-flash`). |
| `OPENAI_API_KEY` | *(secret)* | Alternative provider (`gpt-4o-mini`). |
| `PASSPORTIQ_LLM_MODEL` | e.g. `gemini-2.0-flash` | Override the model. |

Two things worth knowing:

- **No LLM key is required.** Every stage, the rulebook, the risk score and the
  agent loop have deterministic fallbacks. Without a key the demo still works
  end to end — the agent just plans deterministically instead of via a model.
  This is a genuine strength; say so if a judge asks what happens when the
  model is down.
- **Never set `PASSPORTIQ_ALLOW_UNGUARDED_DECISION=true`.** It bypasses
  `PipelineCompleteGuard` — the human-in-the-loop gate that *is* the pitch. The
  server prints a loud warning if you do.

---

## 4. Deploy and verify

Hit **Deploy** and watch the log stream. You want to see:

```
✅ Application initialized with 44 tools, 4 resources, 3 prompts
🌐 MCP Streamable HTTP transport listening on http://0.0.0.0:<PORT>/mcp
✓ Case register — 9 passport case(s) across 7 lifecycle stage(s)
```

You'll get a URL like `https://passportiq-<hash>.nitrocloud.app`.

Verify from your own machine — substitute your URL:

```bash
URL=https://passportiq-xxxx.nitrocloud.app

# 1) Health
curl -s "$URL/api/console/health" | head -c 300

# 2) MCP handshake — capture the session id
SID=$(curl -s -D- -o /dev/null -X POST "$URL/mcp" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "protocolVersion":"2025-06-18","capabilities":{},
        "clientInfo":{"name":"probe","version":"1"}}}' \
  | grep -i '^mcp-session-id:' | tr -d '\r' | cut -d' ' -f2)

# 3) Count the tools — expect 44
curl -s -X POST "$URL/mcp" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "mcp-session-id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | grep -o '"name":"[a-z_]*"' | sort -u | wc -l
```

Also open **`$URL/console`** — the officer console. That is what you screen-record.

### If the health check never goes green

| Symptom | Cause | Fix |
|---|---|---|
| Probe times out, logs look fine | Bound `localhost` | Confirm §0 Bug B fix is on the deployed branch; set `HOST=0.0.0.0` |
| No `/mcp` in logs, only `STDIO` | `NODE_ENV` unset **and** `PORT` unset | Set `NODE_ENV=production` |
| Logs show port `3000`, platform probes another | §0 Bug A — start still routed via CLI | Confirm `package.json` `start` is `node dist/index.js` |
| Build fails on widgets | `src/widgets` deps missing | `npm run widgets:install`, commit the lockfile |

---

## 5. Point the submission form at it

Back on **Step 2 of 5** → refresh → your app now appears → select it → **Save & continue**.

Judges will call your MCP over Streamable HTTP at `<your-url>/mcp`.

---

## Appendix — self-hosting fallback

If NitroCloud misbehaves, any container host works and the same env rules apply:

```bash
docker build -t passportiq .
docker run -p 8080:8080 \
  -e NODE_ENV=production -e HOST=0.0.0.0 -e PORT=8080 \
  -e PASSPORTIQ_CASEFLOW=true \
  passportiq
```

The `Dockerfile` is a 2-stage `node:20-slim` build with a `/api/console/health`
healthcheck already wired.
