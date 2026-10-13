/**
 * TOOL 4: check_delay_compensation
 * 
 * R4 logic: Banks must settle within 15 calendar days.
 * If exceeded and delay is attributable to the bank, compensation is interest at Bank Rate + 4% per annum.
 * Locker delays attract INR 5,000 per day.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const CheckDelayCompensationInputSchema = z.object({
  daysSinceCompleteDocumentsSubmitted: z.number().positive(),
  claimAmountInr: z.number().positive(),
  isLockerClaim: z.boolean().default(false),
  currentBankRatePercent: z.number().default(6.0),
});

export interface CheckDelayCompensationOutput {
  isBreached: boolean;
  daysOverdue: number;
  compensationOwedInr: number;
  formula: string;
  legalBasis: string;
  howToClaimIt: string;
  confidence: 'regulatory';
  importantNote: string;
}

export class CheckDelayCompensationTool {
  @Tool({
    name: 'check_delay_compensation',
    description:
      'Calculates compensation owed if a bank has breached the 15-day settlement deadline (R4). For deposit claims, compensation is interest at Bank Rate + 4% per annum on the settlement amount for the delay period. For locker claims, INR 5,000 per day. Note: "attributable to the bank" is a factual question the bank may contest.',
    inputSchema: CheckDelayCompensationInputSchema,
  })
  async execute(
    input: z.infer<typeof CheckDelayCompensationInputSchema>,
    ctx: ExecutionContext
  ): Promise<CheckDelayCompensationOutput> {
    const { daysSinceCompleteDocumentsSubmitted, claimAmountInr, isLockerClaim, currentBankRatePercent } = input;

    const statutoryDeadlineDays = 15;
    const daysOverdue = Math.max(0, daysSinceCompleteDocumentsSubmitted - statutoryDeadlineDays);
    const isBreached = daysOverdue > 0;

    let compensationOwedInr = 0;
    let formula = '';

    if (isLockerClaim) {
      // Locker delays: INR 5,000 per day
      compensationOwedInr = daysOverdue * 5000;
      formula = `INR 5,000 × ${daysOverdue} days = INR ${compensationOwedInr}`;
    } else {
      // Deposit claims: (Bank Rate + 4%) × claim amount × (days overdue / 365)
      const interestRatePercent = currentBankRatePercent + 4;
      compensationOwedInr = Math.round((interestRatePercent / 100) * claimAmountInr * (daysOverdue / 365));
      formula = `(${currentBankRatePercent}% + 4%) × INR ${claimAmountInr} × (${daysOverdue} / 365) = INR ${compensationOwedInr}`;
    }

    const howToClaimIt = isBreached
      ? `1. Write to the bank with a formal demand letter citing RBI Directions 2025 (R4).
2. Attach proof of document submission (receipt, email confirmation, etc.).
3. Attach proof of the delay (bank's own records, if available).
4. Request compensation of INR ${compensationOwedInr} plus interest from the date of demand.
5. If the bank refuses, escalate to the RBI Ombudsman (https://www.rbi.org.in/Scripts/ombudsman.aspx).
6. The RBI Ombudsman can direct the bank to pay compensation.`
      : 'No compensation is owed. The bank has settled within the 15-day deadline.';

    return {
      isBreached,
      daysOverdue,
      compensationOwedInr,
      formula,
      legalBasis: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025 (R4)',
      howToClaimIt,
      confidence: 'regulatory',
      importantNote:
        'This calculation assumes the delay is attributable to the bank. If the delay was caused by incomplete documents, missing signatures, or other issues on the claimant\'s side, the bank may not owe compensation. Consult a lawyer if the bank contests the claim.',
    };
  }
}
