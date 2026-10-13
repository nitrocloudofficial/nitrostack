Fraud Reporting & Multi-Agent Triage System — 
Architecture Specification 
Version: 1.0 (Draft) Status: For review — no implementation yet 
 
 
1. Purpose & Scope 
This system allows victims of financial fraud to file a structured report ("ticket"), which is then 
automatically analyzed, routed to the appropriate authority/department, and paired with 
jurisdiction-aware legal guidance — so the human authority spends their time deciding and 
acting, not researching and triaging. 
 
The system does not make enforcement decisions. Every legal suggestion is advisory and 
cited; a human authority reviews and decides what to act on. This is a design constraint, not just 
a feature — it affects how every agent's output is structured (as recommendations with 
confidence and sources, never as directives). 
 
 
2. System Architecture Overview 
┌─────────────────┐     ┌──────────────┐     
┌────────────────────────────┐ 
 
│ Reporting Portal │ --> │ Backend API  │ --> │      Orchestrator          │ 
 
│ (ticket intake)  │     │ (validation, │     │  (deterministic pipeline   │ 
 
└─────────────────┘     │  persistence)│     │   controller, NOT an LLM)  │ 
 
                         └──────────────┘     └────────────┬───────────────┘ 
 
                                                            │ 
 
                                            ┌───────────────▼────────────────┐ 
 
                                            │   Agent 1 — Triage/Classifier   │ 
 
                                            │   (single call, blocking)       │ 
 
                                            └───────────────┬────────────────┘ 
 
                                                            │ fan-out 
 
                                       ┌────────────────────┴────────────────────┐ 
 
                                       ▼                                         ▼ 
 
                          ┌────────────────────────┐              
┌──────────────────────────┐ 
 
                          │ Agent 2 — Assignment    │              │ Agent 3 — Legal/Solutions │ 
 
                          │ (dept + personnel)      │              │ (laws + suggested actions)│ 
 
                          └────────────┬────────────┘              
└─────────────┬─────────────┘ 
 
                                       └───────────────────┬──────────────────────┘ 
 
                                                            │ fan-in / merge 
 
                                                            ▼ 
 
                                            ┌───────────────────────────────┐ 
 
                                            │   Case Packet (merged output)  │ 
 
                                            └───────────────┬───────────────┘ 
 
                                                            ▼ 
 
                                            ┌───────────────────────────────┐ 
 
                                            │  Assigned Authority Dashboard  │ 
 
                                            │  (reviews, enforces, closes)   │ 
 
                                            └───────────────────────────────┘ 
 
Key architectural decision: MCP is the tool/data-access layer, not the workflow engine. Each 
agent is a Claude API call with a distinct system prompt and a defined set of MCP tools it's 
allowed to call. The sequencing — call Agent 1, wait, fan out to Agents 2 and 3 in parallel, wait 
for both, merge, hand off — is deterministic backend code. This matters here specifically 
because the pipeline ends in legal/financial decisions: you want the order of operations to be 
auditable and reproducible, not something an LLM decided to do differently on two similar 
tickets. The LLMs decide content (classification, assignment, legal suggestions); the backend 
decides flow. 
 
 
3. Data Model 
3.1 Ticket Schema 
Field 
Type 
Notes 
ticket_id 
UUID 
 
created_at 
ISO 8601 timestamp 
 
status 
enum 
submitted → triaged → 
assigned → in_review → 
resolved → closed 
victim.full_name 
string 
 
victim.contact_number 
string 
 
victim.email 
string 
optional 
victim.address 
string 
 
victim.id_proof_type / 
id_proof_number 
string 
field-level encrypted 
fraud.timestamp 
ISO 8601 
drives the revocability check 
(§7.1) 
fraud.medium 
enum 
cash | cheque | upi | 
bank_transfer | other 
fraud.subject 
string (≤150 chars) 
 
fraud.description 
text 
 
Field 
Type 
Notes 
fraud.amount 
decimal 
 
fraud.currency 
ISO 4217 code 
 
fraudster.* 
object, optional 
name, phone, bank account, 
UPI ID, IFSC, address — any 
subset, all optional 
region.country / 
region.state / 
region.jurisdiction_co
de 
string 
drives which legal corpus 
Agent 3 queries 
attachments[] 
array 
file_id, type, storage_url, 
uploaded_at 
metadata.source 
enum 
web | mobile | api | 
agent_assisted (for 
walk-in reports filed by staff) 
metadata.ip_hash 
string 
hashed, not raw — see §11 
3.2 Department & Personnel Schema 
Department: department_id, name, jurisdiction_scope, specializations[], 
 
            current_caseload, capacity, contact_channel 
 
