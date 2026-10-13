# SPEC.md — Vitta build spec (consolidated from Winning Plan PDF §05–08 + PLAN.md §10 canonical fixes)

Source of tool/resource/prompt contracts: `Vitta_Hackathon_Winning_Plan.pdf` pp.6–10.
Canonical corrections applied from `PLAN.md` §10. Design decisions below are binding for the build.

## Golden path (only scope)
qualify_lead → record_consent(⚿ issuer) → verify_kyc → screen_fraud → pull_bureau ⚿
→ fetch_bank_statements ⚿ → compute_affordability → underwrite → generate_offers
→ create_sanction_letter → log_audit_event / get_audit_trail

## Canonical determinism (PLAN.md §10)
- Tool name is **`fetch_bank_statements`** (never fetch_bank_stmts).
- PAN **last digit**: `0–1 → APPROVE`, `5–6 → CONDITIONAL`, `8–9 → DECLINE` (2–4 lean approve, 7 lean clear).
- Mobile **suffix (last 2 digits)**: `00–33 → stable salaried`, `34–66 → self-employed`, `67–99 → volatile`.
- Fraud: mobile suffix `90–99 → REVIEW` (path E uses 99), a reserved value `→ BLOCK`, else `CLEAR`.
- **Demo pair:** PAN `VITTA1235K` (digit 5 → CONDITIONAL), mobile `9876543222` (suffix 22 → stable salaried).
  Story (canonical, verified): "₹2,50,000 instead of ₹3L because existing EMIs put FOIR ≈ 57%."

## 12 TOOLS (inputs → outputs; ⚿ = consent-gated)
1. **qualify_lead** `{purpose, amount, tenure_months, employment, city, income_band}` → `{lead_id, prelim_eligibility, next_step, intent_flag}`
   - Quick policy: age band handled at KYC; city served? employment ∈ {SALARIED, SELF_EMPLOYED}; min amount.
   - `intent_flag`: purpose matching /medical|emergency/i → `FAST_TRACK`. Creates case record.
2. **record_consent** (issuer) `{lead_id, consent_text_version, accepted, channel, scopes?}` → `{consent_token, ts, hash, scopes, expires_at}`
   - accepted=true → issues HMAC token granting scopes (default all: CREDIT_BUREAU, BANK_STATEMENTS, KYC), TTL 900s.
   - Stores proof: hash + ts + channel + text version. accepted=false → no token.
3. **verify_kyc** `{lead_id, pan, name, dob?}` → `{kyc_status: PASS|RETRY|FAIL, kyc_hash, risk_flags[]}`
   - Deterministic by PAN. (Not consent-gated in this build — PAN name-match is pre-pull identity.)
4. **screen_fraud** `{lead_id, identifiers:{mobile, pan, device?}}` → `{verdict: CLEAR|REVIEW|BLOCK, signals[], score}`
5. **pull_bureau** ⚿ `{lead_id, consent_token, pan}` → `BureauReport{score, dpd_max_12m, dpd_max_24m, writeoff_24m, inquiries_6m, active_emi, tradelines[], reason_codes[]}`
   - requiredScope = CREDIT_BUREAU. Refusal FIRST line.
6. **fetch_bank_statements** ⚿ `{lead_id, consent_token, months}` → `BankSummary{avg_salary_credit, income_variance_pct, bounce_count, cash_withdrawal_ratio, net_surplus, employer_consistency, stability_index}`
   - requiredScope = BANK_STATEMENTS. Refusal FIRST line.
7. **compute_affordability** `{lead_id, requested_amount, tenure_months}` (reads stored bureau+bank) → `{net_income, existing_emi, proposed_emi, foir, dti, stability_index}`
8. **underwrite** `{lead_id}` (reads stored affordability+bureau) → `Decision{outcome: APPROVE|CONDITIONAL|DECLINE, max_amount, rate_band:{min,max}, tenure_range:{min,max}, score, reason_codes[], explanations[]}`
9. **generate_offers** `{lead_id}` (reads Decision + case flags) → `{offers: Offer[≤3], recommended_offer_id}` intent-aware ordering (FAST_TRACK → lowest EMI first).
10. **create_sanction_letter** `{lead_id, offer_id}` → `{url, hash, valid_till, letter_fields}` (HTML→PDF, SHA256 footer).
11. **log_audit_event** `{session_id, actor, event, payload, version}` → `{ack, seq}` (redacts PII before store; append-only).
12. **get_audit_trail** `{session_id, view: FULL|SUMMARY|COMPLIANCE_VIEW}` → `{events[], count}`

### Offer object (PDF p.7)
`{ offer_id, amount, tenure_months, roi_annual_pct, emi, processing_fee_pct, apr_pct, total_cost, valid_till, recommended, why_recommended }`

### Audit envelope (PDF p.7–8; PII redacted)
`{ session_id, seq, actor, event, payload:{...redacted}, version:{policy:"v1.7", score:"scorecard-2026-07", prompt:"uw_explainer_v1"}, ts }`

