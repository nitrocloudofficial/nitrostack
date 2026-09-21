# Product Baseline (Knowledge Base)

Reference document the Product agent cites. Mirrors how a real product team gates a launch
proposal — problem definition, success metrics, scope discipline, and prioritization — not a
vague "does this sound good?" pass.

## Retrieval contract (same pattern as security_baseline.md — see that file for full rationale)

**Core sections** (always included, no matching needed): `prod-baseline-1` (Problem-Solution
Fit), `prod-baseline-2` (Success Metrics Standard), and `prod-baseline-8` (Hard Rejection
Criteria) — the last one is non-negotiable and must never depend on retrieval matching, since it
functions as a mandatory gate check, not a topical reference.

**Semantically classified** (via the same cheap pre-call as Security, not static keywords):

| section_id | heading | one-line description (for the classifier) |
|---|---|---|
| `prod-baseline-3` | Scope Discipline | Applies whenever the proposal bundles multiple features or its boundaries aren't tightly defined. |
| `prod-baseline-4` | Opportunity Cost (RICE) | Applies whenever the proposal requests meaningful engineering time or competes with other roadmap items. |
| `prod-baseline-5` | Monetization & Unit Economics | Applies whenever the proposal introduces a variable per-use cost, touches pricing, or affects an existing paid tier. |
| `prod-baseline-6` | Dependency Mapping | Applies whenever the proposal mentions another team, an unlaunched feature, or an external partner. |
| `prod-baseline-7` | Proportionality | Applies whenever the proposal is a small experiment or internal-only change. |
| `prod-baseline-8` | Hard Rejection Criteria | Always included alongside core sections — see Core sections note below. |

**Agent-triggered supplemental retrieval**: if the Product agent identifies it needs baseline
guidance on something not retrieved (e.g. a proposal touching pricing strategy with no
pricing-specific section in this baseline), it sets `requested_context` rather than guessing —
same mechanism as Security, see `schema.md` and `debate_protocol.md`.

## 1. Problem-Solution Fit

A proposal must clearly state:
- **Who** the target user/segment is (not "users" generically).
- **What problem** they have today, and evidence it's real (data, user research, support
  tickets, competitor gap — something beyond "it would be nice").
- **Why now** — why this problem, this priority, this quarter.

A proposal missing any of these isn't a "bad idea" — it's under-specified, and that's a distinct
finding from "this won't work."

## 2. Success Metrics Standard

Every proposal needs at minimum:
- **One leading metric** — something observable within weeks that indicates the feature is
  working as intended (e.g. opt-in rate, activation rate).
- **One lagging metric** — the actual business outcome this is meant to drive (e.g. retention,
  revenue per user, reduced churn).

A proposal with no defined success metric can't be evaluated post-launch — that's a real launch
risk, not a nitpick, because there's no way to know if it should be kept, iterated, or killed.

## 3. Scope Discipline (MVP vs. scope creep)

- Does the proposal describe the smallest version that tests the core hypothesis, or does it
  bundle in adjacent features "while we're at it"?
- Every added surface (new UI, new data flow, new integration) has a cost in build time and
  risk elsewhere (Security, Engineering, Legal) — scope creep in a Product proposal creates
  downstream cost for every other agent on this board.
- A tightly-scoped MVP with a stated fast-follow plan is preferred over a large first release
  with unclear phasing.

## 4. Opportunity Cost — RICE-style prioritization

For any proposal requesting meaningful engineering time, assess (even roughly):
- **Reach** — how many users does this actually touch in a defined time period?
- **Impact** — how much does it move the target metric per user reached (rough scale is fine:
  minimal / low / medium / high / massive)?
- **Confidence** — how much evidence backs the reach/impact estimate vs. pure guess?
- **Effort** — provide your own rough order-of-magnitude estimate, explicitly labeled as
  provisional. Product runs in parallel with Engineering during initial review and does not have
  Engineering's actual estimate yet — see "Effort estimate handling" below for exactly how this
  works. Never present a provisional number as if it were confirmed.

A proposal with low reach, low impact, and low confidence is a real finding — "this is
plausible but unlikely to be worth the opportunity cost" — even if nothing about it is
technically wrong.

### Effort estimate handling (fixes a real ordering problem)

All four agents run their initial review in parallel — Product does not have access to
Engineering's output when it runs Round 0. So "cross-check against Engineering's estimate" can't
literally happen at that point. Correct sequence:

1. **Round 0**: Product gives its own rough effort estimate, tagged `effort_estimate_provisional`,
   with a stated confidence level. This is Product's honest best guess, not a placeholder.
2. **Reconciliation pass** (not a challenge round — see `debate_protocol.md` → Estimate
   Reconciliation): once Engineering's Round 0 output exists, the backend runs one lightweight
   pass where Product sees Engineering's actual effort estimate and may update *only* the effort
   component of its RICE assessment if there's a material gap. This is a data update, not a
   disagreement — it doesn't consume a debate round and doesn't require Engineering's sign-off.

## 5. Monetization & Unit Economics

Distinct from opportunity cost — this is about whether the business model itself holds up, not
whether the feature is worth building:

- **Unit economics**: Does this proposal introduce a direct variable cost per use (API fees,
  compute, third-party licensing, hardware)? If so, is there a revenue model or cost offset that
  covers it, even roughly? A feature that costs more per use than it earns or saves is a real
  finding regardless of how good the user experience is.
- **Pricing model**: Is pricing/monetization defined at all, or left as "TBD"? Launching without
  a pricing decision is itself a finding, not something to assume will be sorted out later.
- **Cannibalization**: Does this proposal give away, for free or at a lower tier, something
  customers currently pay more for? If so, is that traded off deliberately (e.g. as a growth
  lever) or is it an unexamined side effect of the proposal as scoped?

## 6. Dependency Mapping

- Does this proposal depend on another unlaunched feature, an external partner's timeline, or
  a system another team owns?
- Undocumented dependencies are a common cause of missed launch dates — flag them explicitly
  rather than assuming they'll resolve themselves.

## 7. Proportionality (when NOT to raise a scope/metric finding)

Small, low-risk experiments (e.g. an A/B test on button copy) don't need a full RICE breakdown,
monetization analysis, or a formal success-metrics section — treat internal tooling and small
experiments the same way Security treats internal-only tools: proportional review, not the full
checklist by default.

## 8. Hard Rejection Criteria (when Product must block, not soften)

Product review has a real bias risk: a model asked to evaluate a new proposal will tend toward
approval by default, because it's evaluating something framed as an initiative someone's excited
about. That instinct is wrong for this role. **The correct default stance is skeptical — a
proposal earns `approved`, it isn't granted it.** These specific conditions require `blocked`,
and none of them are close calls or matters of house style — see `product_agent.md` → Hard
Rejection Policy for exactly how this is enforced.