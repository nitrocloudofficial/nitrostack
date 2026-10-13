# PassportIQ — NitroStack Hackathon 2026 submission pack

Everything needed to fill the submission form, deploy a live MCP, and raise the
`sample-apps/` PR. Copy-paste ready.

---

## ⚠️ Read this first: two corrections to the form

**1. The GitHub org in Step 4 is wrong.**

The form says *"Fork & clone `github.com/nitrostack-ai/nitrostack`"*. That
repository **does not exist** — the GitHub API returns `404 Not Found`.

```
GET https://api.github.com/repos/nitrostack-ai/nitrostack        -> 404
GET https://api.github.com/repos/nitrocloudofficial/nitrostack   -> 200
```

The real repo — the one linked from `docs.nitrostack.ai`, and the one with
**1,464 forks** and a populated `sample-apps/` directory containing other
hackathon entries (`Sentinel-Autonomous-SOC-Tier1-Analyst`, `ClinicaMind`,
`Ekalavya`, …) — is:

> **https://github.com/nitrocloudofficial/nitrostack**

Fork **that** one. Your PR URL will read `github.com/nitrocloudofficial/...`
even though the form's placeholder shows `nitrostack-ai/...`. That is expected;
the placeholder is stale. If the form's validator hard-rejects the URL, the
form is checking against a repo that does not exist — screenshot it and tell
the organisers.

**2. NitroCloud is not at `nitrocloud.ai`.** That domain does not resolve. The
console is **https://cloud.nitrostack.ai** and the marketing page is
`nitrostack.ai/cloud`.

---

## Step 1 of 5 — "Your big idea 💡"

### Track: keep **Enterprise AI & Workplace Automation** ✅

Do **not** switch to Open Innovation. Reasoning:

| | Enterprise AI & Workplace Automation | Open Innovation |
|---|---|---|
| Fit | Exact. The track asks for *"AI agents and automation tools that improve productivity, streamline workflows, and enhance business operations."* PassportIQ is literally an AI agent automating a 14-stage back-office workflow. | Generic. Nothing about the project is a better fit here. |
| Competition | Judged against other workflow-automation entries on the same criteria you optimised for. | The catch-all bucket — you get compared against medical imaging, climate models, and robotics on "innovativeness". |
| Judge's mental model | "Does this actually automate real work, with controls?" — you win this question. | "Is this novel?" — a government workflow reads as *unglamorous* next to flashier domains. |

Open Innovation is where projects go when they don't fit a track. Yours fits
one perfectly. **Moving would be a strict downgrade.**

> One caveat worth knowing: some judges read "Enterprise" as *private-sector*.
> PassportIQ is public-sector back-office. The description copy below closes
> that gap deliberately by using the words "back-office", "case workload",
> "operations" and "throughput" — enterprise-automation vocabulary — so nobody
> has to make the leap themselves.

### Idea title

```
PassportIQ
```

Fine as-is. If the form allows a longer title, this scores better because a
judge skimming 200 entries learns what it is without opening it:

```
PassportIQ — an agentic MCP copilot for passport verification officers
```

### Description

Your current text is `passport workflow` (17 characters). That will read as an
abandoned submission. Replace it.

**Primary version** (~200 words — use this if the field allows it):

```
PassportIQ is an AI copilot for passport verification officers, built as a
NitroStack MCP server.

Applying for a passport means a 14-stage journey: submission, fee payment, a
biometrics appointment, document verification, police verification, printing,
dispatch, delivery. Each stage is manual, queue-bound, and invisible to the
applicant. Officers meanwhile have no way to see that four "unrelated"
applications share a forged address.

PassportIQ exposes that entire lifecycle as 44 MCP tools, then puts an
autonomous agent on top. The agent moves a case through every mechanical
stage on its own — verifying documents, running the fraud pipeline, scoring
risk, building a cross-application link graph to surface fraud rings — and
then stops.

It stops because it structurally cannot continue. The lifecycle is a
declarative state machine of 13 transitions, and every transition out of
officer_review is marked autonomous: false. The AI is not trusted to be
polite about the boundary; the boundary is data. A guard on officer_decide
fails closed if the verification pipeline is incomplete.

So: full automation of the 90% that is mechanical, a hard structural stop at
the 10% that decides a citizen's identity. 44 tools, 4 resources, 3 prompts,
5 widgets, 8 health checks, 366 passing assertions.
```

**Short version** (~60 words — if the field is tight):

```
An AI copilot for passport verification officers, built as a NitroStack MCP
server. PassportIQ exposes India's 14-stage passport lifecycle as 44 MCP
tools and puts an autonomous agent on top: it verifies documents, runs a
fraud pipeline, and builds a cross-application link graph to surface fraud
rings — then structurally stops at the human officer. Every transition out
of officer_review is marked autonomous:false, so the AI cannot decide a
citizen's identity. 366 passing assertions.
```

**Why this copy works:** it names the pain in one line, states the automation
scope, then makes the safety model the *hero* rather than a footnote. Judges
scoring an agentic hackathon are actively looking for teams that thought about
where the agent must not go. "The boundary is data, not a prompt" is the
sentence that distinguishes you.

---

## Step 2 of 5 — "Pick your deployed MCP 🚀"

Blocked until a live MCP exists. See **[DEPLOY_NITROCLOUD.md](./DEPLOY_NITROCLOUD.md)**
— that is the full deploy process, including a real deploy-blocking bug in the
upstream CLI that this repo now works around.

Once deployed, return here and the app appears in the dropdown.

---

## Step 3 — (not yet seen)

Typically demo video + repo link. You already have:

- **Video script**: [`PROJECT_EXPLAINED.md` §11](./PROJECT_EXPLAINED.md) — timed 0:00–6:00 with stage directions.
- **Repo**: https://github.com/RomitDeokar/Nitrostack-Passport

---

## Step 4 of 6 — the `sample-apps/` PR

Full command-by-command walkthrough in
**[SAMPLE_APP_PR.md](./SAMPLE_APP_PR.md)**, with the ready-to-commit README at
[`sample-app-README.md`](./sample-app-README.md).

PR title must be exactly:

```
[Hackathon] <Your Team Name> – PassportIQ
```

Note the **en dash `–`**, not a hyphen. The form's example uses `–`.

---

## Fact sheet (use anywhere the form asks for specifics)

| Metric | Value |
|---|---|
| MCP tools | **44** |
| MCP resources | 4 (`passportiq://applications`, `://rulebook`, `://audit-trail`, `://agent/runs`) |
| MCP prompts | 3 (`officer-briefing`, `fraud-ring-memo`, `clarification-letter`) |
| Widgets | 5 |
| Health checks | 8 |
| Guards | 1 (`PipelineCompleteGuard`, fails closed) |
| Lifecycle stages | 14 |
| Lifecycle transitions | 13 — **9 autonomous, 4 human-gated** |
| Agent step ceiling | 16, confidence floor 0.7 |
| Tests | **366 assertions**, all passing |
| Source | 113 `.ts/.tsx` files, ~65,330 LOC |

Tool breakdown by module:

| Module | Tools |
|---|---|
| Caseflow (lifecycle) | 18 |
| Pipeline | 10 |
| Verification | 8 |
| Agent | 4 |
| Console | 4 |

**Honesty note for the demo:** the PSK appointment, police-verification and
booklet-printing stages are simulated adapters, not live government
integrations. Say this out loud in the video — judges find it themselves
otherwise, and volunteering it reads as rigour.