Personnel:  personnel_id, name, role, department_id, specializations[], 
 
            current_case_count, availability_status 
 
This directory is exposed to Agent 2 as an MCP resource/tool (get_department_directory, 
get_personnel_availability) so assignment decisions are made against live capacity 
data, not stale or hardcoded values. 
3.3 Agent Output Schemas 
Agent 1 (Triage) output: 
 
{ 
 
  "ticket_id": "...", 
 
  "fraud_type": "upi_fraud | card_fraud | cheque_fraud | phishing | investment_scam | ...", 
 
  "scale": { 
 
    "victim_count_estimate": 1, 
 
    "pattern_suspected": false, 
 
    "related_ticket_ids": [] 
 
  }, 
 
  "urgency": { 
 
    "level": "low | medium | high | critical", 
 
    "revocability_window_remaining": "estimate, not authoritative — see §7.1", 
 
    "reasoning": "..." 
 
  }, 
 
  "risk_score": 0-100, 
 
  "evidence_gaps": ["..."] 
 
} 
 
Agent 2 (Assignment) output: 
 
{ 
 
  "ticket_id": "...", 
 
  "assigned_department_id": "...", 
 
  "assigned_personnel": [{"id": "...", "role": "..."}], 
 
  "team_size_recommendation": "individual | small_team | full_team", 
 
  "reasoning": "...", 
 
  "escalation_flag": false 
 
} 
 
Agent 3 (Legal/Solutions) output: 
 
{ 
 
  "ticket_id": "...", 
 
  "jurisdiction": "...", 
 
  "applicable_laws": [ 
 
    {"name": "...", "section": "...", "summary": "...", "source_url": "...", "relevance": "..."} 
 
  ], 
 
  "suggested_actions": [ 
 
    {"action": "...", "legal_basis": "...", "urgency": "...", "citation": "..."} 
 
  ], 
 
  "confidence_notes": "explicit flag when the corpus is stale or the jurisdiction match is uncertain" 
 
} 
 
Every agent output is validated against its JSON schema before being persisted. A 
schema-invalid or low-confidence output routes the ticket to a manual triage queue rather than 
silently proceeding — see §5.4. 
 
 
4. Agent Pipeline 
4.1 Agent 1 — Triage & Classification 
-​
Input: raw ticket 
-​
Tools available: get_ticket, get_related_tickets (for pattern/organized-fraud 
detection — e.g., same fraudster UPI ID or account number appearing across multiple 
tickets) 
-​
Job: classify fraud type, estimate scale (is this isolated or part of a pattern?), and 
estimate urgency. Urgency should weight time elapsed since the fraud against a 
configurable revocability window (§7.1) — not a hardcoded number, since these vary by 
payment rail and jurisdiction and change via regulatory circulars. 
-​
Design note: this agent's output is the only thing Agents 2 and 3 see — they never see 
the raw ticket. This keeps their prompts focused and makes outputs easier to validate 
independently. 
4.2 Agent 2 — Assignment 
-​
Input: Agent 1's output 
-​
Tools available: get_department_directory, get_personnel_availability 
-​
Job: decide department + team size. Explicitly reasons about whether this needs one 
officer (e.g., single-victim UPI fraud, low amount, no pattern) or a full team (multi-victim 
pattern, high amount, cross-jurisdiction fraudster). The reasoning field is not cosmetic — 
it's what the receiving human reads to understand why they got this case and at what 
priority. 
4.3 Agent 3 — Legal & Solutions 
-​
Input: Agent 1's output + region 
-​
Tools available: legal_search (RAG over a maintained legal/regulatory corpus), 
web_search (fallback for very recent regulatory changes not yet in the corpus) 
-​
Job: surface applicable laws/regulations and suggested actions, each with a citation. 
This is the agent most worth treating conservatively: financial law differs by country and 
changes over time, so its knowledge should come from an actively maintained, 
versioned corpus — never purely from the model's training data. Low-confidence or 
no-match results should say so explicitly rather than guessing. 
 
 
5. Orchestration Layer 
5.1 Design Principle 
Restated from §2: orchestration = deterministic backend code; agents = LLM calls with scoped 
tools. This gives you retries, timeouts, and audit logging as first-class backend concerns rather 
than emergent LLM behavior. 
5.2 MCP Server — Tools & Resources 
A single MCP server (fraud-pipeline-mcp) exposes: 
 
