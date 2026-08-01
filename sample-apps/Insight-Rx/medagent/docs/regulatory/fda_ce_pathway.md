# Regulatory Pathway Scoping & Controls Mapping

**Document ID:** REG-002
**Subject:** Autonomous Medical Imaging Diagnosis & Clinical Decision Agent
**Status:** DRAFT — internal engineering draft prepared for external regulatory counsel
**Companion to:** REG-001 (`intended_use.md`)
**Phase:** Phase 2, item 5 (Strategic_Startup_Roadmap.pdf)

---

## ⚠️ Read first

This document is written **by engineers, for counsel**. Its purpose is to state accurately
what has been built, map those artifacts onto the risk controls we expect a regulator to
ask about, and — most importantly — be explicit about what has **not** been built.

Three things must not be misread:

1. **Regulatory citations here are our working understanding and require confirmation.**
   Classification regulations, product codes, and rule numbers are flagged where we are
   uncertain. Pathway selection is counsel's call.
2. **No clinical validation exists.** All performance evidence to date is synthetic (see
   REG-001 §Status notices). The controls below are *software* controls that are built and
   tested; they are not clinical evidence and do not substitute for it.
3. **The gap analysis in §6 is the most useful section of this document.** The controls we
   have are real; the ones we lack are numerous and include several that gate any
   submission.

---

## 1. Assumed classification

Per REG-001, we assume the software **is a regulated medical device**: the Cures Act CDS
carve-out (FD&C Act §520(o)(1)(E)) excludes software that acquires, processes, or analyzes
a medical image, which this does. We do not intend to argue non-device status.

### 1.1 United States (FDA)

Working assumption: **Class II**, consistent with the assistive, non-triage, non-autonomous
intended use in REG-001.

Candidate classification regulations under 21 CFR Part 892 (radiology devices) that counsel
should evaluate — *we are not confident in the precise section-to-function mapping and list
these as starting points, not conclusions*:

| Candidate | Function | Relevance |
|---|---|---|
| 892.2050 | Medical image management and processing system | Likely relevant to the image-handling and display components |
| 892.2070 | Medical image analyzer (computer-assisted detection) | Closest fit for the detection/localization function |
| 892.2080 | Radiological computer-assisted triage and notification (CADt) | **Deliberately not applicable** — we disclaim any triage claim (REG-001 §2.1) |

**Pathway options:**

| Pathway | When it applies | Assessment |
|---|---|---|
| **510(k)** | A suitable legally marketed predicate exists | **Preferred.** Numerous CADe devices for chest radiography have been cleared; a predicate is plausible. Requires substantial-equivalence argument on intended use *and* technological characteristics. The LLM-based reasoning and report-drafting components are the likeliest source of a "different technological characteristics" challenge and may require additional performance data to show they raise no new questions of safety or effectiveness. |
| **De Novo** | No suitable predicate; low-to-moderate risk | **Realistic fallback.** If the generative-AI report-drafting component is judged to lack a predicate, De Novo classification is the route, establishing special controls. Longer, more expensive. |
| **PMA (Class III)** | High risk / life-sustaining | **To be avoided, and avoidable.** This is the outcome the restrictive intended use in REG-001 is designed to prevent. An autonomous diagnostic claim, or a claim permitting a case to bypass radiologist review, is what would push toward this. |

**Additionally relevant regardless of pathway:**
- **Predetermined Change Control Plan (PCCP).** Because this is an AI/ML device we expect to
  retrain, a PCCP should be scoped early — it is the mechanism for pre-authorizing defined
  model updates without a new submission. This materially affects post-market velocity and
  should be designed in, not retrofitted.
- **Cybersecurity documentation**, including an SBOM, per FDA premarket cybersecurity
  expectations.

### 1.2 European Union (EU MDR 2017/745)

Software is classified under **Rule 11** of Annex VIII:

