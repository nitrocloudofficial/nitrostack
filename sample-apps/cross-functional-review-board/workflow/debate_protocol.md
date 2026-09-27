# Debate Protocol (State Machine)

Every concern raised by an agent goes through this exact lifecycle. No agent — including the
moderator — may deviate from it. This exists specifically to prevent two real LLM failure modes:
**infinite cyclic argument** and **hallucinated agreement just to end the conversation.**

## States


A concern's `status` field (added to the schema) is always one of:

```
open → challenged → resolved | escalated
```

- **open**: raised, no response yet.
- **challenged**: the concern owner's counterpart has responded at least once.
- **resolved**: the concern owner (not the challenger) has explicitly marked it resolved.
- **escalated**: max rounds reached without resolution → goes to the moderator, no further
  agent-to-agent exchange.

## Hard rules

1. **Maximum 2 rounds per concern.** Round 1 = initial response. Round 2 = the concern owner's
   reply to that response. After round 2, if not resolved, status becomes `escalated`
   automatically — this is not optional and no agent decides to "keep discussing."

2. **Only the concern owner can set status to `resolved`.** If Security raised `sec-1`, only
   Security can close it. Product proposing a mitigation does not resolve the concern — Security
   evaluating that mitigation and agreeing does.

3. **A verdict or status change requires citing what specifically changed.** An agent may not
   move from `blocked` to `flagged`, or close a concern, without pointing to a specific new fact
   introduced in the exchange (e.g. "Product committed to category-level data instead of
   itemized SKUs"). Agreement without a cited reason is invalid output — treat it as a
   hallucination and do not produce it. **This same citation requirement applies to any
   agent-specific extension field revision** — e.g. Engineering updating `effort_assessment`
   requires a populated `revision_reason`, exactly as strictly as a verdict change requires a
   cited fact. A revision with `revision_reason: null` is invalid output, same class of error as
   an uncited status change.

4. **Domain-owner veto.** Security and Legal concerns can only be resolved by Security and Legal
   respectively, regardless of how compelling another agent's counterargument sounds. This
   mirrors how real review boards work — Engineering doesn't get to decide a security risk is
   acceptable; Security does, on the record.

5. **No new concerns during a challenge round.** A response to `sec-1` must be about `sec-1`.
   If Engineering thinks Security's rebuttal reveals a separate issue, that becomes a new
   concern with its own `id` and its own lifecycle — it does not extend or hijack the current
   exchange.

## Missing-information concerns follow a DIFFERENT resolution path

The domain-owner veto rule (Rule 4 above) exists for **risk judgments** — deciding whether a
mitigation is *sufficient*. It does not apply to **plain facts**, and treating a fact like a risk
judgment creates a real deadlock: if Security must "evaluate" Product simply stating the target
region the way it evaluates whether HTTPS is an adequate control, the concern can stay open
forever even when the actual gap has been closed.

So: split by what the concern actually is.

### Case A — Proposal gap (category: `missing_information`, no `requested_context` set)
The fact isn't in the proposal yet. Resolution:

1. Any agent may supply the fact in a challenge-round response, using `stance: "provides_fact"`
   (see `schema.md` → Challenge Round Output).
2. The moment a fact is supplied, the raising agent's NEXT action must be one of exactly two
   things — there is no third option, and "still open, unconvinced" is not valid here because
   there is nothing left to be unconvinced about:
   - **Accept and resolve**: the fact closes the gap, nothing further to assess → `status: resolved`,
     citing the fact received.
   - **Accept and re-raise**: the fact closes the gap AND reveals a real risk → resolve the
     `missing_information` concern (the question was answered) and raise a brand-new concern in
     the appropriate category citing the new fact. Example: Security asked for target region;
     Product says "North America, but we're including a beta cohort in Ireland" → `sec-3`
     (missing_information) resolves, and a new `sec-4` (category: `compliance`, tags: `["gdpr"]`)
     opens for the Ireland detail specifically.
3. What the raising agent may NOT do: leave a proposal-gap concern `open`/`escalated` after a
   fact has been supplied. A supplied fact is not something to reject — only something to accept
   and then assess for follow-on risk. Refusing to acknowledge a stated fact is treated the same
   as inventing a finding: invalid output.

### Case B — Retrieval gap (category: `missing_information`, `requested_context` is set)
The proposal may well contain enough information, but the agent's own retrieved knowledge base
didn't cover the relevant policy area (see `security_baseline.md` → Retrieval v2 for the concrete
example: "storing login credentials in Redis" not matching a keyword list). This is a system
problem, not a debate:

