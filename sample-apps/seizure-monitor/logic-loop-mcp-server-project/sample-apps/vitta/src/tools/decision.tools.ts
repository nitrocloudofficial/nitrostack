/**
 * decision.tools.ts — MCP tools 7–9 (affordability → underwrite → offers).
 * Thin wrappers over engine. Underwriting is rules + scorecard + reason codes
 * (never trained ML — CLAUDE.md rule 8).
 */
import { ToolDecorator as Tool, ControllerDecorator as Controller, Widget, ExecutionContext, z } from '@nitrostack/core';
import { computeAffordabilityStep, underwriteStep, generateOffersStep } from '../lib/engine.js';

const SESSION = z.string().describe('Session id from qualify_lead — reuse for every call.');

@Controller()
export class DecisionTools {
  @Tool({
    name: 'compute_affordability',
    description:
      'Compute net income, proposed EMI, FOIR and DTI from the pulled bureau + bank data. Run after pull_bureau and fetch_bank_statements.',
    inputSchema: z.object({
      session_id: SESSION,
      lead_id: z.string(),
      requested_amount: z.number().optional().describe('Defaults to the amount from qualify_lead.'),
      tenure_months: z.number().optional(),
    }),
  })
  async compute_affordability(input: any, ctx: ExecutionContext) {
    return computeAffordabilityStep(input);
  }

  @Tool({
    name: 'underwrite',
    description:
      'Explainable underwriting: hard negatives + FOIR cap + a pre-baked scorecard → APPROVE / CONDITIONAL / DECLINE, with reason_codes and borrower-friendly explanations. CONDITIONAL should pause for human review before generate_offers.',
    inputSchema: z.object({
      session_id: SESSION,
      lead_id: z.string(),
    }),
  })
  @Widget('underwriting-result')
  async underwrite(input: any, ctx: ExecutionContext) {
    return underwriteStep(input);
  }

  @Tool({
    name: 'generate_offers',
    description:
      'Produce up to 3 priced offers (amount, ROI, EMI, APR, total cost) with a recommended flag. Intent-aware: FAST_TRACK (medical/emergency) surfaces the lowest-EMI offer first. Only runs after an APPROVE or CONDITIONAL decision.',
    inputSchema: z.object({
      session_id: SESSION,
      lead_id: z.string(),
    }),
  })
  @Widget('offer-comparison')
  async generate_offers(input: any, ctx: ExecutionContext) {
    return generateOffersStep(input);
  }
}
