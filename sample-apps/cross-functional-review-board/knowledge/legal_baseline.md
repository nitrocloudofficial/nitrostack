# Legal Baseline (Knowledge Base)

Reference document the Legal agent cites. Mirrors how a real in-house counsel reviews a launch
proposal — regulatory/licensing exposure, IP and ownership, liability and indemnification, lawful
basis for data processing, contractual obligations, and jurisdiction — not a vague "does this
seem legally okay?" pass.

## Retrieval contract (same pattern as security_baseline.md / product_baseline.md /
engineering_baseline.md — see those files for full rationale)

**Core sections** (always included, no matching needed): `legal-baseline-1` (Regulatory &
Licensing Triggers) and `legal-baseline-7` (Hard Rejection Criteria) — the latter is
non-negotiable and must never depend on retrieval matching, since it functions as a mandatory
gate check, same as `prod-baseline-8` and `eng-baseline-7`.

**Semantically classified** (via the same cheap pre-call as the other agents, not static
keywords):

| section_id | heading | one-line description (for the classifier) |
|---|---|---|
| `legal-baseline-2` | IP & Ownership | Applies whenever the proposal uses third-party content/IP, generates new user content, or the ownership of an output is ambiguous. |
| `legal-baseline-3` | Liability & Indemnification | Applies whenever the proposal creates a new relationship with a partner, vendor, or user where something could go wrong and someone bears the cost. |
| `legal-baseline-4` | Data Processing Legal Basis | Applies whenever personal data is collected, shared, or processed in a new way — the legal-instrument side of what Security handles as a technical-controls question. |
| `legal-baseline-5` | Contractual Obligations & ToS | Applies whenever the proposal changes what the company promises users, partners, or itself in an existing agreement, or requires a new one. |
| `legal-baseline-6` | Jurisdiction & Governing Law | Applies whenever the proposal involves users, partners, or infrastructure in more than one legal jurisdiction. |
| `legal-baseline-8` | Proportionality | Applies whenever the proposal is internal-only, has no external party, and touches no personal data or IP. |

**Agent-triggered supplemental retrieval**: if the Legal agent identifies it needs baseline
guidance on something not retrieved (e.g. a proposal touching export-controlled technology with
no section covering that here), it sets `requested_context` rather than guessing — same mechanism
as every other agent, see `schema.md` and `debate_protocol.md` → Case B.

**Heading-anchor convention**: every `## ` heading below is written as `## [section_id] N.
Title`. Split on the bracketed `section_id`, not the numeral or title text — see
`engineering_baseline.md` → Heading-anchor convention for the full rationale. `security_baseline.md`
and `product_baseline.md` should be retrofitted to this same convention if they haven't been yet.

## [legal-baseline-1] 1. Regulatory & Licensing Triggers

Some activities require a license, registration, or regulatory filing before they can legally
launch — and a proposal that doesn't mention this isn't necessarily proposing something illegal,
it's usually just unaware the trigger exists. Flag explicitly whenever a proposal touches:

- **Financial services** — moving, holding, or facilitating transfer of money on behalf of others
  (money transmission licensing), extending credit, or anything resembling a payments product.
- **Health data at scale** — becoming a HIPAA business associate, or processing health data in a
  way that could classify the company as a covered entity.
- **Regulated content or industries** — gambling, alcohol, cannabis, firearms, or anything with
  age-verification or advertising-restriction requirements tied to it.
- **Cross-border data transfer** — moving personal data across a border that requires a specific
  legal transfer mechanism (e.g. Standard Contractual Clauses for data leaving the EU).
- **Export control** — technology, encryption, or technical data that could fall under export
  licensing requirements when made available to certain countries or entities.

A proposal that clearly triggers one of these and states no plan to address the licensing/filing
requirement is a real finding — this is the legal equivalent of Engineering's "no rollback plan
for a one-way door": the absence of a plan for something structurally required is itself the risk.

## [legal-baseline-2] 2. IP & Ownership

- **Third-party IP use** — does the proposal use content, code, trademarks, or data licensed from
  or owned by a third party? Is the license scope (what it permits) actually broad enough to cover
  the proposed use, or is this an assumption?
- **Ownership of new output** — if the proposal generates new content, code, or data (including
  AI-generated output, user-generated content, or derived/aggregated data), who owns it? Is this
  addressed in existing terms, or does it need new contractual language?
