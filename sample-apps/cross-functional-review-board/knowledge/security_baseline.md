# Security Baseline (Knowledge Base)

This is the reference document the Security agent cites when reviewing proposals. It mirrors how
a real mid-size company's InfoSec/AppSec team actually evaluates new initiatives — data
classification, threat modeling, vendor risk tiering, and compliance triggers — not generic
"is this secure?" checklists.

## Retrieval contract v2 (read this before passing anything to the LLM)

**Do not pass this entire document into the prompt**, and **do not rely on static keyword
matching as the only retrieval mechanism.** Keyword lists break on paraphrase: a proposal that
says "storing login credentials in a shared Redis cache" won't match a keyword list built around
`data, PII, customer data, purchase` even though it's a clear Restricted-tier classification
issue. Fixing this by endlessly appending synonyms is a losing game. Instead, retrieval has
three layers:

### Layer 1 — Core sections (always included, no matching needed)
Two sections are relevant to nearly every proposal that touches any system at all, so skip
retrieval logic for these and always include them:
- `sec-baseline-1` (Data Classification Tiers)
- `sec-baseline-5` (Standard Controls Checklist)

This alone would have caught the Redis example — Data Classification is always in scope, so the
agent would have had the tier definitions available regardless of whether "credentials" was ever
matched as a keyword.

### Layer 2 — Semantic classification (a real retrieval step, not string matching)
For the remaining sections, run one cheap LLM call before the main agent call: give it the
proposal text plus the section table below (id + heading + one-line description, not the full
text), and ask it to return which section_ids are relevant. This handles paraphrase and context
that keyword matching structurally cannot — an LLM reading "login credentials in Redis" correctly
infers "this is about authentication data and needs threat-modeling + classification context"
even with zero shared vocabulary with a keyword list.

| section_id | heading | one-line description (for the classifier prompt, not for matching) |
|---|---|---|
| `sec-baseline-2` | Threat Modeling (STRIDE) | Applies whenever a proposal introduces a new endpoint, integration, or data flow — including internal ones like new caches or credential stores. |
| `sec-baseline-3` | Vendor / Third-Party Risk Tiering | Applies whenever any entity outside the company touches company or customer data. |
| `sec-baseline-4` | Compliance Triggers | Applies whenever personal, financial, or health data is involved, or when user location/region is mentioned or implied. |
| `sec-baseline-6` | Proportionality (low-risk exceptions) | Applies whenever the proposal is clearly internal-only or has no data/backend component. |

This classifier call is cheap (short output, small model is fine) and is the actual fix — not a
bigger keyword list.

### Layer 3 — Agent-triggered supplemental retrieval (the safety net)
Even semantic classification can miss something. If the Security agent, while reasoning through
a proposal, identifies a system/data type that clearly needs baseline guidance it wasn't given,
it does not silently proceed and does not treat this as a proposal-authoring gap. It sets
`requested_context` on a `missing_information` concern (see `schema.md` and `debate_protocol.md`
→ Case B: Retrieval gap), which triggers the backend to fetch that specific topic and re-invoke
the agent. This is what keeps a retrieval miss from turning into a false "the proposal didn't say"
finding when the real issue was "the system didn't fetch."

### What gets sent to the agent
Regardless of which layer found it, sections are always sent as structured chunks, never raw
concatenated text:

```json
"knowledge_base": [
  { "section_id": "sec-baseline-1", "heading": "Data Classification Tiers", "text": "..." },
  { "section_id": "sec-baseline-3", "heading": "Vendor / Third-Party Risk Tiering", "text": "..." }
]
```

This solves two real problems: (1) it keeps the prompt small regardless of how long the full
baseline grows, and (2) it avoids "lost in the middle" — the model isn't scanning six sections
to find the two that matter, it's only ever given the two that matter. If the agent needs a
section that wasn't retrieved, it should say so explicitly (see `security_agent.md` — insufficient
context handling) rather than reasoning from memory of what the baseline "probably says."

