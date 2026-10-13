import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { ClaimInput } from '../../shared/trust-context.interface.js';

@Injectable()
export class PaymentService {
  
  @Tool({
    name: 'qrDirectionVerify',
    description: 'Decode QR code and verify payment direction',
    inputSchema: z.object({
      qrPayload: z.string().describe('Raw QR code payload string (e.g. upi://pay?pa=...)'),
      sellerClaim: z.string().describe('What the seller claims the QR is for')
    })
  })
  async qrDirectionVerify(input: { qrPayload: string; sellerClaim: string }, _ctx?: ExecutionContext): Promise<ClaimInput[]> {
    const decodedPayload = input.qrPayload || await this.decodeQR('mock');
    
    // Check if it's upi://pay or upi://collect
    const isPayRequest = decodedPayload.includes('upi://pay');
    const claimRefund = input.sellerClaim.toLowerCase().includes('refund');
    
    // Extract UPI ID and amount from payload
    const upiIdMatch = decodedPayload.match(/pa=([^&]+)/);
    const amountMatch = decodedPayload.match(/am=([^&]+)/);
    const upiId = upiIdMatch ? upiIdMatch[1] : 'unknown';
    const amount = amountMatch ? amountMatch[1] : 'unknown';

    const claims: ClaimInput[] = [];

    claims.push({
      source: 'payment.qrDirectionVerify',
      type: 'SELLER_CLAIM',
      fact: 'seller_claimed_transaction_type',
      value: claimRefund ? 'REFUND' : 'PAYMENT',
      description: `Seller claims: "${input.sellerClaim}" (implies refund: ${claimRefund})`,
      severity: 'INFO'
    });

    claims.push({
      source: 'payment.qrDirectionVerify',
      type: 'QR_INTENT',
      fact: 'qr_payload_mode',
      value: isPayRequest ? 'PAY' : 'COLLECT',
      description: `QR code payload requests money (isPayRequest: ${isPayRequest}). UPI ID: ${upiId}, Amount: ₹${amount}`,
      severity: isPayRequest ? 'HIGH' : 'LOW'
    });

    if (isPayRequest && claimRefund) {
      claims.push({
        source: 'payment.qrDirectionVerify',
        type: 'QR_INVERSION',
        fact: 'qr_claim_mismatch',
        value: `QR requests PAYMENT but seller claims REFUND`,
        description: 'Semantic Inversion: Seller claims refund, but QR explicitly requests payment.',
        severity: 'CRITICAL'
      });
    }

    return claims;
  }

  private async decodeQR(imageBase64: string): Promise<string> {
    // For MVP, mock with a hardcoded pay request to demonstrate deterministic logic
    return 'upi://pay?pa=scammer@upi&am=2000';
  }
}
