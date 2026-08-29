# Engineering Baseline (Knowledge Base)

Reference document the Engineering agent cites. Mirrors how a real staff/principal engineer gates
a proposal at design-review time — feasibility, architecture risk, testing/rollback readiness,
scalability, and technical debt — not a vague "can we build this?" pass.

## Retrieval contract (same pattern as security_baseline.md / product_baseline.md — see those
files for full rationale)

**Core sections** (always included, no matching needed): `eng-baseline-1` (Feasibility & Effort
Sizing) and `eng-baseline-7` (Hard Rejection Criteria) — the latter is non-negotiable and must
never depend on retrieval matching, since it functions as a mandatory gate check, same as
`prod-baseline-8`.

**Semantically classified** (via the same cheap pre-call as Security/Product, not static
keywords):

| section_id | heading | one-line description (for the classifier) |
|---|---|---|
| `eng-baseline-2` | Architecture Risk | Applies whenever the proposal introduces a new service, a new dependency, or changes a shared/coupled system. |
| `eng-baseline-3` | Testing & Rollback Readiness | Applies whenever the proposal touches a production surface, especially anything user-facing or data-mutating. |
| `eng-baseline-4` | Scalability | Applies whenever the proposal states or implies a user count, request volume, or data volume — or when it doesn't state one at all. |
| `eng-baseline-5` | Technical Debt | Applies whenever the proposal is a workaround, a shortcut on an existing system, or explicitly time-boxed. |
| `eng-baseline-6` | Dependency Risk | Applies whenever the proposal mentions another team's system, an unlaunched internal service, or a third-party API. |
| `eng-baseline-8` | Proportionality | Applies whenever the proposal is a small, low-blast-radius change (config flag, copy change, internal script). |

**Agent-triggered supplemental retrieval**: if the Engineering agent identifies it needs baseline
guidance on something not retrieved (e.g. a proposal touching an ML training pipeline with no
data-infra-specific section in this baseline), it sets `requested_context` rather than guessing —
same mechanism as Security and Product, see `schema.md` and `debate_protocol.md` → Case B.

