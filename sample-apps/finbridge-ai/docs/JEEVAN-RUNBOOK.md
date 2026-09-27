# Jeevan — step by step

Your branch: `jeevan/server`
Your files: `src/index.ts`, `src/app.module.ts`, `src/modules/knowledge/`, config,
deploy, README assembly, video, PR, community post.

Work top to bottom. Don't skip ahead — step 3 is the gate everything else waits on.

---

## STEP 0 — Get the code (5 min)

Praneeth has to push first. Ask him if he's done it. Then:

```bash
git clone <repo-url>
cd finbridge-ai/finbridge-ai
git checkout jeevan/server
npm install
```

Create your local env file — it isn't in the repo on purpose:

```bash
cp .env.example .env
```

**Never commit `.env`.** It's gitignored; leave it that way.

Confirm the code compiles:

```bash
npx tsc --noEmit
```

Silence means it worked. Any output, tell Praneeth before you go further.

- [ ] Cloned, on `jeevan/server`, `npm install` done
- [ ] `.env` created from `.env.example`
- [ ] `npx tsc --noEmit` silent

---

## STEP 1 — The three unknowns (30 min, do this FIRST)

Do not start with the deploy. Do this while your brain is fresh, because it's the
cheapest work on your list and the most expensive to get wrong late.

Find the organiser's brief and write down:

1. **Exact demo video length limit** — in seconds. If it says "2–3 minutes", write
   down which one is the hard cap.
2. **Sample Apps PR format** — which repo, which folder, what the PR title and
   description must contain, whether a screenshot is required.
3. **Discord post tag requirements** — which channel, which tags, any required
   template.

I could not find any of these publicly. There is no `sample-apps` repo under
NitroStack's GitHub org, so these are hackathon rules, not NitroStack rules. They
will be in the organiser's brief, the event page, or the Discord rules channel.

**Write the answers into this file** under each item, then commit it. Your future
self at 05:30 will thank you.

- [ ] Video length limit: ______
- [ ] PR format: ______
- [ ] Discord tags: ______

---

## STEP 2 — Boot it locally and prove the surface (20 min)

Before you try to deploy anything, prove it works on your own machine.

```bash
npm run dev
```

Then in NitroStudio (or any MCP client), connect and confirm you can see:

- 4 tools: `check_scheme_eligibility`, `project_investment_growth`,
  `calculate_financial_health`, `explain_financial_concept`
- 2 resources: `finbridge://schemes`, `finbridge://glossary`
- 2 prompts: `beginner_investor_advisor`, `scheme_navigator`

Then run the automated sweep:

```bash
npm run sweep
```

**This has never been run successfully.** It was written and tested as far as
possible, but the sandbox it was built in had no internet and the server wouldn't
respond there. Your run is the first real one.

- If it prints a list of ✓ marks — you're good, move on.
- If it hangs or errors — don't sink more than 15 minutes into it. It's a
  convenience, not the product. Fall back to clicking through NitroStudio by hand
  and tell Praneeth the script needs fixing.

- [ ] `npm run dev` boots
- [ ] All 4 tools + 2 resources + 2 prompts visible in a client
- [ ] `npm run sweep` green (or fallback agreed)

---

## STEP 3 — THE +3:00 GATE: deploy on stub data

This is the one that matters. If this isn't green at +3:00, everyone stops their
own work and helps you.

### ⚠ Before you type anything

The official docs at `docs.nitrostack.ai/deployment/cloud` tell you to run:

```bash
nitrostack login     # DOES NOT EXIST
nitrostack deploy    # DOES NOT EXIST
```

**Neither command exists.** Verified against `@nitrostack/cli` 1.0.15, the latest
published version — the real command list is `init, dev, build, start, generate,
upgrade, install, cursor, pack, help`. The docs are ahead of the shipped tool.

Also: the product is **NitroCloud** at `nitrocloud.ai`. "NitroStack Cloud" doesn't
exist as a name — searching for it wastes time.

### Path A — pack and upload (try this first)

```bash
npm run build
npx nitrostack-cli pack --dry-run
```

Read the dry-run output and check two things:

1. **`data/` is INCLUDED.** The scheme and glossary data is read from disk at
   runtime. If `data/` isn't in the zip, both resources fail in production while
   the tools still look fine — a silent failure you'd find on stage.
2. **`.env` is EXCLUDED.** It is by default. Never pass `--include-env`.

Then:

```bash
npx nitrostack-cli pack -o finbridge-ai.zip
```

Sign in at <https://nitrocloud.ai> and upload the zip.

