/**
 * document.tools.ts — MCP tool 10 (create_sanction_letter).
 * Merges T&Cs + amortization, system-signs, returns a downloadable letter + SHA256 hash.
 */
import { ToolDecorator as Tool, ControllerDecorator as Controller, Widget, ExecutionContext, z } from '@nitrostack/core';
import { createSanctionStep } from '../lib/engine.js';

@Controller()
export class DocumentTools {
  @Tool({
    name: 'create_sanction_letter',
    description:
      'Generate a signed sanction letter for a chosen offer: borrower + amount + EMI/APR, first-EMI date, a 3-row amortization preview, 3-day cooling-off notice, a mock e-sign line, and a SHA256 integrity hash. Returns a downloadable url. Only after the applicant accepts an offer.',
    inputSchema: z.object({
      session_id: z.string().describe('Session id from qualify_lead.'),
      lead_id: z.string(),
      offer_id: z.string().describe('offer_id chosen from generate_offers.'),
    }),
  })
  @Widget('sanction-letter')
  async create_sanction_letter(input: any, ctx: ExecutionContext) {
    return createSanctionStep(input);
  }
}
