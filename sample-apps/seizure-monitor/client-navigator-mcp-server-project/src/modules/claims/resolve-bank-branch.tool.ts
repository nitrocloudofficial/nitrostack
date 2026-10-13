/**
 * TOOL 5: resolve_bank_branch
 * 
 * IFSC lookup via Razorpay IFSC API (live, public, no API key).
 * Non-blocking; graceful 404 handling.
 * Validates IFSC format before calling.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const ResolveBankBranchInputSchema = z.object({
  ifsc: z.string().length(11).toUpperCase(),
});

export interface ResolveBankBranchOutput {
  available: boolean;
  bank?: string;
  branch?: string;
  address?: string;
  district?: string;
  state?: string;
  contact?: string;
  source: string;
  reason?: string;
}

export class ResolveBankBranchTool {
  @Tool({
    name: 'resolve_bank_branch',
    description:
      'Resolves a bank branch from an IFSC code using the Razorpay IFSC API (live, public, no API key). Returns bank name, branch, address, district, state, and contact. Non-blocking; returns gracefully on 404 or network failure.',
    inputSchema: ResolveBankBranchInputSchema,
  })
  async execute(
    input: z.infer<typeof ResolveBankBranchInputSchema>,
    ctx: ExecutionContext
  ): Promise<ResolveBankBranchOutput> {
    const { ifsc } = input;

    // Validate IFSC format: 11 characters, first 4 are letters, last 7 are alphanumeric
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc)) {
      return {
        available: false,
        source: 'Local validation',
        reason: `Invalid IFSC format: ${ifsc}. IFSC must be 11 characters: 4 letters + 0 + 6 alphanumeric.`,
      };
    }

    try {
      // Call Razorpay IFSC API
      const url = `https://ifsc.razorpay.com/${ifsc}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            available: false,
            source: 'Razorpay IFSC API (live)',
            reason: `IFSC code ${ifsc} not found in Razorpay database.`,
          };
        }
        return {
          available: false,
          source: 'Razorpay IFSC API (live)',
          reason: `API returned status ${response.status}.`,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;
      clearTimeout(timeoutId);

      return {
        available: true,
        bank: (data.BANK as string) || undefined,
        branch: (data.BRANCH as string) || undefined,
        address: (data.ADDRESS as string) || undefined,
        district: (data.DISTRICT as string) || undefined,
        state: (data.STATE as string) || undefined,
        contact: (data.CONTACT as string) || undefined,
        source: 'Razorpay IFSC API (live)',
      };
    } catch (error) {
      // Non-blocking: return gracefully on network failure
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        available: false,
        source: 'Razorpay IFSC API (live)',
        reason: `Network error: ${errorMessage}. The IFSC lookup is non-blocking; the rest of the answer will render normally.`,
      };
    }
  }
}