> `pack` edits your `.gitignore` unless you pass `--no-sync-gitignore`. Run
> `git diff .gitignore` afterwards so that change doesn't ride along in an
> unrelated commit.

### Path B — Docker (if Path A stalls)

A `Dockerfile` is already in the repo root.

```bash
docker build -t finbridge-ai .
docker run -p 3000:3000 finbridge-ai
```

If that runs locally, deploy it anywhere that takes a container. Google Cloud Run
is fastest:

```bash
gcloud run deploy finbridge-ai --source . \
  --platform managed --region asia-south1 \
  --allow-unauthenticated --port 3000
```

**Give Path A 45 minutes. If it isn't working, switch to Path B.** Don't let the
gate slip because you were determined to make the first path work.

### Gate is green when ALL of these pass

Against the **deployed URL**, not localhost:

- [ ] URL responds at all
- [ ] `tools/list` returns all 4 tools
- [ ] `resources/list` returns both `finbridge://` URIs
- [ ] `prompts/list` returns both prompts
- [ ] `finbridge://schemes` returns **7 schemes** ← this is the check that catches
      a missing `data/` folder. Do not skip it.
- [ ] One real tool call, end to end, from an MCP client

Announce in the team chat the moment it's green.

---

## STEP 4 — +3:15 Post to Discord/Reddit (15 min)

Screenshot the deployed server with the tools listed. Post it with the tags you
wrote down in Step 1.

Keep it short: what it does, that it's live, one screenshot. You're claiming
early visibility, not writing the submission.

- [ ] Posted, correct tags

---

## STEP 5 — From +4:00, every hour (10 min each)

```bash
npm run sweep
```

Read the output. The rule from `CONTRIBUTING.md`:

> **Two errors against one tool in a single sweep and that tool is cut from the
> video.**

The script counts this for you and prints a warning when it triggers. Each run
saves a log to `sweeps/`, so at 06:00 you have the history rather than a memory.

**Don't negotiate with this rule at 4am.** It exists so you're not arguing about
whether a flaky tool is "basically fine" while the clock runs.

### Also: redeploy after every merge

When anyone merges to `main`, you redeploy. Otherwise the live version drifts
from the code, and your demo shows something that isn't what you built.

```bash
git checkout main && git pull
npm run build
npx nitrostack-cli pack -o finbridge-ai.zip
# re-upload
```

- [ ] Sweep at +4:00, +5:00, +6:00 … logged
- [ ] Redeployed after each merge

---

## STEP 6 — 06:00 onward: assembly

### 6a. README (30 min)

`README.md` already has the skeleton with four empty sections marked. You're
pasting, not writing. Chase these:

| Section | From | What it covers |
|---|---|---|
| 2. How eligibility is computed | Deepak | How the evaluator reads the rulebook, boundary behaviour |
| 3. Projection assumptions | Praneeth | Where NAV comes from, what the range assumes |
| 4. Hallucination table | Jayaram | The bare model vs FinBridge comparison |
| 1. What it does | **you** | Overview, install, deployed URL |

**Chase people at 05:30, not 06:00.** If a section isn't coming, write three
honest sentences yourself rather than shipping a gap.

### 6b. Video

Length limit from Step 1. Suggested shape:

1. The problem — an AI confidently gets a scheme rule wrong
2. The same question through FinBridge — correct, with the reason named
3. The other three tools, quickly
4. The hallucination table as the closing argument

**Any tool cut by the two-error rule does not appear.** Don't sneak it back in
because it worked on the last try.

### 6c. Secrets audit (5 min) — before the repo goes public

```bash
npm run audit:secrets
```

Checks what git would actually publish: no `.env`, no `node_modules`, no keys, no
credential-shaped strings. Exit code 0 means safe.

**If it flags anything, do not push until it's clean.** A leaked key in a public
hackathon repo is not a small problem.

- [ ] All four README sections in
- [ ] Video recorded, within the length limit
- [ ] `npm run audit:secrets` clean
- [ ] Sample Apps PR opened in the format from Step 1

---

## Things that will bite you

1. **The docs' deploy commands don't exist.** Covered above. This is the single
   most likely place to lose an hour.
2. **`data/` must ship next to `dist/`.** The resources resolve it relative to
   their own file. If you flatten the folder structure in a deploy artifact, the
   scheme data silently vanishes.
3. **The sweep script is unproven.** Budget 15 minutes for it to not work.
4. **Don't edit other people's files.** If you need a tool registered differently,
   ask its owner out loud. A merge conflict means someone broke ownership — fix
   the ownership, not the merge.
5. **`app.module.ts` and `index.ts` are yours alone.** Nobody else opens them.
   That's the deal that keeps merges clean.
