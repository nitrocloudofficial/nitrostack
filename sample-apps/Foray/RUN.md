# RUNNING FORAY

Every command here has been run and verified. If something behaves
differently, that is a real bug — not a docs typo.

---

## First time on a machine

```bash
pip install -r requirements.txt        # fastapi, uvicorn, anthropic, pymupdf
npm install                            # NitroStack MCP layer (repo root)
npm --prefix ui install                # React UI
```

### ⚠️ The one step that isn't in git

`data/materials/chunks.json` — the grounding corpus — is **gitignored**,
because it is extracted textbook content. Without it every correction
escalates and **beat 1 loses its page citation, silently.**

So on any machine that isn't the one that built it:

```bash
# put the course PDF at:
#   notes/sem/Computer Networks/Computer Networking_ A Top-Down Approach...pdf
python tools/chunk_material.py         # → 204 chunks, ~30s
```

`reset.sh` refuses to run without it and tells you this, so you cannot get
this wrong quietly.

The REST of the class content — lecture slide decks, problem sets, Wireshark
labs from the uploaded `sem V.zip` — is chunked separately (also gitignored):

```bash
# extract the zip's "Computer Networks" folder under notes/sem V/ first
python tools/chunk_class_content.py    # → 179 chunks (slides cite the slide number)
```

The five **Semester VI** subjects (Compiler Design, Distributed Systems,
Cyber Security, IoT, Software Engineering) chunk from `notes/sem VI/`:

```bash
python tools/chunk_sem6.py             # → ~700 chunks across five subjects
```

Their concept graphs + misconception taxonomies are hand-authored in
`data/sem6_courses.json`. The IoT PDFs in the archive are scanned images
(zero extractable text), so the IoT corpus is hand-authored course notes —
the source label says so, no invented citations.

### Optional: go live

```bash
# .env at the repo root (already gitignored)
FORAY_LLM_PROVIDER=gemini
GEMINI_API_KEY=...                     # aistudio.google.com/apikey — free
FORAY_LLM_MODEL=gemini-3.5-flash-lite
```

Without it, the Diagnostician and Grounding Verifier run **deterministic
offline matchers** and report `source: "offline"`. Everything works — but
beats 1 and 2 are supposed to be live. See `GET /health` → `"llm"`.

Switching provider is one env var — no code change:

| Provider | Set | Key variable |
|---|---|---|
| Google AI Studio | `FORAY_LLM_PROVIDER=gemini` | `GEMINI_API_KEY` |
| Groq | `FORAY_LLM_PROVIDER=groq` | `GROQ_API_KEY` |
| OpenRouter | `FORAY_LLM_PROVIDER=openrouter` | `OPENROUTER_API_KEY` |
| Anthropic | `FORAY_LLM_PROVIDER=anthropic` | `ANTHROPIC_API_KEY` |
| Local / other | `FORAY_LLM_PROVIDER=custom` | `FORAY_LLM_API_KEY` + `FORAY_LLM_BASE_URL` |

Groq/OpenRouter/Together speak OpenAI's wire format, so the `openai` SDK
drives them — **you do not need an OpenAI account**. Base URLs are built in.

⚠️ **Check the model's daily quota.** `gemini-3.5-flash` is 20/day on the
free tier and `gemini-2.5-flash` is retired (404). We use
`gemini-3.5-flash-lite`. `python -m agents.llm` prints what your key reaches.

---

## Load the demo state

```bash
bash demo/reset.sh
```

One command. Drops the DB, reloads concepts/taxonomy/materials, regenerates
the 60×8 cohort, creates the class + logins + scenario chat/topic data, and
clears the access log so beat 6 starts clean.

### Logins (all passwords: `foray123`)

Six classes, one teacher. Each student is enrolled in their own subject —
the chat, the analysis, the constellation and the questioned-topic counts
all scope to it.

| Who | Email | Class | Scenario on the roster |
|---|---|---|---|
| **Prof. Meenakshi Raman** | `faculty@foray.edu` | all six | the one teacher — roster + counts, never words |
| Aarav Krishnan | `aarav@foray.edu` | CS3591 Computer Networks | Cleared after intervention |
| Divya Subramaniam | `divya@foray.edu` | CS3591 Computer Networks | Still holds M12 after reteach |
| Karthik Venkatesan | `karthik@foray.edu` | CS3591 Computer Networks | Weak on root cause (C03) |
| Meera Lakshman | `meera@foray.edu` | CS3452 Software Engineering | Consistent high mastery |
| Pranav Iyer | `pranav@foray.edu` | CS3551 Distributed Systems | Asks the most questions |
| Sahana Ramesh | `sahana@foray.edu` | 19CSE311 Cyber Security | Reflects in Tamil-English |
| Tamilselvan Anbu | `tamilselvan@foray.edu` | CS3691 IoT | Low participation |
| Ananya Pillai | `ananya@foray.edu` | CS3501 Compiler Design | Out-of-syllabus questions |

