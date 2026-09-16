# MENTOR — you didn't just write the bug. You designed it.

> **Track:** Education & Research · an MCP app built on the official NitroStack TypeScript SDK
>
> Copilot finishes your code. This one makes you finish it — it shows you the exact moment
> your build stopped matching the architecture you designed, and then it stops.

**This repository is the deployable half of a larger submission.** It is the NitroStack MCP
app, and it is what runs on NitroCloud. The full project — the design canvas the student
draws in, the demo fixtures, the concept doc and the gap list — lives at
**[nitrostacklh/command-global](https://github.com/nitrostacklh/command-global)**, and this
folder is mirrored out of it so NitroCloud sees a plain NitroStack project at a repo root.

> ⚠️ **Do not commit here.** This is a **one-way mirror** of `sentinel/` in the monorepo,
> pushed with `git subtree`. Anything committed directly to this repo is clobbered by the
> next mirror push. Send changes to
> [command-global](https://github.com/nitrostacklh/command-global) instead.

---

## What it does

A student picks a real project and **a role on it**, gets the slice they would actually own
in a company, designs that slice, builds it against checkpoints derived from their own
design — and when it breaks MENTOR names the decision that broke it, **then refuses to write
the fix.**

Six stages, each handing the next a versioned plain-JSON artifact. That is the whole
architecture: no shared types, no RPC, no database.

```
①  browse_catalog    pick a product type, then a project    mentor.catalog/v1
②  open_brief        what you OWN vs what you're GIVEN      mentor.brief/v1
③  (design canvas)   the architecture you drew, pre-code    lumina.plan/v1
④  checkpoints       from YOUR plan · record_progress · is_it_done
                                                            mentor.build/v1
⑤  explain_drift     where the build left the plan — then it refuses to fix it
⑥  flashcard         the concept, released only once YOU made the tests pass
                                                            mentor.card/v1
```

Stage ③ runs locally and is not deployed; the two halves meet at exactly one plain-JSON file.
That decoupling is also why MENTOR demos standalone — every artifact argument is optional and
falls back to a bundled demo project.

**Two kinds of drift.** `check_scope` catches designing the *wrong set* of components —
someone else's job, or missing your own. `explain_drift` catches building *your* components
in the wrong order. Different failures, different conversations.

**Why it needs no model.** In MCP the *client* supplies the model. MENTOR's own work is an
ordering comparison, a weighted confidence formula and a refusal — there is nothing to
generate. So it runs offline: no API key, no network, no per-student cost.

---

## Run it

```bash
npm install
npm run build
npm test
```

`npm test` is **128/128 and fully offline**. Then point **NitroStudio** at this folder, or
connect any MCP client, and ask *"a student's pricing test is failing — when did they go
wrong?"* → `explain_drift` renders the **causal-timeline** widget. Then ask it to fix the
bug and watch `withhold_fix` decline. That refusal is the product, not a missing feature.

---

## The tool surface is deliberately one story

`tools/list` returns **6 tools** on this app: `open_session`, `build_event` and
`build_verdict` — watch a build against the spec MCP-1 issued and file the verdict MCP-3 makes
a card from — plus `explain_drift`, `withhold_fix` and `mentor_status`. That is MCP-2's whole
story and only MCP-2's; the other two thirds of the loop are separate deployments
(`mcp-roster` 8 tools, `mcp-profile` 9). It is a design constraint rather than an accident: in
an MCP app the tool list *is* the interface, because the client's model picks from it.

Notably persistence itself added **no** verbs. There is no `save`, and deliberately no
`query` or `execute_sql`: a generic database tool would hand the client's model arbitrary
access to every student's record, and "the model only runs safe queries" is not a security
model. `record_progress` simply gained a server side.

You will also find `src/modules/` for **SENTINEL** (DevOps), **LEDGER** (FinOps), **VERDICT**
(Legal), **RELAY** (Civic), **AEGIS** (trust) and a **COMMAND** coordinator — tests passing,
and **none of them registered** in `app.module.ts`.

That is on purpose, and it is the interesting decision in this repo. The project began as
COMMAND, a five-app "autonomous enterprise OS"; MENTOR is a deliberate pivot away from it.
Those four commanders still work. They stay unregistered because SENTINEL's `self_heal` runs
on the **same** pricing service and the **same** tax-before-discount bug as MENTOR's demo
fixture, and its description offers to patch, prove and deploy the fix. Ask a model *"the
pricing test is failing, help"* with that tool present and it picks the actionable one —
contradicting MENTOR's entire thesis, live, on our own bug.

Killing four working commanders was worth more than the code was. Full reasoning in
[`GAPS.md`](https://github.com/nitrostacklh/command-global/blob/main/GAPS.md) Gap 11 and the
comment at the top of `src/app.module.ts`.

---

## Read more, in the monorepo

| | |
|---|---|
| [`MENTOR-CONCEPT.md`](https://github.com/nitrostacklh/command-global/blob/main/MENTOR-CONCEPT.md) | **Start here** — the product, and why it survives "isn't this Copilot?" |
| [`ARCHITECTURE.md`](https://github.com/nitrostacklh/command-global/blob/main/ARCHITECTURE.md) | The one engine every commander runs on |
| [`GAPS.md`](https://github.com/nitrostacklh/command-global/blob/main/GAPS.md) | What's left — prioritized and honest |
| [`WALKTHROUGH.md`](https://github.com/nitrostacklh/command-global/blob/main/WALKTHROUGH.md) | Use it as a student, in a real MCP client |
| [`STUDY.md`](https://github.com/nitrostacklh/command-global/blob/main/STUDY.md) | The evidence protocol — designed, **not yet run** |

Built for the Amrita Vishwa Vidyapeetham × NitroStack Agentic AI Hackathon.
