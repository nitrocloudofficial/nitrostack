# FORAY — DEMO SCRIPT

Four minutes. **The demo is the pitch.** Rehearse this exact order six
times.

Timings below are **measured**, not estimated — from
`python demo/runthrough.py` on the demo machine.

---

## PRE-FLIGHT — do this in this exact order

> ⚠️ **Order matters.** `npm run verify` writes DENIED rows to the access
> log. If you run it *after* `reset.sh`, beat 6 starts with rows already on
> screen and the mic drop lands flat. The run-through caught this.

```bash
# 1 — verify FIRST (it dirties the log)
npm run verify                    # warden 5/5 + MCP round trip 5/5

# 2 — then reset (clears the log, re-seeds, caches Compass)
bash demo/reset.sh                # 23 -> 4 | root cause C03 | log empty

# 3 — then the processes
uvicorn api.main:app --port 8000
npm --prefix ui run dev           # open http://localhost:5173  (NOT 127.0.0.1)

# 4 — prove all six beats still work end to end
python demo/runthrough.py         # ALL SIX BEATS PASS, IN ORDER
```

If step 4 does not say **ALL SIX BEATS PASS**, do not go on stage until it
does.

---

## ROLES

| | Who | Owns |
|---|---|---|
| **DRIVER** | P2 (demo laptop) | Clicks. Says nothing except the beat lines. |
| **NARRATOR** | P3 (pitch owner) | Every word below. Never touches the laptop. |
| **BACKUP** | P1 | Watches the clock. Holds the fallback video. Answers Q&A on data. |

---

## 0:00–0:20 · OPENING — *narrator, no screen*

> "Two thousand years ago Indian education worked like this: a handful of
> students, one teacher, continuous dialogue, no exams — the teacher simply
> knew what each student understood. Industrial-scale education destroyed
> that for exactly one reason: one teacher cannot know a hundred and eighty
> students.
>
> We did not build a tutor. We rebuilt the Foray, at scale."

## 0:20–0:45 · PROBLEM — *slide 1*

Read the faculty quote you collected. Then:

> "A mark tells you a student failed. It does not tell you what wrong idea
> they hold — which is the only thing you could fix."

Show two or three **real** student reflections from `data/real_reflections/`.

## 0:45–1:00 · THE METRIC — *slide 2, nothing else on it*

> ## 6 weeks → 24 hours

---

# THE DEMO — 1:00 to 3:00

## BEAT 1 · live capture — *Student view* — **~2.5s**

**Driver:** pull a volunteer. Ask them to explain in one sentence how a
server tells two people apart when both are on the same port. Type their
exact words. Concept `C11`. Submit.

**Narrator, while it runs:**
> "Ninety seconds, their own words, any language."

**When the panel appears:**
> "Not 'incorrect'. **Named** — M12, a specific wrong idea from a fixed
> taxonomy. And that quote underneath is *their* sentence, not our
> paraphrase. The correction is cited to page 222 of their own textbook. If
> it cannot cite, it does not send."

⏱ Expect a ~2–3 second pause. That is a live model call. Do not fill it
with apology; say the "ninety seconds" line into it.

## BEAT 2 · forced failure — *same screen* — **instant**

**Driver:** submit something outside the unit. *"today we learned about
baking sourdough."*

**Narrator, on the red panel:**
> "It structurally cannot assert something it cannot cite. No page, no
> correction — it becomes an open question for the faculty member instead.
> **That is a gate, not a guideline.**"

## BEAT 3 · faculty view — *switch role to Faculty* — **instant**

**Driver:** click the red week-6 / C11 cell.

**Narrator:**
> "Week six. Twenty-three of sixty students, one named misconception.
>
> And the root cause is not this week's topic. It traces back through the
> prerequisite graph to **addressing and ports — from an earlier unit**.
>
> Twenty-three students. Not because the handshake is hard — because they
> never learned that a connection is a four-tuple."

## BEAT 4 · intervention → verification — *same panel* — **~2s then instant**

**Driver:** *Design 10-minute intervention* → read one line of it aloud →
*Delivered, verify at week 7*.

**Narrator, as the number lands:**
> ## "Twenty-three to four."
>
> "That is the first time a teacher has ever seen proof that their
> explanation worked."

**Then pause. Let it sit.** This is the line they remember.

If asked "did the AI decide that?":
> "No. That number is counted, not generated — same misconception ID before
> and after. No language model is anywhere near it. If our API key died
> right now, that number would be identical."

## BEAT 5 · compass — *switch role to Student* — **instant (cached)**

**Narrator:**
> "Three gaps. Each one cites the reflection that proved it — their own
> sentence, with the ID.
>
> Every other roadmap tool asks what you want to do. This one knows what
> you actually understand. And if there is no evidence, there is no item —
> we would rather show you nothing than something we made up."

## BEAT 6 · THE MIC DROP — *Faculty view, access log panel* — **instant**

**Driver:** as faculty, attempt to read a student's raw reflection.

**Narrator, as the DENIED row appears:**
> "I am the faculty member. I want to read what this student wrote.
>
> Blocked. At the MCP layer, not in a policy document. And there is the log
> row — the rule that fired, and the requirement it enforces.
>
> **We built it so that even we cannot do that. That is why students tell
> it the truth.**"

---

## 3:00–3:30 · ARCHITECTURE — *slide 3, the permissions matrix*

> "The agents are separate because their **permissions** are separate. A
> single agent holding all of this is a privacy failure nobody would
> consent to use — and without consent we get no honest input, so the
> product does not work.
>
> And we only used an agent where judgement was required. Clustering, the
> k-anonymity gate, the mastery update and the efficacy count are
> deterministic code. We do not put a language model in a numeric path."

## 3:30–4:00 · CLOSE — *slide 4*

Three numbers, then the ask:

1. Faculty hours currently lost to finding out late — *your interview number*
2. Institutions now under continuous-evidence accreditation
3. "We ran it on N real student reflections and found M named misconceptions
   in a single unit"

> "We would like to run Loops 1 and 2 on one real course next semester with
> our department. If anyone here wants it pointed at their class, we will
> set it up this week."

---

## IF SOMETHING BREAKS

| Symptom | Say this, then | |
|---|---|---|
| Beat 1 hangs >10s | *"That is a live model call — everything else you'll see is local."* | Wait. It falls back automatically. |
| Beat 1 says `[offline]` | Nothing. It still names the misconception. | **Do not claim the model did it.** |
| Any tool errors | *"The Python service is the brain; that's a connection, not the logic."* | Restart uvicorn. |
| Wifi dies entirely | *"Beats 3, 4 and 6 are deterministic — watch."* | Beats 3/4/5/6 all still work. |
| Total failure | — | **Play the fallback video.** |

**Beats 3, 4, 5 and 6 require no network at all.** Only beats 1 and 2 make
live calls. If the room's wifi dies you lose two beats, not the demo — say
so out loud, it reads as confidence.

---

## WORDS

**Use:** named · grounded · verified · evidence · cohort · prerequisite ·
cleared

**Never:** monitor · track · detect · surveillance · revolutionary ·
disrupt · seamless · empower. Do not sell "AI-powered" — in this room it is
table stakes.

**Never overclaim.** If asked what is seeded:
> "Loops 1, 2 and 3 are live in front of you. The cohort runs on seeded
> longitudinal data — we cannot fake eight weeks and we will not pretend to."