Tool/Resource 
Used by 
Purpose 
get_ticket(ticket_id) 
Agent 1 
fetch raw ticket 
get_related_tickets(cr
iteria) 
Agent 1 
pattern detection 
get_department_directo
ry(jurisdiction, 
specialization) 
Agent 2 
live routing options 
get_personnel_availabi
lity(department_id) 
Agent 2 
capacity-aware assignment 
legal_search(query, 
jurisdiction) 
Agent 3 
RAG over legal corpus 
web_search(query) 
Agent 3 
fallback for recent changes 
save_agent_output(agen
t_name, ticket_id, 
output) 
orchestrator 
persistence + audit trail 
get_case_history(ticke
t_id) 
authority dashboard 
full audit view 
5.3 Pipeline Sequence 
1.​ Ticket submitted → validated → persisted → status = submitted 
2.​ Orchestrator calls Agent 1 → validate output against schema → persist → status = 
triaged 
3.​ Orchestrator calls Agent 2 and Agent 3 in parallel, both fed Agent 1's output 
4.​ On both returning: validate each → merge into a case packet → status = assigned 
5.​ Case packet delivered to assigned personnel/department dashboard 
6.​ Authority reviews Agent 3's suggested actions, marks each enforced / rejected / 
modified, with a required note if rejected → status = in_review 
7.​ Authority closes the case → status = resolved / closed, all decisions written to 
the immutable audit log 
5.4 Error Handling & Resilience 
-​
Schema-invalid or low-confidence agent output → route to manual triage queue, not a 
silent retry-and-hope 
-​
Retries with exponential backoff for transient failures (timeouts, rate limits) on agent calls 
and web_search 
-​
Pipeline runs asynchronously via a job queue — ticket submission is acknowledged 
immediately (<1s); the full pipeline (especially Agent 3's legal search) completing in the 
background avoids blocking the victim-facing submission flow 
-​
Idempotency keys on agent calls so a retried step doesn't duplicate work or produce 
conflicting outputs 
 
 
6. Department Assignment Logic 
Agent 2's recommendation is a suggestion the receiving department can override. Inputs to 
weigh: 
 
-​
Fraud type ↔ department specialization match 
-​
Current caseload / capacity of candidate departments and personnel 
-​
Scale signal from Agent 1 (pattern suspected → prefer a team with cross-case visibility, 
not just an available individual) 
-​
Jurisdictional scope (does this department handle this region?) 
-​
Escalation flag (e.g., high amount + organized pattern + cross-border fraudster) — 
routed to a senior/specialized unit regardless of current caseload 
 
 
7. Legal / Regional Compliance Layer 
7.1 Revocability Window Handling 
Transaction-reversal windows differ by payment rail (cash has none; cheque, bank transfer, and 
UPI each have different dispute-resolution timelines) and by jurisdiction, and these windows 
change via regulator circulars (e.g., central bank or payment-network directives) rather than 
statute, so they change more often than most legal parameters. Design requirement: these 
thresholds must be stored as a versioned, admin-editable configuration table sourced from the 
legal corpus — never hardcoded in a prompt or in application code. Agent 1's "revocability 
window remaining" field should be treated as an estimate with a visible source/version stamp, 
not an authoritative countdown. 
7.2 Legal Knowledge Base (RAG design) 
-​
Corpus of statutes, regulator circulars, and case-relevant guidance, tagged by 
jurisdiction and topic 
-​
Refreshed on a defined cadence (e.g., monthly) plus ad-hoc updates when a regulator 
issues something time-sensitive 
-​
legal_search performs retrieval over this corpus first; web_search is a fallback only, 
flagged as lower-confidence in the output when used, since it isn't curated the same way 
-​
Every corpus entry carries a source URL and last-verified date so Agent 3's citations are 
traceable 
7.3 Citation Requirements 
Agent 3's suggested_actions are not usable by an authority unless each one carries a 
legal_basis and citation. This should be enforced at the schema level (required fields), 
not left to prompt instruction alone. 
 
 
8. Human-in-the-Loop: Authority Review Workflow 
The authority dashboard shows, per ticket: 
 
-​
Agent 1's classification/urgency (context) 
-​
Agent 2's assignment + reasoning (why this landed with them) 
-​
Agent 3's suggested actions + citations (options, not instructions) 
-​
A decision form: enforce / reject / modify each suggested action, with a mandatory note 
on rejection (this is valuable audit + feedback signal, and cheap to collect) 
 
This decision record is what closes the loop — over time it's also the training signal for whether 
Agent 3's suggestions are actually useful in practice (see §13). 
 
 
9. Database Schema (core tables) 
tickets            (as per §3.1) 
 
departments         (as per §3.2) 
 
personnel           (as per §3.2) 
 
agent_outputs       (ticket_id, agent_name, output_json, model_version, prompt_version, 
 
                     confidence, created_at) 
 
case_assignments    (ticket_id, department_id, personnel_ids[], assigned_at) 
 
legal_suggestions   (ticket_id, action, legal_basis, citation, authority_decision, 
 
                     decision_note, decided_by, decided_at) 
 
audit_log           (ticket_id, actor, action, timestamp, details)  -- immutable, append-only 
 
legal_corpus        (entry_id, jurisdiction, topic, text, source_url, last_verified_at, version) 
 
 
10. API Surface (sketch) 
POST   /api/tickets                          submit new ticket 
 
GET    /api/tickets/{id}                      ticket + pipeline status 
 
GET    /api/tickets/{id}/case-packet          merged Agent 2 + Agent 3 output 
 
POST   /api/tickets/{id}/authority-decision   record enforce/reject/modify per action 
 
GET    /api/departments/{id}/caseload         live capacity (admin/internal) 
 
POST   /api/admin/legal-corpus                update legal reference entries (admin) 
 
 
11. Security & Privacy 
-​
Field-level encryption (e.g., AES-256) for ID proof numbers, bank account details, UPI 
IDs 
-​
TLS in transit; encryption at rest for the full database 
-​
RBAC: victims see only their own tickets; personnel see only assigned tickets; admins 
see aggregate/department views 
-​
IP addresses hashed, not stored raw, in metadata 
-​
Immutable audit log for every agent decision and every human override 
-​
Data retention/deletion policy should be defined in consultation with your 
legal/compliance team against the relevant data-protection regime for your operating 
region(s) (e.g., India's DPDP Act if operating there, GDPR if serving EU residents) — 
this is a compliance decision, not something to hardcode from this spec 
 
 
12. Non-Functional Requirements 
Concern 
Target 
Ticket submission ack 
< 1s 
Full pipeline completion 
< 60s typical (Agent 3's external legal search 
is the long pole) 
Pipeline execution 
asynchronous, queue-based — never blocks 
submission 
Observability 
every agent call logged with prompt version, 
model version, latency, token usage, and 
output, for audit and debugging 
Idempotency 
retried pipeline steps must not duplicate 
assignments or suggestions 
 
 
13. Future Extensions 
-​
Multi-language intake for regional victims 
-​
SMS/WhatsApp/IVR intake channels feeding the same ticket schema 
-​
Cross-ticket entity resolution (graph-based) to detect organized fraud rings via shared 
fraudster identifiers 
-​
Feedback loop: authority decisions (§8) used to periodically evaluate and refine Agent 
2/Agent 3 prompt quality 
-​
Configurable escalation rules per jurisdiction as department structures vary by region 
 
 
14. Open Decisions for Next Steps 
These are the things worth deciding before writing code: 
 
1.​ Legal corpus sourcing — build/maintain in-house vs. license a legal database vs. rely 
primarily on web_search with heavier confidence-flagging (affects Agent 3's reliability 
significantly) 
2.​ Job queue technology for async pipeline execution (e.g., a managed queue vs. 
self-hosted) 
3.​ Department directory — is this synced from an existing government system, or is it the 
source of truth itself? 
4.​ Jurisdiction scope for v1 — single-country launch (given the UPI/cheque focus, likely 
India) vs. designed multi-country from day one 
 
 
 
This document is a design artifact for review — no code has been written yet. Happy to turn any 
section into a working prototype once you're ready, or convert this into a formatted Word/PDF 
spec if that's useful for circulating to stakeholders. 
 
