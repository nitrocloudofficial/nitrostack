# Vitalis — Clinical Intelligence MCP Server

[![Node](https://img.shields.io/badge/node-%3E%3D18-339933)](https://nodejs.org/) [![MCP](https://img.shields.io/badge/MCP-compatible-6f42c1)](https://modelcontextprotocol.io/)

> Vitalis is an MCP server that exposes authenticated tools, resources, prompts, and widgets for clinical information workflows.
>
> **Hackathon submission:** Team Anshu · Project Vitalis

> **Responsible use:** Vitalis provides clinical decision-support information for research and demonstration. It is not a medical device and must not replace a licensed clinician, emergency services, or local clinical policy.

## Quick test queries

After connecting Vitalis to NitroStudio, MCP Inspector, Claude Desktop, or another MCP client, paste these prompts one at a time. Use the read-only API key for the first group. Use `API_KEY_CLINICIAN` for medication reconciliation and referral drafting.

**Triage and diagnostics**

```text
Assess these example symptoms for a 35-year-old female: headache and sore throat for 24 hours, severity 3/10. Return the urgency tier, red flags, and general care timeframe.

Check whether these example symptoms match emergency red flags: slurred speech and facial drooping.

Explain what an HbA1c test measures and interpret an example value of 7.2% for educational purposes.

Map the symptom "cough" to candidate ICD-10-CM codes for documentation support. Do not diagnose the patient.
```

**Drug safety**

```text
Search RxNorm for metformin and show the matching drug names and RxCUI values.

Get FDA label information for warfarin, focusing on boxed warnings and drug interactions.

Check the available evidence for interactions between warfarin and aspirin, including the methodology caveat.

Find recent FDA adverse-event reports for ibuprofen, limited to five results.
```

**Research and trials**

```text
Search PubMed for mRNA-based therapeutics and return up to five relevant articles with citations.

Find recruiting ClinicalTrials.gov studies for type 2 diabetes and return up to five trials.

Search PubMed for peer-reviewed clinical practice guidelines for hypertension.
```

**Synthetic FHIR and care coordination**

```text
Search the synthetic FHIR server for up to five patients named Alex. Clearly label the returned records as synthetic.

Using a patient ID returned by the previous query, show that synthetic patient's conditions, medications, observations, and encounters.

Prepare an appointment checklist for a follow-up visit for hypertension.

Using a returned synthetic patient ID, generate an SBAR handoff and clearly label it as a draft based on synthetic data.

Reconcile these example medication lists: EHR list [metformin 500 mg, warfarin 5 mg] and patient-reported list [metformin 500 mg, warfarin 5 mg, ibuprofen 400 mg]. Show continued, added, removed, and possible duplicate-risk medications.

Using a returned synthetic patient ID, draft a routine endocrinology referral for example reason: "HbA1c remains elevated despite current therapy." Mark it as requiring clinician review.
```

The patient-summary, handoff, and referral queries require a patient ID returned by the FHIR search. Do not enter real patient information. `care_reconcile_medications` and `care_draft_referral` require the clinician key and always require clinician review.

## 1. Endpoint status

No public endpoint is claimed by this repository until it has passed the authenticated verification checklist in `docs/deployment.md`. After deployment, publish the value as:

```text
https://<your-deployment-domain>/mcp
```

For local operation, configure locally generated keys in `.env` and use the read-only key for normal calls. Never copy the placeholder values from `.env.example` into a public deployment.

## 2. Tools and public API

The runtime registers 32 tools with the following controller-prefixed names.

### Triage (`triage:read`)

- `triage_assess_symptoms`
- `triage_check_red_flags`
- `triage_get_care_options`

### Drugs (`drugs:read`)

- `drugs_search`
- `drugs_get_label_info`
- `drugs_check_interactions`
- `drugs_get_adverse_events`
- `drugs_get_recalls`

### Diagnostics (`dx:read`)

- `diagnostics_lookup_condition`
- `diagnostics_interpret_lab_value`
- `diagnostics_explain_lab_test`
- `diagnostics_symptom_to_codes`

### Research (`research:read`)

- `research_search_pubmed`
- `research_get_article`
- `research_search_trials`
- `research_get_trial_details`
- `research_summarize_evidence`

### FHIR (`fhir:read`)

- `fhir_search_patients`
- `fhir_get_patient`
- `fhir_get_conditions`
- `fhir_get_medications`
- `fhir_get_observations`
- `fhir_get_encounters`
- `fhir_get_patient_summary`

### Care (`care:read` / `care:write`)

- `care_generate_handoff` (`care:read`)
- `care_reconcile_medications` (`care:write`)
- `care_draft_referral` (`care:write`)
- `care_find_guidelines` (`care:read`)
- `care_appointment_prep` (`care:read`)

### Clearly labeled stretch tools

- `diagnostics_lookup_icd11`
- `fhir_get_allergies`
- `fhir_get_immunizations`

### Resources

- `vitalis://safety-policy` — public safety policy
- `vitalis://data-sources` — public upstream registry
- `vitalis://audit/recent` — admin-only latest 50 audit entries
- `vitalis://metrics` — admin-only telemetry
- `health://checks` — framework health-check resource
- `widget://examples` — framework-loaded widget examples

## 3. Example MCP calls

The HTTP MCP endpoint is `/mcp`. Headers are shown for API-key authentication; MCP clients may also pass `_meta.x-api-key` where supported.

```json
{
  "method": "tools/call",
  "params": {
    "name": "triage_assess_symptoms",
    "arguments": {
      "symptoms": ["chest pain", "shortness of breath"],
      "age": 55,
      "sex": "male"
    },
    "_meta": { "x-api-key": "<read-write-key>" }
  }
}
```

```json
{
  "method": "tools/call",
  "params": {
    "name": "drugs_check_interactions",
    "arguments": {
      "drugs": ["warfarin", "aspirin"]
    },
    "_meta": { "x-api-key": "<read-only-key>" }
  }
}
```

Successful clinical results include `_safety` and `_meta.durationMs`. FHIR and care results identify synthetic data. Errors use stable codes such as `AUTH_DENIED`, `SCOPE_DENIED`, `PATIENT_NOT_FOUND`, and `UPSTREAM_UNAVAILABLE`.

## 4. Architecture

```text
MCP client / NitroStudio / Claude Desktop
                 │
                 ▼
      NitroStack MCP transport (/mcp)
                 │
 Emergency guard → API/JWT auth → scope guard
                 │
       trim pipe → tool handler → safety
                 │
       audit event → timing/metrics → client
                 │
  Triage · Drugs · Diagnostics · Research · FHIR · Care
                 │
 RxNorm · RxClass · OpenFDA · PubMed · Trials · FHIR · Clinical Tables
```

The six widget routes are connected to their tools with `@Widget` and are bundled by NitroStack from `src/widgets/`.

## 5. Authentication, scopes, and rate limits

Configure credentials through environment variables only:

```env
API_KEY_CLINICIAN=<random-key-with-read-write-care-scopes>
API_KEY_READONLY=<random-key-with-read-scopes>
API_KEY_ADMIN=<random-key-with-admin-scope>
VITALIS_ALLOW_ANONYMOUS_DEMO=false
# Optional HS256 JWT support:
# JWT_SECRET=<random-secret-at-least-16-bytes>
```

- `API_KEY_READONLY`: triage, drugs, diagnostics, research, and FHIR read scopes.
- `API_KEY_CLINICIAN`: read scopes plus `care:read` and `care:write`.
- `API_KEY_ADMIN`: explicit admin identity, wildcard tool access, and `admin:audit`.
- Anonymous mode is disabled by default, must be explicitly enabled, and never receives care-write or admin scopes.
- Unknown tools fail closed.
- `vitalis://audit/recent` and `vitalis://metrics` require the configured admin identity.
- If `JWT_SECRET` is set, bearer JWTs are validated as HS256 tokens with strict claims; JWTs do not inherit the API-key admin wildcard.

Default tool limits are configured per module: research and heavy drug operations are limited to 10 requests/minute, FHIR to 20/minute, local triage/diagnostics to 120/minute, and care operations according to their tool cost. These limits are per authenticated subject.

## 6. Clinical safety design

Every clinical tool uses the shared gateway. The safety layer:

1. scans nested input for emergency terms using escaped, case-insensitive word-boundary matching;
2. never blocks a request merely because emergency terms are present;
3. rewrites banned overreach such as “you have”/“diagnosis confirmed” and prescriptive dosing language;
4. adds a disclaimer, urgency tier, and red-flag metadata;
5. prepends emergency guidance when a red flag is detected;
6. marks FHIR and care output as synthetic data.

The embedded triage ruleset contains 30 validated rules. Missing or malformed safety data refuses startup. `VITALIS_SAFETY_LAYER=off` is test-only; outside `NODE_ENV=test` it is ignored and logged loudly.

## 7. Data sources and terms

| Source | Use | Policy |
|---|---|---|
| NLM RxNorm/RxClass | Drug names, RxCUI, classes | Public API; concurrency capped |
| OpenFDA | Labels, FAERS, recalls | FDA terms and reporting-bias caveats apply |
| NCBI PubMed | Search, citations, XML abstracts | NCBI `tool`/`email` etiquette required |
| ClinicalTrials.gov v2 | Trial search/details | Public API; bounded requests |
| HAPI FHIR R4 / SMART fallback | Synthetic FHIR records | Synthetic/Synthea data only |
| NLM Clinical Tables | ICD-10-CM lookup | Public documentation-support service |
| WHO ICD-11 (optional) | Optional classification lookup | Requires configured OAuth credentials; embedded fallback is labeled reference data |

Respect each provider’s current terms, rate limits, attribution requirements, and availability. Upstream content is not a clinical recommendation.

## 8. Local setup

### Prerequisites

- Node.js 18 or newer
- npm

```bash
# From the root of your NitroStack checkout:
cd sample-apps/vitalis
npm ci
npm --prefix src/widgets ci
cp .env.example .env
# Replace every credential placeholder with local values
```

Development defaults to stdio. HTTP mode can be selected explicitly:

```env
NODE_ENV=development
MCP_TRANSPORT_TYPE=http
HOST=127.0.0.1
PORT=3000
```

Commands:

```bash
npm run dev             # NitroStack development server
npm run typecheck       # TypeScript check
npm test                # Unit + integration tests
npm run test:coverage   # Coverage gate and HTML/JSON reports
npm run widget:build    # Standalone Next.js widget build
npm run build           # Server + widget production bundle
npm run verify          # All default non-live gates
```

Live upstream tests are opt-in:

```bash
npm run test:live       # Requires network; sets LIVE_API_TESTS=true
npm run fixtures:record # Explicitly capture sanitized public fixtures
```

## 9. Deployment

The primary documented target is Railway. See [`docs/deployment.md`](docs/deployment.md) for build/start commands, environment configuration, MCP endpoint setup, verification, audit storage, rollback, and the local stdio fallback.

At minimum, production must set `NODE_ENV=production`, `MCP_TRANSPORT_TYPE=http`, `HOST=0.0.0.0`, `PORT` from the platform, `CONTACT_EMAIL`, `NCBI_EMAIL`, and at least one API key or JWT secret. Do not put secrets in Git or `.env.example`.

## 10. Limitations and responsible use

- Vitalis does not diagnose, prescribe, or replace a clinician.
- Emergency guidance is generic; users should contact local emergency services.
- FHIR data is synthetic and must never be interpreted as real PHI.
- FDA interaction detection is evidence cross-scanning, not a complete interaction database.
- FAERS counts are voluntary reports, not incidence rates or proof of causation.
- Public upstreams can be incomplete, rate-limited, or unavailable; partial/fallback status is surfaced.
- JWT support is optional HS256 infrastructure, not a hosted identity provider.