**Heading-anchor convention (for Person 1's splitter)**: every `## ` heading below is written as
`## [section_id] N. Title`, e.g. `## [eng-baseline-3] 3. Testing & Rollback Readiness`. Split on
the bracketed `section_id`, not on the numeral or the title text — numerals and titles are for
human readability and are not a stable parse target if a section is ever renumbered or retitled.
This is the same convention `security_baseline.md` and `product_baseline.md` should also use;
retrofit their headings to match if they aren't already in this form.

## [eng-baseline-1] 1. Feasibility & Effort Sizing

Every proposal gets an honest, provisional-free effort read from Engineering — this is the one
number the rest of the board (specifically Product's reconciliation pass) treats as authoritative,
so it must not be softened to match the proposal's stated timeline.

Two failure modes to actively resist:

- **Anchoring on the proposal's stated timeline.** A proposal that says "2 weeks" creates a pull
  to size around that number instead of the actual work. Size the work first, compare to the
  stated timeline second — never the other way around.
- **Underestimating integration cost.** The novel or unfamiliar 20% of a build (auth with an
  unfamiliar vendor, a new data model touching an existing shared table, a first-time integration
  with a partner API) routinely costs more than the familiar 80%. Size to the *unfamiliar* part,
  not the average.

Effort must reference the **Canonical Effort Sizing Scale** defined in `schema.md` — small /
medium / large / massive, each mapped to a concrete week range. Do not invent a parallel informal
scale ("this is pretty big") that isn't one of these four values.

## [eng-baseline-2] 2. Architecture Risk

For any proposal introducing a new service, new dependency, or a change to a shared/coupled
system, assess:

- **Coupling** — does this create a new hard dependency between systems that were previously
  independent? Does a failure in one now cascade into the other?
- **Single points of failure** — does this introduce a new component with no redundancy that a
  broader system now depends on?
- **Reversibility** — if this design is wrong, how expensive is it to unwind later versus getting
  it right now? A cheap-to-reverse architecture decision deserves less scrutiny than an expensive
  one, even at the same effort size.
- **Blast radius** — if this component fails, what else does it take down with it?

A proposal that's architecturally sound but expensive is a different finding from one that's
architecturally risky but cheap — don't conflate effort size with architecture risk; they're
independent axes.

## [eng-baseline-3] 3. Testing & Rollback Readiness

For any proposal touching a production surface:

- **Rollback plan** — can this change be reverted quickly if something breaks post-launch, or is
  it a one-way door (e.g. an irreversible data migration, a change to a public API contract)?
- **Testing coverage** — does the proposal's scope include a testing plan proportional to its
  blast radius, or does "we'll test it" stand in for an actual plan?
- **Feature-flag / staged rollout feasibility** — can this be gated behind a flag or released to a
  small cohort first, or does the nature of the change force an all-or-nothing launch?

A proposal with no stated rollback plan for a one-way-door change is a real finding, not a
formality — this is the engineering-side mirror of Product's scope-discipline check.

## [eng-baseline-4] 4. Scalability

- Does the proposal state an expected scale (users, requests/sec, data volume), and if so, does
  the proposed design plausibly hold at that scale?
- If no scale is stated, that's a gap — do not assume "probably fine" or "probably not fine."
  Raise it as `missing_information`, same as Security does for unstated regions.
- Watch specifically for designs that work correctly at demo scale but have an obvious cliff
  (e.g. an unindexed query, a synchronous call in a hot path, an in-memory store with no eviction
  policy) — these are genuine findings even when "it technically works right now."

## [eng-baseline-5] 5. Technical Debt

- Is this proposal a deliberate, time-boxed shortcut with a stated payoff-later plan, or is it a
  shortcut being presented as the permanent solution?
- Debt that's acknowledged and scheduled for repayment is a normal, often correct engineering
  tradeoff — flag it as informational, not as a blocking finding, when it's explicit and bounded.
- Debt that's unacknowledged (the proposal doesn't mention it's cutting a corner at all) is the
  real finding — the risk isn't the shortcut, it's the shortcut nobody signed off on.

## [eng-baseline-6] 6. Dependency Risk

- Does this proposal depend on another team's system, an unlaunched internal service, or a
  third-party API whose availability/rate limits/pricing aren't confirmed?
- An undocumented dependency on something outside Engineering's own control is a real launch-date
  risk — flag explicitly rather than assuming it resolves itself, same standard as
  `prod-baseline-6`.

## [eng-baseline-7] 7. Hard Rejection Criteria (when Engineering must block, not soften)

Engineering review has a real bias risk of its own, distinct from Product's optimism bias:
Engineering tends to **rubber-stamp a proposal's stated timeline and stated approach** because
it's easier to accept the framing already on the page than to independently re-derive it. That
instinct is wrong for this role. **A stated timeline or a stated architecture earns Engineering's
agreement — it isn't assumed correct because it was already written down.**

**This section deliberately does not restate the three specific trigger conditions.** The exact,
enforceable triggers live in exactly one place — `engineering_agent.md` → Hard Rejection Policy —
and nowhere else. Two independently-maintained copies of the same trigger list is exactly how they
drift out of sync (e.g. one copy saying "no rollback plan for a one-way door" while the other says
"critical tech debt compounds EOL infrastructure" — different conditions entirely), and an agent
citing a `blocked` verdict draws on both this baseline and the prompt simultaneously, so any
mismatch produces contradictory or hybrid reasoning that won't match either source cleanly. If
this section and `engineering_agent.md` ever appear to disagree about what the triggers are,
`engineering_agent.md` is correct and this file needs to be fixed — never the reverse. This is the
same single-source-of-truth rule `schema.md` states for itself: exactly one canonical definition,
referenced everywhere else, restated nowhere else.

## [eng-baseline-8] 8. Proportionality (when NOT to raise a finding)

Small, low-blast-radius changes (a config flag, a copy change, an internal one-off script with no
production data path) don't need the full architecture/testing/scalability treatment — treat
these the same way Security and Product treat internal-only tools and small experiments:
proportional review, not the full checklist by default.