# SHIPPING FORAY TO NITROCLOUD

Run this first — it checks what a container will experience, not what your
laptop does:

```bash
python tools/preflight.py
```

---

## The thing to understand before you start

**NitroCloud deploys the NitroStack project. That is the MCP layer only.**

Foray is two services:

```
  NitroCloud                              somewhere public
 ┌──────────────────────┐   FORAY_API_URL  ┌─────────────────────┐
 │ src/  (TypeScript)   │ ───────────────► │ api/  core/ agents/ │
 │ 3 MCP servers        │      HTTPS       │ FastAPI + SQLite    │
 │ Warden guard         │                  │ + the LLM calls     │
 └──────────────────────┘                  └─────────────────────┘
        deployed by NitroCloud                 you deploy this
```

The MCP tools hold **zero business logic** — every one is a `fetch` onto
the Python API. That was a design decision for testability, and it happens
to make this split clean: there is exactly **one** coupling between the two
halves, the `FORAY_API_URL` environment variable.

`grep -rn "localhost\|127.0.0.1" src/` returns exactly one line, and it is
that variable's default.

**The MCP server boots fine with the backend unreachable** — all 10 tools
register, and calls return "Foray API unreachable" rather than crashing.
So a NitroCloud deploy will come up green even before you point it at a
backend. Verified.

---

## Step 1 — deploy the Python API

Anywhere that takes a Dockerfile. `Dockerfile.api` is ready:

```bash
docker build -f Dockerfile.api -t foray-api .
docker run -p 8000:8000 --env-file .env foray-api
```

Free hosts that work: **Render**, **Railway**, **Fly.io**. Point them at
`Dockerfile.api`, set the env vars below, deploy.

Environment for that service:

```
FORAY_LLM_PROVIDER=gemini
GEMINI_API_KEY=...
FORAY_LLM_MODEL=gemini-3.5-flash-lite
```

The image runs `api.db` + `seed_generator.py` + **`seed_profiles.py`** +
`seed_crosscourse.py` at build time, so the service boots with the full cohort *and* the 9 accounts,
6 classes and 48 enrollments. All three are deterministic and make no API
calls, so the build is reproducible.

> ⚠️ **`seed_profiles.py` is not optional.** Without it the image has ZERO
> users: every login 401s and the entire logged-in surface — chat, roster,
> transcripts, topics, the subject switcher — is dead, with no error that
> points at the cause. The build now `exit(1)`s if it ends up with no users.

> ⚠️ **SQLite on ephemeral disks.** Most free tiers wipe the filesystem on
> restart, so live captures written during a session disappear. That is
> fine for a demo (the seeded cohort is baked into the image and returns on
> every boot) but it is not persistence. Attach a volume if you need
> writes to survive.

### ⚠️ The grounding corpus is not in git

`data/materials/chunks.json` is gitignored — it is extracted textbook
content. **A cloud deploy built from a clean clone will have no material,
so every correction escalates and beat 1 loses its citation.** Preflight
warns about this.

Three options, in increasing order of hassle:

1. **Commit it** — 528 KB. Simplest; make the copyright call yourself.
2. **Bake it in** — copy the file into the build context manually, or add
   `python tools/chunk_material.py` to the Dockerfile with the PDF mounted.
3. **Ship it as a volume/secret** at runtime.

---

## Step 2 — deploy the MCP layer to NitroCloud

The repo root is already a valid NitroStack project — Studio badges it,
and a **fresh clone builds clean in ~15s**, which is what NitroCloud does.
Verified with `git clone . /tmp/x && npm install && npm run build`.

**From Studio:** App Canvas header → *Link to app…* or *Create Cloud App*
→ **Deploy**. It walks through bundle → upload → confirm → live.

**From GitHub (auto-deploy on push):** NitroCloud → your app →
MCP → Deployments → *Connect Repository* → pick `main` → *Link Repository
& Enable Auto-Deploy*. Every push then deploys.

> Push first — deployments build from the remote, not your working tree.

Set on the NitroCloud app:

```
FORAY_API_URL=https://your-api-host.onrender.com
FORAY_ROLE=faculty          # or per-connection, for the beat-6 contrast
```

`FORAY_API_URL` is the whole integration. Get it wrong and every tool
returns "Foray API unreachable" — which is at least a clear error, not a
silent failure.

---

## Step 3 — verify the deployment

```bash
FORAY_API_URL=https://your-api-host npm run verify
```

Runs both halves against the deployed backend:

- **warden** — the permission boundary (beat 6), 10 checks
- **mcp** — that allowed calls round-trip and return real data, 8 checks

`npm run preflight` additionally verifies, without deploying:
every MCP tool is in `TOOL_SCOPES` (unmapped tools are denied by default),
`permissions.ts` still mirrors `api/schema.py`, and the image seeds the
accounts.

Then in Studio, call `get_clusters {week: 6}` and confirm you see
`CL_006_M12` with `student_count: 23`.

---

## What does NOT deploy, and does not need to

- **`ui/`** — the React app is the demo surface, not part of the MCP
  product. Host it on Netlify/Vercel/Pages if you want it public; point its
  proxy at the deployed API.
- **`notes/`** — the source PDFs. Gitignored, 60 MB, not needed at runtime.
- **`demo/`** — seeding and reset are build-time only.

---

## Checklist

- [ ] `python tools/preflight.py` — no blockers
- [ ] Decide what happens to `chunks.json` (see above)
- [ ] Python API deployed, `/health` returns `llm` not `"offline"`
- [ ] `git push` — auto-deploy builds from the remote
- [ ] `FORAY_API_URL` set on the NitroCloud app
- [ ] `npm run verify` against the deployed backend
- [ ] `get_clusters {week: 6}` in Studio returns 23 of 60
