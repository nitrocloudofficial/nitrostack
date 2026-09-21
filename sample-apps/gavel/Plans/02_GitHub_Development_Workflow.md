# 2. GitHub & Development Workflow

**Project:** Frontend Intelligence MCP — NitroStack × SRMIST Hackathon
**Purpose:** Defines *how* the team collaborates in code, so four people can commit to the same repo for 48 hours without stepping on each other.

---

## 2.1 Repository Setup

- **One repo, one org.** Create the repo under a team GitHub org or one member's account, add all 4 members as collaborators with write access before hour 0.
- **Repo name:** `frontend-intelligence-mcp`
- **Visibility:** Private during the build, switch to **public** before final submission (judges usually need to view the repo directly — check the exact hackathon rule and switch it early, not at hour 47).
- **Branch protection on `main`:** require at least 1 approval before merge, no direct pushes to `main` after the initial scaffold commit.
- **Initial setup owner:** Role B (they're scaffolding the project first anyway — see Starter Repository Spec).
- **Add a `.gitignore`** immediately (`node_modules`, `.env`, `dist/`, `.DS_Store`) — before the first real commit, so nobody accidentally commits secrets or build output.

---

## 2.2 Branch Strategy

```
main                    ← always demoable. Protected.
 └── dev                ← integration branch. Everyone merges here first.
      ├── feature/analyzer          (Role B)
      ├── feature/rule-engine       (Role C)
      ├── feature/widgets           (Role A)
      ├── feature/benchmark         (Role D)
      └── fix/<short-description>   (anyone, as needed)
```

- **`main`** — only updated from `dev` at integration checkpoints (§1.4) and right before submission. This is what judges see and what gets deployed.
- **`dev`** — the shared working branch. Everyone's feature branches merge into `dev`, not directly into `main`.
- **`feature/<role-area>`** — one long-lived branch per role's area, rebased/merged from `dev` regularly to avoid drift.
- **`fix/<description>`** — short-lived branches for bug fixes discovered during integration testing.

**Naming convention:** lowercase, hyphen-separated, prefixed by type: `feature/`, `fix/`, `chore/`, `docs/`.

---

## 2.3 Git Workflow (Daily Loop)

Every time you sit down to work:

```bash
git checkout dev
git pull origin dev
git checkout feature/<your-area>
git merge dev                     # pull in what others have merged
# ... do your work ...
git add .
git commit -m "feat(analyzer): extract theme tokens from tailwind config"
git push origin feature/<your-area>
# open a PR into dev when the piece is working, don't wait until it's "perfect"
```

**Rule of thumb:** push and open a PR at least once every 2–3 hours, even if incomplete. Long-lived unpushed work is how integration checkpoints fail.

---

## 2.4 Commit Conventions

Use **Conventional Commits**, scoped to your module:

```
<type>(<scope>): <short description>

feat(rule-engine): add confidence formula with conflict penalty
fix(widgets): recommendation card fails to render rejected list
chore(schemas): sync ProjectProfile type after analyzer update
docs(readme): add architecture diagram
refactor(groq): shorten prompt template for latency
test(benchmark): add lighthouse comparison test case
```

| Type | When to use |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fix |
| `chore` | Tooling, config, non-functional changes |
| `docs` | README/docs only |
| `refactor` | Code restructuring, no behavior change |
| `test` | Adding or updating tests |

**Scope = your folder area** (`analyzer`, `rule-engine`, `widgets`, `benchmark`, `schemas`, `deploy`) — this makes `git log` scannable at a glance, which matters when 4 people are committing fast.

---

## 2.5 PR & Merge Strategy

- **Every PR into `dev` needs 1 review** from any other team member — a quick skim, not a formal code review. The goal is a second pair of eyes catching a broken contract before it blocks someone else.
- **PR description template** (keep it short):
  ```
  ## What
  ## Why
  ## Affects (which other roles' code touches this?)
  ## Tested how
  ```
- **Merge method:** squash-and-merge into `dev` to keep history readable. Regular merge (no squash) from `dev` into `main` to preserve the integration history.
- **Self-merge is allowed** only for `chore`/`docs` changes or when the reviewer is genuinely unavailable and the checkpoint clock is running — flag it in the team channel when you do.
- **Never merge a PR that breaks another role's build.** If your PR changes a shared schema, tag the affected role explicitly in the PR and wait for their thumbs-up.

---

## 2.6 Conflict Resolution

- **File-level ownership prevents most conflicts** (see §1.3 in the Team Execution Plan) — if you're only ever editing your own folder, merge conflicts should be rare and shallow.
- **When a merge conflict happens:**
  1. Whoever is merging resolves it, but pings the original author of the conflicting lines before finalizing — don't silently pick a side.
  2. If it's a shared schema file, Role B (schema owner) has final say on the resolved shape.
  3. If it's ambiguous or contentious, resolve it live over a 2-minute call rather than back-and-forth over chat.
- **Never force-push to `dev` or `main`.** Force-push is only acceptable on your own `feature/*` branch, and only before it's been reviewed.
- **If two people edited the same file for legitimate reasons**, that's a signal the ownership split needs a quick adjustment — flag it, don't just keep patching around it.

---

## 2.7 Feature Freeze

- **Feature freeze at hour 40** (aligned with the rehearsal checkpoint in the Hackathon Playbook). After this point:
  - No new features, no new tools, no new widgets.
  - Only bug fixes and polish (copy, styling, README) are allowed.
  - Any fix after freeze needs a 1-line justification in the PR: "why this can't wait."
- **Deploy freeze at hour 44.** The deployed server should not change after this point except for a critical, demo-breaking bug.
- This exists because the single biggest risk in a 48-hour build is a "small improvement" at hour 46 that breaks something that was working.

---

## 2.8 Final Submission Workflow

1. **Merge `dev` → `main`** one last time, confirm the build passes cleanly from a fresh clone.
2. **Tag the release:** `git tag -a v1.0-submission -m "Hackathon submission"` and push the tag.
3. **Confirm `main` is what's deployed** — the live MCP server URL should reflect the tagged commit, not an untested later change.
4. **Switch repo visibility to public** (if required) and do a final check that no `.env` or API key is committed anywhere in history.
5. **Final README pass** — architecture explained, setup instructions correct, demo video linked, team section filled in.
6. **Submit** the repo link, live server URL, and pitch deck through the hackathon's submission form before the deadline — don't wait until the last 5 minutes to discover the form needs something you don't have ready.