## 1. Data Classification Tiers

Every proposal must be evaluated against what tier of data it touches. This is the single biggest
driver of required controls.

| Tier | Examples | Minimum controls required |
|---|---|---|
| **Public** | Marketing copy, public pricing | None beyond standard access control |
| **Internal** | Internal metrics, non-sensitive ops data | Auth required, no external sharing without review |
| **Confidential** | Customer PII, purchase history, employee data | Encryption at rest + in transit, access logging, DPA if shared externally |
| **Restricted** | Payment card data, health data, credentials, SSNs | Tokenization/encryption mandatory, PCI-DSS/HIPAA scope, security team sign-off required pre-launch |

A proposal that moves data from a lower tier to a higher-exposure context (e.g. Confidential data
now flowing to an external party) is a classification event and requires review regardless of how
small the change seems.

## 2. Threat Modeling — STRIDE Categories

For any proposal that introduces a new data flow, endpoint, or integration, assess against STRIDE:

- **Spoofing** — Can an attacker impersonate a legitimate user, service, or partner in this flow?
- **Tampering** — Can data be modified in transit or at rest without detection?
- **Repudiation** — Can actions be denied due to lack of logging/audit trail?
- **Information Disclosure** — Can data be exposed to parties who shouldn't see it?
- **Denial of Service** — Can this new surface be used to degrade or take down the service?
- **Elevation of Privilege** — Can this flow be used to gain access beyond what was intended?

A concern should map to at least one STRIDE category — this is what separates a specific,
actionable finding from a vague "this feels risky."

## 3. Vendor / Third-Party Risk Tiering

Any proposal involving an external party is scored by tier:

- **Tier 1 (High risk)**: Vendor receives Confidential or Restricted data, or has write access to
  production systems. Requires signed DPA, vendor security questionnaire, and annual reassessment.
- **Tier 2 (Medium risk)**: Vendor receives Internal data or read-only API access. Requires DPA,
  lighter-weight security review.
- **Tier 3 (Low risk)**: No data sharing, vendor is a tool/utility with no access to company data.
  No formal review required.

A proposal that doesn't specify what tier its vendor relationship falls into cannot be fully
assessed — flag this as a concern rather than assuming the lowest-risk tier.

## 4. Compliance Triggers

Flag these explicitly when present in a proposal — they carry legal + security overlap:

- **GDPR** — triggered by any EU resident's personal data, regardless of company location.
  Requires lawful basis for processing, and cross-border transfer safeguards (SCCs) if data
  leaves the EU.
- **CCPA/CPRA** — triggered by California resident data at qualifying company scale. Requires
  opt-out mechanisms and specific disclosure language.
- **PCI-DSS** — triggered by any handling of payment card data, even if outsourced to a processor.
- **HIPAA** — triggered by health data if the company or partner qualifies as a covered entity or
  business associate.
- **SOC 2** — not a legal requirement but often a customer contractual requirement; new data flows
  can affect SOC 2 scope and require updating control documentation.

## 5. Standard Controls Checklist

For any new external-facing endpoint or integration:

- [ ] Authentication mechanism specified (OAuth2, API key, mTLS — not "TBD")
- [ ] Rate limiting / abuse protection considered
- [ ] Encryption in transit (TLS 1.2+) and at rest for any Confidential+ data
- [ ] Least-privilege scoping — does the integration request more access than it needs?
- [ ] Logging and monitoring — can this flow be audited after the fact?
- [ ] Incident response — who owns this system if something goes wrong, and what's the blast radius?
- [ ] Data retention — is there a defined deletion/retention policy for data received or sent?

## 6. What does NOT require a full security review

To keep this realistic — not everything needs the full treatment. Skip deep review for:
- Internal tooling with no external data flow and no new data classification exposure
- Read-only integrations with Public-tier data only
- UI/UX changes with no backend or data flow implications

Flagging low-risk items as high-severity erodes trust in the review process — proportionality
matters as much as thoroughness.