| Outcome | Trigger | Our assessment |
|---|---|---|
| Class IIa | Software providing information used for diagnostic/therapeutic decisions | **Baseline expectation** |
| Class IIb | …where decisions could cause serious deterioration of health or surgical intervention | **Plausible and should be assumed.** A missed pneumonia can lead to serious deterioration. Counsel should assess whether the assistive framing and mandatory radiologist review are sufficient to hold IIa. |
| Class III | …where decisions could cause death or irreversible deterioration | Not expected given the assistive positioning |

Either way, a **Notified Body** is required. Practical implications:
- **ISO 13485** quality management system — not yet established (§6).
- **Technical documentation** per Annex II/III.
- **Clinical evaluation** per Annex XIV — requires real clinical data we do not have.
- **Post-market surveillance and PMCF** plans per Annex III.
- **GDPR** interacts directly with the PHI controls in §3; Article 9 (special-category
  health data) applies. The on-premise, offline-capable deployment is a deliberate
  architectural choice that simplifies this considerably — no patient data leaves the
  institution.

### 1.3 Standards we expect to be held to

| Standard | Scope | Current posture |
|---|---|---|
| IEC 62304 | Medical device software lifecycle | Partially addressed by engineering practice; **not formally documented** |
| ISO 14971 | Risk management | Informal risk reasoning throughout; **no formal risk file** |
| ISO 13485 | QMS | **Not established** |
| IEC 62366-1 | Usability engineering | **Not started** — significant gap given automation-bias risk |
| IEC 82304-1 | Health software product safety | Not assessed |
| ISO/IEC 27001 | Information security | Not assessed |
| FDA/Health Canada/MHRA **GMLP** guiding principles | Good Machine Learning Practice | Partially addressed — see §3.5 |

---

## 2. How to read the controls mapping

Sections 3.1–3.6 map each Phase 2 engineering control onto the regulatory concern it
addresses. For each we state: what it is, where it lives, how it is verified, and — the
part that matters most — **what it does not cover**.

Every control listed is implemented and covered by automated tests in this repository. The
test suite is the primary objective evidence that these controls behave as described; the
compliance manifest (`scripts/generate_compliance_manifest.py`) packages the artifacts.

---

## 3. Controls implemented in Phase 2

### 3.1 PHI de-identification hard gate

**Addresses:** HIPAA Privacy Rule (Safe Harbor de-identification), GDPR Art. 9 / Recital 35,
ISO 14971 risk control for unauthorized disclosure of health data.

**Implementation** — `src/medagent/privacy/`:
- **DICOM tag scrubbing** (`dicom_scrubbing.py`): removes 23 direct-identifier tags
  (patient name, ID, birth date, addresses, institution and physician names, accession
  number). Ages ≥90 are generalized to `090Y` per Safe Harbor's treatment of ages over 89.
  Clinically necessary non-identifiers (age band, sex, view position, modality) are
  deliberately preserved.
- **Burned-in pixel text redaction** (`ocr_redaction.py`): OCR over the pixel array with
  blackout of any detected text region. Tuned to over-redact — a chest radiograph contains
  no legitimate text, so any detection is removed.
- **Free-text de-identification** (`phi_redaction.py`): NLP-based (Microsoft Presidio,
  spaCy NER) detection of names, dates, locations, organizations, phone numbers, and
  medical record numbers.

**Architectural significance — this is a hard gate, not a filter.** De-identification runs
as the **first node in the graph**, before any other component touches the image, and
unlike every other node it does **not** fail safe by degrading. If de-identification cannot
be completed, the case is **halted** and no downstream node executes. The rationale: by the
time a human could notice something went wrong, unredacted data may already have been
written to disk as a heatmap, a checkpoint, or a log line.

**Verification:** unit tests per module plus an end-to-end test using a deliberately toxic
synthetic DICOM (PHI in tags *and* burned into pixels), verified by independently re-running
OCR on the output to confirm zero remaining detectable text.