1. The agent does not wait for another agent to respond — this isn't addressed to Product or
   Engineering, it's addressed to the retrieval system.
2. The backend detects `requested_context` is non-null, runs a supplemental retrieval pass using
   that topic string, and re-invokes the same agent with the newly retrieved section(s) added to
   `knowledge_base`.
3. The agent then re-evaluates with the new information and either raises a substantive concern
   in the correct category or resolves cleanly. This never touches the round counter — it's not
   a challenge round, so it doesn't count against the 2-round limit.

### Why this split matters
Without it, every vague proposal risks becoming permanently `blocked` the moment any agent asks
a clarifying question, because the moderator treats any escalated Security/Legal concern as a
hard stop (`moderator_agent.md` → Decision Policy, Rule 1). A concern that only exists because a
fact hadn't been stated yet should never reach escalation once that fact is on the table — only
concerns representing genuine, evaluated risk disagreement should.

## Execution order (Round 0 → Challenge Rounds → Estimate Reconciliation → Moderator)

The board runs in a fixed sequence. Getting this order wrong is what causes stale-data bugs like
the one Estimate Reconciliation exists to prevent (see below), so it's stated explicitly here
rather than left implicit:

1. **Round 0 (parallel)**: Product, Engineering, Security, and Legal all run simultaneously
   against the raw proposal. No agent sees another agent's output yet. Product's
   `opportunity_cost_estimate.effort` and Engineering's `effort_assessment.size` are both
   populated independently at this stage — Product's is explicitly `effort_source:
   "provisional"` because it doesn't have Engineering's number yet.
2. **Challenge rounds (per concern, up to 2 rounds each)**: concerns are exchanged and resolved or
   escalated per the state machine above. Multiple concerns' challenge rounds may run in parallel
   with each other, but each individual concern's rounds are sequential (Round 1 response, then
   Round 2 reply). If a challenge-round exchange changes Engineering's actual sizing of the work
   (most commonly: Product agrees to reduce scope in response to one of Engineering's concerns),
   Engineering re-emits `effort_assessment` with `source: "revised_post_challenge"` and a
   `revision_reason` at that point — see `engineering_agent.md` → Staleness and re-emission. This
   does not consume a challenge round; it's an update to Engineering's own bookkeeping field, not
   a new exchange.
3. **Estimate Reconciliation pass (single pass, runs AFTER all challenge rounds have reached
   `resolved` or `escalated`)**: this is the step that fixes what would otherwise be a real bug.
   If reconciliation ran immediately after Round 0 — before challenge rounds finish — it would
   read Engineering's Round 0 `effort_assessment`, and any later revision from a challenge round
   would never reach Product. Running reconciliation last means it always reads Engineering's
   **most recently emitted** `effort_assessment` (`source: "revised_post_challenge"` if one
   exists, otherwise the Round 0 `source: "initial"` value) — never a value that's already been
   superseded.
   - Product is shown Engineering's final `effort_assessment.size` and may update its own
     `opportunity_cost_estimate.effort` to match, setting
     `effort_source: "reconciled_with_engineering"`. The exact mapping is
     `opportunity_cost_estimate.effort ← effort_assessment.size` — same field names, direct
     assignment, no reinterpretation.
   - This is not a challenge round and doesn't require Engineering's agreement — Product is
     updating its own number with better information, not disputing Engineering's.
   - If this reconciliation changes Product's `effort` enough to newly trigger the opportunity-
     cost bottleneck rule (`product_agent.md` → "Only raise a formal opportunity_cost concern
     when..."), Product raises that concern at this point, not before — it couldn't have raised
     it earlier because the underlying number didn't exist yet.
4. **Moderator**: runs only after Estimate Reconciliation completes, consuming final agent
   outputs, all challenge-round exchanges, and the reconciled estimates — never an intermediate
   state.

## Round example (matches the scenario you gave)

| Round | Agent | Action | Resulting status |
|---|---|---|---|
| 0 | Security | Raises `sec-1`: Confidential-tier data, no vendor DPA | `open` |
| 1 | Product | Responds: "we need this for launch, will use HTTPS" | `challenged` |
| 2 | Security | Responds: "HTTPS is transport security, doesn't address DPA/classification risk — rejecting the mitigation as insufficient" | `escalated` (round 2 reached, not resolved, domain owner did not close it) |

`sec-1` now goes to the moderator as an **unresolved risk**, not as a coin-flip between two
verdicts. The moderator does not re-litigate it — it applies the Decision Policy (see
`moderator_agent.md`), which treats unresolved Security/Legal concerns as blocking by default.

## Estimate Reconciliation example (staleness fix in practice)

| Stage | Agent | Action |
|---|---|---|
| Round 0 | Engineering | `effort_assessment`: `size: "large"`, `basis: "novel_integration"`, `source: "initial"` — sizes the loyalty-sync build as large due to needing a new auth layer for PartnerCo. |
| Round 0 | Product | `opportunity_cost_estimate.effort: "medium"`, `effort_source: "provisional"` — hasn't seen Engineering's number yet. |
| Challenge round | Product → `eng-1` | Responds to Engineering's feasibility concern: "Agreed — we'll scope Round 1 to an internally-proxied, read-only sync with no direct external auth, deferring the full PartnerCo integration to a follow-up." `stance: "partially_agree"`. |
| Challenge round | Engineering | Accepts the scope change, resolves `eng-1` citing the specific new fact (de-scoped to internal proxy), and **re-emits** `effort_assessment`: `size: "medium"`, `source: "revised_post_challenge"`, `revision_reason: "Scope reduced to internally-proxied read-only sync in eng-1 round 1 — removes the external auth build that drove the original 'large' sizing."` |
| Estimate Reconciliation | Product | Reads Engineering's **latest** `effort_assessment` (`medium`, revised — not the stale `large` from Round 0), sets `opportunity_cost_estimate.effort: "medium"`, `effort_source: "reconciled_with_engineering"`. Numbers now agree with what's actually being built. |

Without the re-emission step and the "reconciliation runs last" ordering, Product's reconciled
number would have locked in against Engineering's superseded `large` estimate, and the two agents'
numbers would silently disagree with the actual, already-agreed-upon scope.

**Note on multiple concurrent sizing-relevant concerns**: the example above has a single concern
(`eng-1`) driving the resize, so re-emission happens as soon as it resolves. If Engineering had
raised a second concern also bearing on effort (e.g. a `dependency_risk` concern about a
third-party rate limit that would also change the build shape), it does not re-emit
`effort_assessment` when the first of the two resolves — it waits until every sizing-relevant
concern reaches `resolved` or `escalated`, then emits one consolidated revision citing all of
them. See `engineering_agent.md` → Staleness and re-emission for the full rule; the single-concern
case here is the simple version of it.

## Why 2 rounds, not "debate until resolved"

Unbounded rounds are exactly what causes cyclic arguments or fake consensus — the model has no
signal for when to stop, so it either loops or caves. Two rounds mirrors how real review
processes actually work: raise it, one chance to address it, one chance to evaluate that
response. If it's not resolved by then, it's a real disagreement that belongs in front of a
decision-maker (the moderator), not something to keep negotiating in the review layer.