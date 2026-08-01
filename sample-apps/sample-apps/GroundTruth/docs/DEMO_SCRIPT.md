# GroundTruth — 3-Minute Demo Script

Hard limit is 3:00. This runs to about 2:50, which leaves room to breathe.

---

## Before you record

Run through this list once. Every item has burned a hackathon demo before.

- [ ] `health://checks` on the deployed instance shows **`github: up`** with a rate limit.
      If it does not, stop — the core feature will fail on camera.
- [ ] `set_employee_github` → `emp-1` points at the GitHub account you can commit as,
      **and pass `githubEmail`** set to your `git config user.email`. Without it, commits
      GitHub has not linked to your account are invisible and the cross-check finds nothing.
- [ ] `seed_demo_data` with `days: 3` has been run. Today is intentionally left empty.
- [ ] **Make one real commit** to the repo now, with a message unrelated to "login"
      — e.g. `Update README with setup notes`. This is the evidence the agent will
      catch the claim against. Do not memorise the commit count; it changes on every
      push, and the point is that none of them match the claim, not how many there are.
- [ ] Confirm today's report is *not* yet submitted (`generate_daily_digest` shows
      `submitted: 0`). You are submitting it live.
- [ ] Close Slack, email, and notifications. Full screen. Zoom the font so text is
      readable at 720p.
- [ ] Reset to a clean state: `npm run demo:prepare`
- [ ] Do one silent dry run end to end, then `npm run demo:prepare` again to clear it.
      Do not record the first attempt.

---

## The script

### 0:00–0:20 — The problem

> "Every IT company runs on end-of-day reports. Managers read ten or twenty a day
> and verify none of them. What someone *says* they did and what actually landed
> in GitHub are different things, and nobody checks — so a blocker surfaces three
> days late, in a standup, after the damage is done.
>
> GroundTruth closes that gap."

**On screen:** the manager digest from the seeded days, so there is something real
behind you rather than a title card.

---

### 0:20–0:55 — Submit a report live

**Do:** run `open_eod_form`. Fill it in as Aarav, out loud:

> "Finished the login module and wired up session handling. Still blocked on the
> staging database credentials."

Set confidence to **2**. Submit.

> Use 2, not 4. The seeded days run 3 → 2 → 2, so a 4 today reads as *improving* and
> the trend chart contradicts the story you are telling. A 2 continues the slide. It is
> also the more realistic report: someone claiming work is finished while feeling
> under water is exactly the case a manager should see.

**Say, while it saves:**

> "That is a normal, plausible EOD report. It claims finished work, and it mentions
> a blocker. Nothing about it looks suspicious."

**On screen:** the confirmation showing the extracted claims and the flagged blocker.

---

### 0:55–2:00 — The agent reasons *(this is the demo)*

**Do:** in AI Chat, run the `review_eod_submission` prompt for `emp-1`.

**Say, over the top — do not narrate every tool call, let it run:**

> "The agent is pulling Aarav's real GitHub activity for today. Not mocked — this
> is the live API, and that commit was made two minutes ago.
>
> It has the claim: *finished the login module.* And it has the evidence — and this
> is the part that matters: there are commits today, plenty of them. This person
> worked hard. But not one of them mentions login, or session, or auth. And no pull
> request was opened.
>
> Watch what it does with that — it is reasoning about whether the gap is real,
> and it also sees this staging-credentials blocker has now been there three days
> running. Then it decides, on its own, that this needs a manager today."

**Let the reasoning trace sit on screen for a beat before moving on.** This is the
single most persuasive moment in the demo. Do not talk over the end of it.

**If asked later "is that just an if-statement?"** — the answer is in the design:
every tool here is deterministic. They fetch, diff, store, and notify. None of them
decides anything. The judgement lives in the prompt, in the model.

---

### 2:00–2:35 — What the manager sees

**Do:** run `generate_daily_digest`. Then `analyze_wellbeing_trend` with **`days: 4`**.

> Use 4, not the default 7. You seeded 3 prior days plus today, so a 7-day window
> puts "3 of 7 days have no report" on every single person and buries the real signal.

**Say:**

> "The manager never asked for any of this. They open one digest, and Aarav is at
> the top with the specific reason — not a score, an explanation they can act on.
>
> And across the week: confidence sliding, four days negative, one blocker that
> has not moved.
>
> The interesting one is Karthik. He has almost no commits — he has been doing code
> review, pairing, and design. The agent looked at him and stayed quiet. A tool that
> flagged him would be worse than useless, because a manager who learns to ignore
> these alerts is worse off than one who never had them."

**On screen:** digest, then the trend sparklines.

That last point is worth 20 seconds of your 180. It is the difference between a
demo and a product.

---

### 2:35–2:50 — Close

> "This is not a hackathon toy. Every IT company already runs this process, badly,
> every single day. Per-seat pricing, obvious expansion into Jira and Slack — the
> Slack path is already built.
>
> GroundTruth. Employees write one honest paragraph a day, and the agent checks it
> against what actually happened."

---

## If something breaks mid-take

| Symptom | What to do |
|---|---|
| `crosscheck_activity` errors | Env vars are missing on the deployed instance. Stop, fix, re-record. Do not improvise around it. |
| No commits found | The commit was authored under a different git email than `emp-1`'s `githubEmail`. Fix with `set_employee_github`, passing `githubEmail`. |
| Commit count differs from what you rehearsed | Expected — it grows with every push. Never say a number out loud; say "commits today, none of them about login". |
| The agent does not alert | Legitimate — it decided the gap was innocent. Do not fight it. Say "and here it decided the gap was explainable" and move to the digest. **An agent that occasionally declines to alert is the point**, not a bug. |
| Digest looks empty | `seed_demo_data` was not run, or the container was redeployed and reset. Re-run it. |
| Widget renders blank | Reconnect the MCP server in Studio to reload widgets. |

---

## What not to do

- Do not read this script word for word. Know the four beats, then talk.
- Do not show code. Judges have the repo; the demo is for the behaviour.
- Do not explain the architecture. If the reasoning trace lands, they will ask.
- Do not apologise for scope. Say what it does, not what it does not.
