# TEAM.md — AegisPay, Three Machines

Read this before you touch the repo. All three of you.

---

## 1. Roles

| Machine | Agent stack | Owns | Rough share |
|---|---|---|---|
| **M1 Mac** | Claude Code + 4 subagents | MCP server core, integration, deploy, `main` merges | ~50% |
| **M4 Mac** | OpenCode (primary), Hermes (research/debug) | All widgets + widget types + styling | ~30% |
| **LOQ (Win)** | OpenCode or Claude Code | Risk engine, unit tests, fixtures, README, demo video | ~20% |

### Why this mapping

- **M1** has the strongest agentic setup and takes the critical path — the server is what breaks, and it needs the best tooling and the fastest iteration. It also owns merges and deployment, which is real coordination work.
- **M4's widgets live entirely under `src/widgets/`** — a directory the server code never touches. Near-zero merge conflict surface. OpenCode is well suited to focused, self-contained React work.
- **LOQ gets the risk engine** because it's pure TypeScript with zero NitroStack framework knowledge required, fully unit-testable in isolation, and therefore the piece least blocked by having no agent installed yet. It's also the piece judges probe hardest, so the person writing it will be able to answer for it. Docs and the demo video are genuinely visible deliverables, not filler.

---

## 2. Git identity — do this FIRST, on every machine

**This is the single most common reason contributions don't show up on GitHub.** If your commit email isn't a verified email on your GitHub account, GitHub will not attribute the commit to you at all. It shows as an unlinked author.

On each machine, inside the repo:

```bash
git config user.name "Your Full Name"
git config user.email "your-verified-email@example.com"

# verify it took
git config user.name && git config user.email
```

To find your verified email: GitHub → Settings → Emails. If you use the privacy-protected address, it looks like `12345678+username@users.noreply.github.com` — that one works fine and is the safer choice.

**After your first commit, check it worked:**

```bash
git log -1 --pretty=format:'%an <%ae>'
```

Then look at the commit on GitHub. If your avatar appears next to it, attribution is working. If it shows a plain grey avatar with no link, your email is wrong — fix it now, not at hour 20.

### Rules

- **Everyone pushes their own work from their own machine.** Never let one person push another's commits.
- **Never use `git commit --author=`** to commit as someone else.
- If you genuinely pair on something, use a co-author trailer — that's what it's for:
  ```
  Add structuring detection rule

  Co-authored-by: Name <verified-email@example.com>
  ```

---

## 3. Ownership zones — the anti-conflict rule

**You may only edit files in your zone.** Need a change outside it? Message the owner. This one rule eliminates most merge pain in a three-person 24-hour build.

```
M1  → src/modules/**
      src/guards/**
      src/interceptors/**
      src/services/approval.service.ts
      src/services/audit.service.ts
      src/app.module.ts
      src/index.ts

M4  → src/widgets/**            (everything under it)

LOQ → src/services/risk.service.ts
      src/services/risk.rules.ts
      src/services/ledger.fixtures.ts
      tests/**
      README.md
      docs/**
```

### The one shared file

`src/types/contracts.ts` — every shared interface: `Invoice`, `Payment`, `RiskFlag`, `RiskContext`, `ApprovalRequest`, `AuditEntry`, `Thresholds`.

**M1 writes it in hour 0–1, pushes to `main`, and it is then FROZEN.** All three of you build against a fixed contract. Any change to it requires all three to agree and pull immediately — announce it in the group chat before pushing.

This is the highest-leverage thirty minutes of the whole hackathon. Contracts first, then parallel work.

---

## 4. Branches and merge cadence

```
main            ← always deployable, auto-deploys to NitroCloud
├── feat/server   (M1)
├── feat/widgets  (M4)
└── feat/risk     (LOQ)
```

- **Merge to `main` via PR every ~2 hours.** Small and frequent beats one big merge at hour 20.
- **M1 reviews and merges.** One merge owner prevents races.
- PRs also leave a visible review trail showing three people actually collaborating — that's honest evidence of teamwork, and it's exactly what a judge skimming the repo will see.
- **`main` must never be broken.** It auto-deploys. A broken `main` is a broken demo.

### Sync every 2 hours — 5 minutes, no more

1. Everyone: `git pull origin main`
2. Each person: one sentence on done / next / blocked
3. M1: confirm the deployment is still Live

---

## 5. Machine setup

### All three machines

```bash
# Node 20.x — NitroCloud runs 20. Not 22, not 24.
node -v                          # want v20.x.x

npm install -g @nitrostack/cli
git clone <repo-url> && cd aegispay
npm install

# git identity — see section 2
git config user.name "..." && git config user.email "..."
```

Verify before starting: `npm run build` passes, and `npm run dev` opens Studio on :3000.

---

### M1 Mac — Claude Code

```bash
# constitution + subagents
cp CLAUDE.md .
mkdir -p .claude/agents && cp agents/*.md .claude/agents/

# skills (keep it minimal — context bloat is real)
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills
/plugin marketplace add wshobson/agents
/plugin install javascript-typescript@claude-code-workflows
/plugin install backend-development@claude-code-workflows
```