## CONSENT (src/lib/consent.ts) — signature feature
- scopes: `CREDIT_BUREAU | BANK_STATEMENTS | KYC`; TTL **900s**.
- Token = `base64url(JSON payload) + "." + HMAC-SHA256(payload, CONSENT_SECRET)`; payload `{jti, lead_id, scopes[], iat, exp, version}`.
- `validConsent(token, requiredScope, now?)` → `{ok:true}` OR `{ok:false, code}` where code ∈
  `CONSENT_REQUIRED` (missing/garbage) · `CONSENT_INVALID` (bad signature/tamper) · `CONSENT_EXPIRED` (now>exp) ·
  `SCOPE_NOT_GRANTED` (requiredScope ∉ scopes) · `CONSENT_REVOKED` (jti in revocation set).
- Gated handler pattern (FIRST line):
  ```ts
  const c = validConsent(input.consent_token, 'CREDIT_BUREAU');
  if (!c.ok) { store.audit('CONSENT_GATE_BLOCKED', ...); return { error: 'CONSENT_REQUIRED', code: c.code, hint: 'Call record_consent first and pass the returned consent_token' }; }
  ```
  (Guard NOT used — ExecutionContext has no tool input; see NITROSTACK_NOTES.md.)

## POLICY (src/lib/scorecard.ts, values from PDF p.9; editable, mirrored in policy Resource)
- `FOIR = (existing_emi + proposed_emi) / net_monthly_income`.
- Hard negatives → force **DECLINE**: bureau score < 680; DPD > 30 in 12m; write-off in 24m; inquiries > 6 in 6m;
  FOIR > 55%; employment ∉ {SALARIED, SELF_EMPLOYED}; city not served.
- Scorecard 0–100 (pre-baked weights) from: bureau score, FOIR headroom, DPD, inquiries, income stability, employment.
- Bands: **APPROVE ≥ 60 · CONDITIONAL 40–59 · DECLINE < 40** (hard negatives override to DECLINE).
- `max_amount = min(segment_cap_by_income_band, amount_permitted_by_FOIR(55%))`. CONDITIONAL = approve reduced amount.
- rate_band by score/risk (e.g. APPROVE 13.5–15.0, CONDITIONAL 15.99–18.0). tenure_range 12–48m.

## EMI (src/lib/emi.ts)
- Reducing balance: `r = roi_annual/12/100; emi = P·r·(1+r)^n / ((1+r)^n − 1)`, rounded to nearest ₹.
- APR includes processing fee. total_cost = emi·n + fees. Pin exact EMI for (₹3,00,000, 15.99%, 36m) in a unit test.

## REDACT (src/lib/redact.ts)
- Mask PAN (`ABCDE1234F`→`ABCXXXXXXF` style), mobile (`98XXXXXX22`), name (`P***a`). Applied to every audit payload.
  Assert `VITTA1235K` never appears verbatim in stored audit data.

## STORE (src/lib/store.ts)
- Module-level singleton, JSON-file-backed under `./data/` (gitignored). Namespaces: `cases`, `consents`,
  `audit` (append-only array + `seq` counter), `revocations`. Methods: `getCase/putCase`, `putConsent/getConsent/revoke`,
  `audit(actor,event,payload,version)`→seq, `trail(session_id,view)`. In-memory + debounced flush to disk.

## RESOURCES (5) — src/resources/
- `policy://credit-policy/v1.7` — eligibility rules, FOIR bands, hard negatives (mirrors scorecard.ts).
- `catalog://products/personal-loan` — ROI bands, processing fees, tenure grid.
- `ref://city-tiers` — served cities + tier → policy caps.
- `consent://templates` — versioned consent text registry.
- `case://{lead_id}` — LIVE application record (reads store; templated URI).

## PROMPTS (5) — src/prompts/
- `sales-playbook` (tone, mandatory APR/late-fee disclosure, cooling-off, non-coercive, HITL pause on CONDITIONAL/REVIEW),
- `underwriting-explainer` (reason_codes+features → plain text), `objection-handling` (rate/tenure/amount replies),
- `adverse-action-notice` (respectful compliant decline), `kyc-consent-script` (consent + data-use explanation).

## TESTS
- `tests/consent.test.ts` FIRST — 5 cases (none/expired/wrong-scope/tampered/valid).
- `tests/emi.test.ts` — pinned EMI value.
- `tests/seeds.test.ts` — demo PAN VITTA1235K → CONDITIONAL bureau profile; mapping table holds.
- `tests/goldenpath.test.ts` — drive full path in-process for APPROVE(…0) / CONDITIONAL(demo) / DECLINE(…9).
- `scripts/regress.ts` (`npm run regress`) — paths A APPROVE · B CONDITIONAL(demo) · C DECLINE+adverse ·
  D consent-refusal(judge probe) · E fraud REVIEW(suffix 99) · F objection-handling render. Prints PASS/FAIL, exit code.
