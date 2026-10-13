/**
 * advisory.tools.ts — the What-If Simulator + live reference-rate feed.
 * simulate_scenario: the demo money-shot — deterministic, explainable
 * counterfactuals ("what if my salary were ₹70k?") without mutating the case.
 */
import { ToolDecorator as Tool, ControllerDecorator as Controller, Widget, ExecutionContext, z } from '@nitrostack/core';
import { simulateScenario } from '../lib/simulate.js';
import { fetchReferenceRates } from '../lib/rates.js';
import { advanceApplication } from '../lib/engine.js';

@Controller()
export class AdvisoryTools {
  @Tool({
    name: 'advance_application',
    description:
      'FAST PATH: after record_consent, run the entire post-consent chain in ONE call — verify_kyc, screen_fraud, ' +
      'pull_bureau (consent-gated), fetch_bank_statements (consent-gated), compute_affordability, and underwrite — and ' +
      'return the decision. Use this right after consent instead of calling those six tools one by one. Refuses with ' +
      '{error:"CONSENT_REQUIRED"} if the consent_token is missing, wrong-scope, or issued for a different lead.',
    inputSchema: z.object({
      session_id: z.string().describe('Session id from qualify_lead.'),
      lead_id: z.string(),
      consent_token: z.string().describe('Token from record_consent.'),
      pan: z.string().describe('Applicant PAN.'),
      name: z.string().describe('Applicant full name (for KYC name-match).'),
      mobile: z.string().describe('Applicant mobile (for fraud screen).'),
      dob: z.string().optional(),
    }),
  })
  @Widget('underwriting-result')
  async advance_application(input: any, _ctx: ExecutionContext) {
    return advanceApplication(input);
  }

  @Tool({
    name: 'simulate_scenario',
    description:
      'What-If Simulator: re-run affordability + underwriting with one or two changed levers (net_income, tenure_months, requested_amount, close_existing_emi) WITHOUT changing the real application. Returns baseline vs scenario decisions and a plain-language delta (e.g. "close your ₹4,000 card EMI and the offer rises to ₹3L"). Use after underwrite, especially on CONDITIONAL or DECLINE, to show the applicant a constructive path.',
    inputSchema: z.object({
      session_id: z.string().describe('Session id from qualify_lead.'),
      lead_id: z.string(),
      net_income: z.number().optional().describe('Scenario monthly net income in INR (e.g. 70000).'),
      tenure_months: z.number().optional().describe('Scenario tenure in months (12–48).'),
      requested_amount: z.number().optional().describe('Scenario loan amount in INR.'),
      close_existing_emi: z.number().optional().describe('₹/month of existing EMIs the applicant would close before this loan.'),
    }),
  })
  @Widget('scenario-compare')
  async simulate_scenario(input: any, _ctx: ExecutionContext) {
    return simulateScenario(input);
  }

  @Tool({
    name: 'get_reference_rates',
    description:
      'LIVE external data: fetch current INR reference FX rates (Frankfurter/ECB free API) plus the policy rate context our ROI bands are set against. Falls back to a cached snapshot if offline, so it always answers.',
    inputSchema: z.object({}),
  })
  async get_reference_rates(_input: any, _ctx: ExecutionContext) {
    return fetchReferenceRates();
  }
}