**Does not cover:** re-identification risk from image content itself (e.g. distinctive
anatomy or implanted hardware); PHI in filenames supplied by an upstream system;
institutional network security.

### 3.2 Retrieval integrity — signed knowledge base

**Addresses:** software integrity and supply-chain concerns (IEC 62304 §5.8; FDA premarket
cybersecurity expectations); integrity of the evidence base underlying device output.

**Implementation** — `src/medagent/security/artifact_signing.py`, `src/medagent/rag/`:
- Eliminated unsafe deserialization: the vector index is persisted via native FAISS I/O and
  plain JSON, never `pickle`. The previous implementation required
  `allow_dangerous_deserialization=True`, which executes arbitrary code from a tampered file.
- HMAC-SHA256 signature over the index and its document store, generated at build time and
  **verified before a single byte is loaded** at runtime.
- Verification failure raises and **halts** — it does not fall back to an unverified index.

**Why this matters clinically:** a tampered document store could inject fabricated clinical
guidance into the citations presented to a radiologist, without altering the vector index at
all. That is a content-integrity attack on clinical advice, and the signature covers both
files precisely for this reason.

**Verification:** tamper tests on the index binary, on the JSON metadata sidecar, and on the
signature file, each asserted to halt the pipeline; verified both at unit level and through
the full graph.

**Does not cover:** the correctness or currency of the guideline corpus itself (a clinical
content-governance question); key management (the signing key is a deployment secret, and
an attacker holding it defeats this control).

### 3.3 Access control and tamper-evident audit trail

**Addresses:** 21 CFR Part 11 (electronic records and signatures), HIPAA Security Rule audit
controls (§164.312(b)), EU MDR traceability, ISO 13485 record control.

**Implementation** — `src/medagent/security/auth.py`, `audit_logger.py`, `audit_store.py`:

*Role-based access control.* The clinical review decision is authorization-gated. The
enforced matrix is published in the compliance manifest, generated directly from the code
that enforces it:

| Role | approve | revise | reject |
|---|---|---|---|
| `radiologist` | ✅ | ✅ | ✅ |
| `admin` | ❌ | ❌ | ✅ |

The asymmetry is deliberate and clinical: approving or revising a report is a licensed
clinical act; rejecting only ever routes a case toward manual radiologist workup and so
cannot cause an AI-generated finding to be accepted. Administering the system does not
confer authority to sign an interpretation.

*Hash-chained audit log.* Every record carries the SHA-256 hash of its predecessor, so the
log is only internally consistent as a whole sequence — modifying, deleting, or reordering
any record breaks the chain at a detectable point. Events captured: case started,
de-identification completed/failed, report drafted, review resumed, **review access
denied**, case finalized, case archived. Each record carries timestamp, case ID, event type,
and user ID.

*PHI policy of the audit trail itself:* structured fields are PHI-free by construction; the
single free-text field is passed through the §3.1 de-identifier before being written.

*Storage abstraction:* the logger writes through an `AuditStore` interface so the Phase 3
migration to a database-backed store is a wiring change, not a rewrite.

**Verification:** chain verification detects modification, deletion, and reordering,
including a tamperer who recomputes the edited record's own hash (caught at the successor).
A CLI verifier is provided for spot audits.

**Limitation counsel must be aware of:** an unanchored hash chain makes tampering
*detectable*, not *impossible*. An attacker with write access to the whole file can recompute
a fully self-consistent chain offline. Closing this requires an external anchor — signing
the head hash, a witness service, or WORM storage — which is **not yet implemented** (§6).
The current local-file store is also single-writer; concurrent processes could fork the
chain. Both are addressed by the Phase 3 database-backed store.

### 3.4 Deterministic verification firewall

**Addresses:** ISO 14971 risk control for erroneous output; GMLP principles on output
validation; the specific hazard of LLM confabulation in a clinical context.

**Implementation** — `src/medagent/agents/verification_checks.py`, `verifier_agent.py`.
A three-stage gate between report drafting and clinician review:

1. **Low-confidence abstention.** If the vision model's calibrated confidence falls below
   threshold (0.60), the case is flagged and escalated **directly to a human**, bypassing all
   further automated processing. It deliberately does *not* enter the regeneration loop:
   rewriting prose cannot change what the model already scored.
2. **Deterministic checks — pure functions, no LLM involved:**
   - *Schema conformance*: the structured finding must validate against its declared schema
     and enumerations.
   - *Report-vs-detector consistency*, bidirectional: if the detector localized regions, the
     report must assert a finding; if the detector found nothing **and** the classifier said
     Normal, the report must not invent one. Uses negation-aware text analysis so that "no
     focal consolidation" is correctly read as a *negative* finding.
   - *Citation grounding*: every `[n]` cited in the report must exist in the retrieved
     evidence. A fabricated citation is the most dangerous class of hallucination here
     because it does not look like an error — it looks like a source.
3. **LLM semantic review**, reached only after the deterministic checks pass.

**The central point for a reviewer:** stages 1 and 2 **cannot hallucinate a pass**. An LLM
asked "is this report consistent?" can confabulate a "yes", which makes it a reviewer rather
than a safeguard. These checks fail for reasons that can be stated exactly, reproduced from
the same inputs indefinitely, and tested without a model server. A deterministic failure is
authoritative and short-circuits the LLM stage entirely.

**Bounded correction loop:** a failure returns the exact error text to the report drafter for
one rewrite, capped at 3 total attempts, after which the case is flagged to a human. The loop
provably terminates.

**Does not cover:** clinical correctness. These checks confirm internal consistency,
schema conformance, and citation grounding — a report can satisfy all three and still be
clinically wrong. This is a principal justification for the mandatory human-review gate, not
a substitute for it.

### 3.5 Performance characterization and bias analysis (Phase 1)

**Addresses:** GMLP principles (representative datasets, performance across subgroups,
clinically meaningful performance); FDA expectations on algorithmic bias.

**Implementation** — `src/medagent/evaluation/`:
- **Locked, patient-level stratified split** with SHA-256 manifest fingerprints — prevents
  patient-level leakage and makes the evaluation set immutable and auditable.
- **Clinical metrics with 95% bootstrap confidence intervals** (sensitivity, specificity,
  PPV, NPV, AUROC) at a **high-recall operating threshold selected on validation and applied
  unchanged to test** — never tuned on the test set.
- **Calibration** via temperature scaling, with ECE reported.
- **Subgroup analysis** across age band, sex, and view position, with explicit safety flags
  (sensitivity CI lower bound below floor) and fairness flags (cross-subgroup disparity),
  including intersectional effects.
- **Model Card** generation with MLflow experiment tracking.

**Status — this is the critical caveat:** the machinery is built and tested; **the inputs are
synthetic.** The Model Card is watermarked accordingly. This section demonstrates *evaluation
capability*, not performance.

### 3.6 Human-in-the-loop enforcement

**Addresses:** the assistive intended use in REG-001; automation-bias risk; EU MDR
requirements on meaningful human oversight.

**Implementation:** covered in REG-001 §4. Summarized here as a control: the mandatory
review interrupt plus RBAC on the review decision, which together make autonomous
finalization architecturally unavailable rather than merely prohibited by policy.

---

## 4. Controls-to-concern summary

| Regulatory concern | Control | §  | Status |
|---|---|---|---|
| Patient privacy / PHI disclosure | De-identification hard gate | 3.1 | Implemented, tested |
| Software / supply-chain integrity | Signed FAISS index, no pickle | 3.2 | Implemented, tested |
| Electronic records & signatures (Part 11) | Hash-chained audit log | 3.3 | Implemented, tested; **needs external anchoring** |
| Access control | RBAC on clinical review | 3.3 | Implemented, tested; **needs real IdP** |
| Erroneous / fabricated output | Deterministic verification firewall | 3.4 | Implemented, tested |
| Low-confidence output | Abstention and escalation | 3.4 | Implemented, tested |
| Performance characterization | Locked split, CIs, calibration | 3.5 | Machinery built; **synthetic data only** |
| Algorithmic bias | Subgroup + intersectional analysis | 3.5 | Machinery built; **synthetic data only** |
| Automation bias / oversight | Mandatory human review gate | 3.6 | Implemented, tested; **no human-factors validation** |