- **Trademark/branding conflicts** — does the proposal's naming, branding, or presentation risk
  confusion with an existing mark the company doesn't control?

Ambiguous ownership is a real finding even when nothing is being actively infringed today — it's
a liability that surfaces later, usually at the worst possible time (an acquisition, a partner
dispute, a user complaint).

## [legal-baseline-3] 3. Liability & Indemnification

- **Who bears the cost if this goes wrong?** For any new relationship with a partner, vendor, or
  user, is liability capped, uncapped, or unaddressed? An uncapped liability exposure with no
  insurance or indemnification story is a materially different risk than a capped one, even if the
  probability of something going wrong is identical.
- **Indemnification symmetry** — if the company indemnifies a partner, does the partner
  reciprocally indemnify the company for its own failures, or is the exposure one-directional?
- **Insurance coverage gaps** — does this activity fall inside or outside existing insurance
  coverage (e.g. cyber liability, E&O)? A proposal that creates a new risk category not covered by
  existing policies is a real finding, not a formality.

## [legal-baseline-4] 4. Data Processing Legal Basis

This is the legal-instrument counterpart to Security's technical compliance check (`compliance`
category in `security_baseline.md`) — Security asks "are the technical controls adequate,"
Legal asks "do we have a legal right to process this data at all, and is it documented."

- **Lawful basis** — under frameworks like GDPR, is there an articulated lawful basis (consent,
  legitimate interest, contract necessity) for the specific processing described? "We'll add a
  checkbox" is not automatically a valid consent mechanism — consent has specificity and
  withdrawal requirements that a checkbox alone doesn't satisfy.
- **Data Processing Agreement (DPA)** — if data is shared with or processed by a third party, is a
  DPA required, and does the proposal account for negotiating and executing one before data
  starts flowing? (This is the same trigger Security's `vendor_risk` concerns often surface from
  the technical side — Legal and Security should reach the same conclusion about DPA necessity
  from different angles; if they don't, that's worth surfacing to the moderator as a genuine
  cross-agent inconsistency rather than silently picking one.)
- **Data subject rights** — does the proposal's data flow accommodate deletion, access, and
  portability requests, or does it create a new store that existing rights-fulfillment processes
  don't reach?

## [legal-baseline-5] 5. Contractual Obligations & ToS

- **Existing agreement conflicts** — does this proposal require the company to do something its
  current Terms of Service, Privacy Policy, or existing partner/customer contracts don't currently
  permit? Silently shipping a feature that contradicts a stated privacy commitment is a real legal
  and reputational exposure, not just a documentation gap.
- **New agreements required** — does this proposal require a new ToS clause, a new partner
  agreement, or an amendment to an existing one before it can launch as scoped?
- **Timeline realism** — contract negotiation and legal review of new agreements routinely take
  longer than engineering estimates account for; if the proposal's timeline doesn't leave room for
  this, that's worth flagging even before assessing the substance of what the contract needs to
  say.

## [legal-baseline-6] 6. Jurisdiction & Governing Law

- **Multi-jurisdiction exposure** — does the proposal involve users, partners, or infrastructure
  spanning more than one legal jurisdiction? Different jurisdictions can have conflicting
  requirements (e.g. a data-localization law in one region vs. a cross-border-transfer mechanism
  assumed elsewhere).
- **Governing law / dispute resolution** — for any new partner relationship, is governing law and
  dispute-resolution mechanism specified, or left undefined? Undefined governing law is a real gap
  in a partner agreement, not boilerplate that "someone will add later."

## [legal-baseline-7] 7. Hard Rejection Criteria (when Legal must block, not soften)

This section deliberately does not restate the specific trigger conditions. The exact,
enforceable triggers live in exactly one place — `legal_agent.md` → Hard Rejection Policy — and
nowhere else, for the same reason `engineering_baseline.md` gives for its own Hard Rejection
Criteria section: two independently-maintained copies of the same trigger list is how they drift
out of sync, and an agent citing a `blocked` verdict draws on both this baseline and the prompt
simultaneously. If this section and `legal_agent.md` ever appear to disagree about what the
triggers are, `legal_agent.md` is correct and this file needs to be fixed — never the reverse.

## [legal-baseline-8] 8. Proportionality (when NOT to raise a finding)

Internal-only proposals with no external party, no third-party IP, and no personal-data component
don't need the full contractual/jurisdiction/licensing treatment — treat these the same way every
other agent treats internal tools and small experiments: proportional review, not the full
checklist by default.