Students land in the **chat capture** (typed or spoken — the mic needs
Chrome/Edge; the "read replies aloud" toggle speaks agent turns). Every
message is analysed in place: misconception named (R-01), correction only
with a citation (R-02), questions counted per concept (R-12), and both
sides logged append-only (R-11). Students can reread their own transcript
under **My interaction log**; faculty opening one gets **DENIED + logged**.

**It makes zero API calls** and **exits non-zero if the demo drifts:**

```
PLANT CHECK  M12: week 6 = 23   week 7 = 4
ROOT CAUSE   M12 traces to C03 (expected C03)
OK — beat 3 shows 23 of 60, beat 4 shows 23 → 4
```

Run it between every rehearsal, and once more at 11:55.

---

## The three processes

Three terminals, from the repo root:

```bash
# 1 — Python spine
uvicorn api.main:app --port 8000

# 2 — React UI
npm --prefix ui run dev

# 3 — NitroStack MCP server (only needed for NitroStudio / beat 6)
npm run dev
```

| | URL | Notes |
|---|---|---|
| UI | **http://localhost:5173** | ⚠️ see the IPv6 note below |
| API | http://127.0.0.1:8000 | `/health` reports the provider, e.g. `gemini:gemini-3.5-flash-lite` |
| API docs | http://127.0.0.1:8000/docs | FastAPI, useful for poking endpoints |
| MCP | stdio + http://localhost:3000/mcp | NitroStudio connects here |

The UI proxies `/ui/*` to the API, so you only ever open the UI URL.

### ⚠️ Use `localhost`, never `127.0.0.1`, for the UI

On this machine Vite binds **IPv6 only** (`[::1]:5173`):

```
http://localhost:5173    → 200
http://127.0.0.1:5173    → connection refused
```

If the browser says "can't connect", check that first before debugging
anything else.

### ⚠️ Vite silently moves ports

If 5173 is already held by an old dev server, Vite starts on **5174** and
only says so in its own output. Read the terminal, don't assume 5173.
Kill strays with `taskkill //F //IM node.exe`.

---

## Before every rehearsal

> ⚠️ **Order matters.** `npm run verify` writes DENIED rows to the access
> log, so running it *after* `reset.sh` leaves beat 6 starting with rows
> already on screen. The full run-through caught this.

```bash
npm run verify                         # FIRST — it dirties the access log
bash demo/reset.sh                     # THEN reset: 23 → 4, C03, log empty
python demo/runthrough.py              # all six beats, in demo order
```

`demo/runthrough.py` walks every beat through the real endpoints and times
them. It is the §14 "wire the demo" check — it catches the thing that
actually kills demos, which is beat 4 never having been wired to beat 3.
It found two real bugs the first time it ran.

`npm run verify` runs both halves:

- **`verify-warden.mjs`** — the permission boundary. Denies and allows in
  both directions. If this fails, **beat 6 is broken and nothing else
  matters.**
- **`verify-mcp.mjs`** — that an *allowed* call actually round-trips
  NitroStack → Python → SQLite and returns real data. "Allowed" only means
  the Guard dispatched; a tool can be allowed and still error. Needs the
  Python API running.

---

## Driving the demo

| Beat | Where | What to do |
|---|---|---|
| 1 | UI → Student | Type a reflection, pick the concept, Submit. Misconception is **named**, your words quoted back. |
| 2 | UI → Student | Submit something outside the unit. Panel turns red: **ESCALATED TO FACULTY**, no correction sent. |
| 3 | UI → Faculty | Click the week-6 / C11 cell. `M12 · 23 of 60` → root cause **C03 Addressing and ports**, badged *earlier unit*. |
| 4 | UI → Faculty | Deliver the intervention, switch to week 7 → **23 → 4**. *(S4)* |
| 5 | UI → Student | Compass panel. *(stretch)* |
| 6 | NitroStudio ×2 | Two connections, `FORAY_ROLE=diagnostician` and `FORAY_ROLE=faculty`. Same tool, opposite outcomes. Log row appears in the UI. |

Beat 6 in NitroStudio: **Add Server → Nitro Project →** browse to
`Desktop/Foray` (it carries the NitroStack badge) → **Studio App Canvas**.
Studio launches it itself with `npx tsx src/index.ts` — you don't need
process 3 already running.

---

## Known noise — do not chase these at 4am

- **`Cannot resolve token "OAUTH_CONFIG"`** on every MCP start. Harmless: we
  never import `OAuthModule`, the framework auto-registers it, and the next
  line reads `foray started successfully`. It looks alarming on Studio's
  Logs page. See `NITROSTACK.md`.
- **`Foray API unreachable`** from an MCP tool means process 1 isn't
  running. The Warden still works — it runs *before* the handler.
- **Everything escalates, no citations anywhere** → `chunks.json` is missing.
  Run the chunker.