---

## 5. Objective evidence available today

| Artifact | Location |
|---|---|
| Intended Use Statement | `docs/regulatory/intended_use.md` |
| This pathway analysis | `docs/regulatory/fda_ce_pathway.md` |
| Model Card (synthetic) | `evaluation_results/Model_Card.md` |
| Subgroup / bias analysis (synthetic) | `evaluation_results/subgroup_analysis.json` |
| Audit trail sample + chain verification | `data/audit_log.jsonl` |
| Enforced RBAC matrix | generated from `security/auth.py` |
| Automated test suite | `tests/` |
| Architecture description | `docs/architecture.md` |

`scripts/generate_compliance_manifest.py` packages these into `compliance_export/` with a
SHA-256 manifest and an audit-chain verification result.

---

## 6. Gap analysis — what is NOT done

**This section should be read before any submission planning.** The controls above are real,
but the following gate a submission and are not addressed by engineering work alone.

### 6.1 Blocking gaps

| Gap | Consequence |
|---|---|
| **No real clinical data. No clinical validation. No clinical evaluation report.** | No performance claim can be made. Blocks every pathway. Everything in §3.5 is synthetic. |
| **No Quality Management System (ISO 13485)** | Blocks CE marking; expected by FDA. |
| **No formal risk management file (ISO 14971)** | Required; informal reasoning in code comments is not a risk file. |
| **No IEC 62304 lifecycle documentation** | Software safety classification, architecture, unit verification, and configuration management must be formally documented. |
| **No usability / human-factors validation (IEC 62366-1)** | Serious given that automation bias is our principal residual risk (REG-001 §6). |
| **No predicate device analysis** | Determines 510(k) vs De Novo; needed before pathway commitment. |

### 6.2 Significant gaps

| Gap | Note |
|---|---|
| No real identity provider | RBAC authorizes an identity; it does not authenticate one. Roles are currently trusted input from the deployment, not attested. Needs SSO/OIDC integration with attested claims. |
| Audit chain not externally anchored | See §3.3 limitation. Needs head-hash signing, a witness, or WORM storage. |
| Single-writer audit store | Concurrent processes could fork the chain; resolved by the Phase 3 database-backed store. |
| No cybersecurity documentation / SBOM | Expected in premarket submissions. |
| No post-market surveillance plan | Required for both jurisdictions. |
| No PCCP | Should be scoped early to enable model updates without resubmission. |
| No labelling / IFU | Instructions for Use must carry the REG-001 restrictions to the user. |
| LLM component characterization | Generative components are the least conventional part of this device and should be expected to attract specific scrutiny. Deterministic verification (§3.4) is a mitigation, not a characterization. |
| No clinical governance for the guideline corpus | Who curates it, how currency is maintained, how updates are validated. |

### 6.3 Recommended next steps for counsel

1. Confirm device status and candidate classification regulation / product code.
2. Advise on 510(k) predicate viability given the generative-AI components, or De Novo.
3. Advise on EU MDR Rule 11 classification (IIa vs IIb) under the assistive framing.
4. Identify which gaps in §6.1 gate a pre-submission meeting, and advise on Q-Sub timing.
5. Advise on PCCP scope for planned model retraining.

---

*Prepared by the engineering team for review by external regulatory counsel. Not a
regulatory submission. Not legal advice. Regulatory citations are working assumptions
requiring confirmation. No validated clinical claim is made herein.*
