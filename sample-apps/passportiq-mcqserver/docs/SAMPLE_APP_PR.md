# Step 4 of 6 — raising the `sample-apps/` PR

⚠️ **Fork `nitrocloudofficial/nitrostack`, not `nitrostack-ai/nitrostack`.**
The org in the form's instructions does not exist (`404`). See
[HACKATHON_SUBMISSION.md](./HACKATHON_SUBMISSION.md) for the evidence.

---

## What the maintainers actually expect

I read the live `sample-apps/` directory. It holds ~30 hackathon entries
(`Sentinel-Autonomous-SOC-Tier1-Analyst`, `ClinicaMind`, `Ekalavya`,
`Agent-Nexus`, …). Each is **the team's whole project folder**, committed as-is:

```
sample-apps/Sentinel-Autonomous-SOC-Tier1-Analyst/
├── .env.example
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── nitrostack/
└── src/
```

So: your real source tree plus a README. No special packaging.

**Do not commit** `node_modules/`, `dist/`, or `.env`.

---

## Commands

Replace `<you>` with your GitHub username and `<TEAM>` with your team name.

### 1. Fork

Open https://github.com/nitrocloudofficial/nitrostack and click **Fork**.

### 2. Clone your fork and branch

```bash
cd ~
git clone https://github.com/<you>/nitrostack.git nitrostack-fork
cd nitrostack-fork
git remote add upstream https://github.com/nitrocloudofficial/nitrostack.git
git fetch upstream
git checkout -b hackathon-passportiq upstream/main
```

Branching from `upstream/main` guarantees you're on top of the latest tree even
if your fork is stale.

### 3. Copy the project in, excluding build artefacts

From your PassportIQ checkout:

```bash
mkdir -p ~/nitrostack-fork/sample-apps/passportiq

rsync -av \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude 'src/widgets/node_modules' \
  --exclude 'src/widgets/out' \
  ~/webapp/ ~/nitrostack-fork/sample-apps/passportiq/
```

No `rsync`? Use `git archive`, which respects `.gitignore` automatically:

```bash
cd ~/webapp
git archive --format=tar HEAD | \
  (mkdir -p ~/nitrostack-fork/sample-apps/passportiq && \
   tar -x -C ~/nitrostack-fork/sample-apps/passportiq)
```

### 4. Add the README

Copy [`sample-app-README.md`](./sample-app-README.md) from this repo:

```bash
cp ~/webapp/docs/sample-app-README.md \
   ~/nitrostack-fork/sample-apps/passportiq/README.md
```

It intentionally **replaces** the project's own root README — the maintainers
want a README that explains the MCP and how to run it, which is precisely what
that file is.

### 5. Sanity-check before committing

```bash
cd ~/nitrostack-fork
du -sh sample-apps/passportiq                      # expect single-digit MB
find sample-apps/passportiq -name node_modules -o -name dist | head
```

The `find` must print **nothing**. If it prints anything, delete those paths —
a PR carrying `node_modules` will be rejected or silently ignored.

### 6. Commit and push

```bash
git add sample-apps/passportiq
git commit -m "[Hackathon] <TEAM> - PassportIQ: agentic MCP copilot for passport verification"
git push -u origin hackathon-passportiq
```

### 7. Open the PR

```bash
gh pr create \
  --repo nitrocloudofficial/nitrostack \
  --base main \
  --head <you>:hackathon-passportiq \
  --title "[Hackathon] <TEAM> – PassportIQ" \
  --body-file ~/webapp/docs/sample-app-README.md
```

No `gh`? Visit https://github.com/nitrocloudofficial/nitrostack/compare and set
base `main` ← head `<you>:hackathon-passportiq`.

**Title must be exactly** — note the **en dash `–`**, not a hyphen:

```
[Hackathon] <TEAM> – PassportIQ
```

### 8. Paste the URL into the form

It will look like `https://github.com/nitrocloudofficial/nitrostack/pull/1234`.

---

## Guideline compliance

| Guideline | Status |
|---|---|
| One PR per team | ✅ single PR |
| PR to the nitrostack repo | ✅ `nitrocloudofficial/nitrostack` (the real one) |
| Clear README + working instructions in `sample-apps/` | ✅ `sample-app-README.md` |
| Against `main` | ✅ |
| Title `[Hackathon] Team – Project` | ✅ |

---

## Note

That repo has **1,464 forks and 160 open issues/PRs**. Yours joins a large
queue and is reviewed *after* judging — so a merge is not required for your
submission to count. Getting the PR **open** before the deadline is what
matters. Don't panic if it sits unreviewed.
