import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { ContextService } from '../context/context.service.js';

@Injectable({ deps: [ContextService] })
export class RecoveryService {
  constructor(private readonly contextService: ContextService) {}

  @Tool({
    name: 'recoveryGuidance',
    description: 'Generate recovery guidance for affected transaction',
    inputSchema: z.object({
      transactionId: z.string().describe('Transaction ID for recovery guidance')
    })
  })
  recoveryGuidance(input: { transactionId: string }, _ctx?: ExecutionContext): any {
    const context = this.contextService.getTrustContext(input.transactionId);
    
    // Generate pre-filled complaint draft based on context claims
    const sellerClaim = context.claims.find(c => c.source === 'payment.qrDirectionVerify' && c.type === 'SELLER_CLAIM');
    const paymentClaim = context.claims.find(c => c.source === 'payment.qrDirectionVerify' && c.type === 'QR_INTENT');
    
    const draft = `I was attempting a transaction where the seller claimed: "${sellerClaim?.description || 'N/A'}". However, the QR code provided was actually a request to ${paymentClaim?.description || 'PAY'}. Please block this transaction.`;

    const steps = [
      "1. Immediately call your bank's fraud helpline to block the transaction.",
      "2. Report the incident on the National Cyber Crime Reporting Portal (cybercrime.gov.in).",
      "3. Use the pre-filled draft below to file your complaint.",
      "4. Report the seller's profile on the marketplace."
    ];

    return {
      transactionId: input.transactionId,
      status: 'RECOVERY_INITIATED',
      actionableSteps: steps,
      preFilledComplaintDraft: draft,
      links: {
        cyberCrimePortal: 'https://cybercrime.gov.in',
        rbiGuidance: 'https://cms.rbi.org.in'
      }
    };
  }
}
