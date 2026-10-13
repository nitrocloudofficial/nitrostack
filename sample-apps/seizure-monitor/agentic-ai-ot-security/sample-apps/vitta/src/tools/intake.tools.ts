/**
 * intake.tools.ts — MCP tools 1–6 (qualify → consent → KYC → fraud → bureau ⚿ → bank ⚿).
 * Thin decorator wrappers over src/lib/engine.ts (single source of truth).
 * Gated tools (⚿) enforce consent as the FIRST line inside the engine.
 */
import { ToolDecorator as Tool, ControllerDecorator as Controller, ExecutionContext, z } from '@nitrostack/core';
import {
  qualifyLead, recordConsent, verifyKyc, screenFraud, pullBureau, fetchBankStatements,
} from '../lib/engine.js';

const SESSION = z.string().describe('Session id from qualify_lead — reuse the SAME value for every tool call in this application.');

@Controller()
export class IntakeTools {
  @Tool({
    name: 'qualify_lead',
    description:
      'Start a loan application: capture intent (purpose, amount, tenure, employment, city) and run quick eligibility. Returns a lead_id and a session_id you MUST reuse for every later tool call. Detects medical/emergency intent as FAST_TRACK.',
    inputSchema: z.object({
      session_id: z.string().optional().describe('Optional; a new one is generated and returned if omitted.'),
      purpose: z.string().describe('Why the loan is needed, e.g. "medical emergency", "home renovation".'),
      amount: z.number().describe('Requested loan amount in INR.'),
      tenure_months: z.number().describe('Requested tenure in months (12–48).'),
      employment: z.enum(['SALARIED', 'SELF_EMPLOYED']).describe('Employment type.'),
      city: z.string().describe('Applicant city (serviceability is checked).'),
      income_band: z.string().optional().describe('Self-declared monthly income band, e.g. "50k-75k".'),
    }),
  })
  async qualify_lead(input: any, ctx: ExecutionContext) {
    const session_id = input.session_id || `sess-${Date.now().toString(36)}`;
    const r = qualifyLead({ ...input, session_id });
    return { session_id, ...r };
  }

  @Tool({
    name: 'record_consent',
    description:
      'Capture explicit, versioned, timestamped DPDP consent and ISSUE the consent_token that unlocks data-pull tools (also returns jti for revoke_consent). Call this BEFORE pull_bureau or fetch_bank_statements. IMPORTANT: only call with accepted=true AFTER the human has explicitly agreed in this conversation — never assume or pre-fill consent on their behalf. If accepted=false, no token is issued and those tools will refuse.',
    inputSchema: z.object({
      session_id: SESSION,
      lead_id: z.string().describe('lead_id from qualify_lead.'),
      consent_text_version: z.string().describe('Version id of the consent text shown to the applicant.'),
      accepted: z.boolean().describe('Whether the applicant explicitly accepted.'),
      channel: z.string().describe('Channel of consent, e.g. "web", "whatsapp".'),
      scopes: z.array(z.enum(['CREDIT_BUREAU', 'BANK_STATEMENTS', 'KYC'])).optional()
        .describe('Data scopes consented to. Defaults to all three.'),
    }),
  })
  async record_consent(input: any, ctx: ExecutionContext) {
    return recordConsent(input);
  }

  @Tool({
    name: 'verify_kyc',
    description: 'PAN name-match + CKYC alignment (mock). Returns PASS / RETRY / FAIL, a kyc_hash, and any risk flags.',
    inputSchema: z.object({
      session_id: SESSION,
      lead_id: z.string(),
      pan: z.string().describe('PAN, format ABCDE1234F.'),
      name: z.string().describe('Applicant full name for name-match.'),
      dob: z.string().optional().describe('Date of birth (optional).'),
    }),
  })
  async verify_kyc(input: any, ctx: ExecutionContext) {
    return verifyKyc(input);
  }

  @Tool({
    name: 'screen_fraud',
    description:
      'Fraud, velocity and AML/PEP watchlist screening (mock). Returns CLEAR / REVIEW / BLOCK with signals and a score. A REVIEW verdict should pause for human handoff.',
    inputSchema: z.object({
      session_id: SESSION,
      lead_id: z.string(),
      identifiers: z.object({
        mobile: z.string().describe('Applicant mobile number.'),
        pan: z.string().optional(),
        device: z.string().optional(),
      }),
    }),
  })
  async screen_fraud(input: any, ctx: ExecutionContext) {
    return screenFraud(input);
  }

  @Tool({
    name: 'pull_bureau',
    description:
      'CONSENT-GATED. Pull the credit bureau report (score, DPD, write-offs, inquiries, active EMIs). Refuses with {error:"CONSENT_REQUIRED"} unless a valid consent_token granting CREDIT_BUREAU scope is passed.',
    inputSchema: z.object({
      session_id: SESSION,
      lead_id: z.string(),
      consent_token: z.string().describe('Token from record_consent (CREDIT_BUREAU scope). Required.'),
      pan: z.string(),
    }),
  })
  async pull_bureau(input: any, ctx: ExecutionContext) {
    return pullBureau(input);
  }

  @Tool({
    name: 'fetch_bank_statements',
    description:
      'CONSENT-GATED. Fetch 12-month bank/Account-Aggregator cashflow summary (salary credits, variance, bounces, surplus, stability). Refuses with {error:"CONSENT_REQUIRED"} unless a valid consent_token granting BANK_STATEMENTS scope is passed.',
    inputSchema: z.object({
      session_id: SESSION,
      lead_id: z.string(),
      consent_token: z.string().describe('Token from record_consent (BANK_STATEMENTS scope). Required.'),
      months: z.number().optional().describe('Months of history (default 12).'),
    }),
  })
  async fetch_bank_statements(input: any, ctx: ExecutionContext) {
    return fetchBankStatements(input);
  }
}
