# Deploying InstantPulse & connecting it to ChatGPT

---

## First, a clarification worth making

Two NitroStack products get confused, and they do different jobs:

| | What it is | Use it for |
|---|---|---|
| **NitroStudio** — <https://nitrostack.ai/studio> | A **local** visual testing environment. Connects to your project over stdio. | Development and testing on your own machine |
| **NitroCloud** — <https://cloud.nitrostack.ai> | The actual **hosting** platform. Serverless, auto-scaling, automatic SSL. | Putting your server on the public internet |

**NitroStudio does not host anything.** To connect InstantPulse to ChatGPT you need NitroCloud (or any other host) — ChatGPT can only reach a public HTTPS URL.

There is no `nitrostack deploy` command. Deployment is git-push based.

---

## Step 1 — Understand the transport switch

Local clients (NitroStudio, Claude Desktop) talk over **stdio**. Remote clients (ChatGPT) need **Streamable HTTP**.

The server picks automatically:

| `MCP_TRANSPORT_TYPE` | Result |
|---|---|
| unset in development | stdio only |
| unset in production | dual (stdio + HTTP) |
| `http` | HTTP only — **use this for hosting** |
| `dual` | both |

In HTTP mode the MCP endpoint is:

```
POST/GET  https://your-domain/mcp
```

That `/mcp` path is exactly what ChatGPT expects.

**Verify locally before deploying:**

```bash
npm run build
```

```bash
MCP_TRANSPORT_TYPE=http PORT=3000 node dist/index.js
```

Then in another terminal:

```bash
curl -X POST http://localhost:3000/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'
```

You should get back `"serverInfo":{"name":"instantpulse","version":"1.0.0"}`. If you do, the server is ready to host.

---

## Step 2 — Fix one thing before you deploy

**InstantPulse currently stores application records on local disk** (`ApplicationStore` writes to `./data`). NitroCloud is serverless and scales to zero, so that directory is wiped between cold starts.

For a hackathon demo this is usually fine — each demo run creates its applications fresh, and `decision_run_full_pipeline` does everything in one call anyway. Just know that:

- Applications will not survive a cold start
- The review queue may look empty if the container recycled between calls

If you need persistence, swap the `load()` / `flush()` pair in `src/common/store/application.store.ts` for a database. Everything else is written against the store's interface, so nothing outside that file changes.

**Do not skip this consideration if you plan to demo the officer workflow live** — run the scoring and the review in the same session.

---

## Step 3 — Put the code on GitHub

NitroCloud deploys from a GitHub repository. This project is not a git repo yet:

```bash
git init
```

```bash
git add . && git commit -m "InstantPulse: AI business onboarding and credit pre-screening MCP server"
```

Create an empty repo on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/instant-pulse.git && git branch -M main && git push -u origin main
```

**Check before you push:** `.gitignore` already excludes `.env` and `data/`. Confirm your Plaid keys are not in the commit:

```bash
git log --all --full-history -p -- .env
```

That should return nothing. If it returns your keys, rotate them in the Plaid dashboard immediately.

---

## Step 4 — Deploy to NitroCloud

1. Sign in at <https://cloud.nitrostack.ai> (free tier, no card required)
2. **New project → import from GitHub**, pick your `instant-pulse` repo
3. Set the build and start commands if prompted:
   - Build: `npm install && npm run build`
   - Start: `npm run start:prod`
4. Add environment variables in the dashboard — **not** in a committed file:

   | Variable | Value |
   |---|---|
   | `MCP_TRANSPORT_TYPE` | `http` |
   | `NODE_ENV` | `production` |
   | `PLAID_CLIENT_ID` | your Sandbox client id |
   | `PLAID_SECRET` | your Sandbox secret |
   | `PLAID_ENV` | `sandbox` |
   | `STRIPE_SECRET_KEY` | `sk_test_…` (optional) |
   | `INSTANTPULSE_OFFICER_TOKEN` | any strong random string |

   Leave the Plaid variables out entirely and the server runs in simulated mode — still fully functional.

5. Deploy. Note the URL you get back, e.g. `https://instant-pulse-xxxx.nitro.cloud`

**Confirm it is live** by running the same curl from Step 1 against `https://your-url/mcp`.

### Other hosting options

The same build works anywhere that runs Node and gives you HTTPS — the documented alternatives are AWS (ECS/Lambda), Google Cloud Run, Azure Container Instances, DigitalOcean App Platform and Heroku. Cloud Run is the simplest of these. Whatever you choose, set `MCP_TRANSPORT_TYPE=http` and expose the port.

---

## Step 5 — Connect it to ChatGPT

**Requirements**, all of which InstantPulse now meets:

- Streamable HTTP transport ✅
- Endpoint at `/mcp` ✅
- Public HTTPS with a stable URL ✅ (from Step 4)

**Steps:**

1. Open ChatGPT → **Settings → Connectors**
2. Enable **Developer mode** (availability depends on your ChatGPT plan)
3. **Create / Add custom connector**
4. Give it a name — `InstantPulse` — and paste your MCP URL:

   ```
   https://your-url/mcp
   ```

5. Leave authentication as **None** unless you added OAuth
6. Save, then start a new chat and enable the connector

**Test it** by asking ChatGPT:

> Use InstantPulse to run a full onboarding decision for a wholesale distributor called Northwind Supply Co. requesting $50,000, using the healthy persona.

ChatGPT will call `decision_run_full_pipeline` and render the decision dashboard inline — the widgets are built with the OpenAI Apps SDK MIME type, so they display natively in ChatGPT rather than as raw JSON.

### If ChatGPT will not connect

- **Verify the URL independently first.** Use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector), choose **Streamable HTTP**, paste your `/mcp` URL. If Inspector cannot connect, ChatGPT will not either — the problem is your deployment, not ChatGPT.
- **Do not use a localhost tunnel** (ngrok and similar) for anything you intend to keep. It works for a quick test but the URL is not stable.
- **Check `MCP_TRANSPORT_TYPE=http` is actually set** in the host's environment. If the server booted in stdio mode, `/mcp` returns nothing.
- **Timeouts:** in live Plaid mode a full pipeline takes ~15 seconds. If your host has an aggressive request timeout, either raise it or run in simulated mode for the ChatGPT demo.

---

## Step 6 — Security before you share the URL

A public MCP endpoint is callable by anyone who has the link. Before sharing:

- **Set `INSTANTPULSE_OFFICER_TOKEN`.** Without it, `review_override_decision` runs unauthenticated and anyone could approve an application.
- **Keep Plaid on `sandbox` and Stripe on a test key.** The server refuses live Stripe keys, but nothing stops you setting `PLAID_ENV=production` — do not.
- **Consider adding auth.** NitroStack ships JWT, API-key and OAuth modules; see `docs.nitrostack.ai`. For a hackathon demo an unauthenticated sandbox endpoint is normally acceptable — just be deliberate about it.
- **Rotate anything you have ever committed.** If a key touched a git commit, treat it as public.

---

## Quick reference

```bash
npm run dev          # local, stdio, hot reload
```

```bash
npm run verify       # 46 end-to-end checks over real MCP
```

```bash
npm run build        # compile server + bundle widgets
```

```bash
npm run start:prod   # production server (respects MCP_TRANSPORT_TYPE)
```

| Client | Transport | How |
|---|---|---|
| NitroStudio | stdio | Select Project → Connect |
| Claude Desktop | stdio | `claude_desktop_config.json` → `node dist/index.js` |
| Cursor | stdio | `npx nitrostack-cli cursor` |
| **ChatGPT** | **Streamable HTTP** | **Settings → Connectors → Developer mode → `https://…/mcp`** |