Subagents available: `nitrostack-expert`, `widget-builder`, `risk-rules`, `demo-warden`.

**M1 also owns the 5M NitroCloud token budget.** Do not have three people running Compose in parallel — you will burn the budget by hour 8. All Studio AI Chat and Compose use goes through M1 unless agreed otherwise.

---

### M4 Mac — OpenCode + Hermes

```bash
# OpenCode (primary driver for widget work)
npm install -g opencode-ai
opencode --version
opencode auth login              # connect your provider

# Hermes Agent (secondary — research, debugging, second opinion)
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes setup
```

Both read `AGENTS.md`, not `CLAUDE.md`. See section 6.

In the repo, run `opencode` then `/init` once — it reads the codebase and grounds itself. Then work from `src/widgets/` only.

**Do not run `/init` on a dirty tree** — commit or stash first.

---

### LOQ (Windows) — fastest path

You have nothing installed and the least time. Take the two-minute option:

```powershell
# Node 20 via winget if needed
winget install OpenJS.NodeJS.LTS

# OpenCode — cross-platform, single npm install, no WSL needed
npm install -g opencode-ai
opencode --version
opencode auth login
```

If you have a Claude Pro/Max subscription, Claude Code on Windows is the stronger option — but do not spend more than 20 minutes on setup. **Your first deliverable (the risk engine) is pure functions with unit tests and needs no agent at all.** Start writing it while the install runs.

Also install VS Code if it isn't there.

---

## 6. One constitution, two filenames

Claude Code reads `CLAUDE.md`. Hermes, OpenCode, and Codex read `AGENTS.md`.

Keep `CLAUDE.md` as the real document. Create `AGENTS.md` alongside it:

```markdown
# AGENTS.md

This project's constitution lives in **CLAUDE.md**. Read it in full before
making any change. It defines scope, hard rules, ownership zones, and the
approval gates. Everything in it applies to every agent, not just Claude Code.
```

Don't symlink — Windows symlinks need developer mode enabled and it will waste someone's morning. Two files, one of which is a pointer.

---

## 7. Work sequence by machine

### M1 — MCP server core
1. `src/types/contracts.ts` → push to `main` immediately (unblocks everyone)
2. `app.module.ts`, DI wiring, boot
3. Six tools with Zod schemas + `examples.response`
4. `JWTGuard`, `ControllerGuard`
5. `approval.service.ts` — token mint/verify. **No bypass path.**
6. `audit.service.ts` — hash chain
7. `AuditInterceptor`
8. Integration, deploy, `main` merges

### M4 — Widgets (in priority order)
1. `approval-card` — the demo centrepiece, build it first
2. `risk-breakdown`
3. `invoice-queue`
4. `receipt`
5. `audit-timeline` *(first on the cut list — do it last)*

Inline styles only. Tailwind does not work inside the widget iframe.

### LOQ — Risk engine + docs
1. Eight rules as pure functions against the frozen contract
2. Unit test per rule, including the boundary case
3. `ledger.fixtures.ts` — deterministic seed with the planted duplicate, structuring set, deny-listed vendor, and injection payload
4. README: live URL on line one, architecture, env vars, install steps
5. Architecture diagram
6. Demo video (3 min max) — start scripting at hour 18

---

## 8. Hourly checkpoints

| Hour | Gate |
|---|---|
| H+1 | Contracts pushed. Untouched template **deployed and Live**. All three machines building. |
| H+4 | M1: tools registering. M4: approval-card rendering with mock data. LOQ: 4 rules + tests. |
| H+8 | First real integration — server + widgets + risk engine on `main`, deployed. |
| H+12 | Full happy path working end-to-end on the **deployed URL**. |
| H+15 | Injection demo working. |
| **H+17** | 🔒 **FEATURE FREEZE.** Bugs only. |
| H+19 | Final deploy verified. Video recorded. |
| H+21 | README, submission to Sample Apps repo, Cloud Dashboard submission. |

---

## 9. Things that will go wrong

| Symptom | Cause | Fix |
|---|---|---|
| Commits show grey avatar, no link | Email not verified on GitHub | Fix `git config user.email`, verify on GitHub |
| Widget renders blank | Missing `examples.response` on the tool | Add it — it's not a React bug |
| Merge conflict in `src/` | Someone edited outside their zone | Section 3 exists for this reason |
| `main` broken, deploy failing | Merged without building | M1: always `npm run build` before merging |
| Import errors after pull | Missing `.js` extension | Every relative import needs `.js` |
| Types out of sync | Schema changed, types not regenerated | `nitrostack-cli generate types` |
| NitroCloud "pending deployment" 400 | Previous deploy never confirmed | Cancel the pending one, then redeploy |
| Tokens burned by hour 8 | Three people running Compose | M1 owns the budget — section 5 |
