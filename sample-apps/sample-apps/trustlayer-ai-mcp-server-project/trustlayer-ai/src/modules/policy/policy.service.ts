import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { ContextService } from '../context/context.service.js';
import { TrustContext } from '../../shared/trust-context.interface.js';

@Injectable({ deps: [ContextService] })
export class PolicyService {
  constructor(private readonly contextService: ContextService) {}

  @Tool({
    name: 'decide',
    description: 'Evaluate evidence fusion and issue policy decision for transaction',
    inputSchema: z.object({
      transactionId: z.string().describe('Transaction ID to decide upon')
    })
  })
  decide(input: { transactionId: string }, _ctx?: ExecutionContext): { decision: string; posterior: number; context: TrustContext } {
    const context = this.contextService.getTrustContext(input.transactionId);
    this.contextService.getContradictions(input.transactionId);

    // 3. Multiplicative Evidence Fusion with Time Decay
    let compositeRisk = 0;
    if (context.claims.length > 0) {
      const now = Date.now();
      const nonRiskProduct = context.claims.reduce((product, claim) => {
        // Calculate age in hours
        const ageMs = Math.max(0, now - claim.ts);
        const ageHours = ageMs / (1000 * 60 * 60);
        
        // Decay by 5% per hour, floor at 0.2
        const timeWeight = Math.max(0.2, 1 - (ageHours * 0.05));
        const finalWeight = (claim.weight ?? 1.0) * timeWeight;
        
        return product * (1 - (claim.strength * finalWeight));
      }, 1.0);
      compositeRisk = 1 - nonRiskProduct;
    }

    const hasContradicts = context.corroborations.some(c => c.relation === 'CONTRADICTS');
    if (hasContradicts) {
      compositeRisk = Math.min(compositeRisk + 0.15, 0.99);
    }

    // Handle Risk Mitigations (e.g. Possession Verified via Camera OCR)
    const possessionVerifiedClaim = context.claims.find(c => c.fact === 'possession_verified' && c.value === true);
    if (possessionVerifiedClaim) {
      const mitigationFactor = possessionVerifiedClaim.strength ?? 0.85;
      compositeRisk = Math.max(0.05, compositeRisk * (1 - mitigationFactor));
      console.log(`[PolicyService] Risk mitigated by possession_verified claim. New posterior risk: ${Math.round(compositeRisk * 100)}%`);
    }

    // 4. Adversarial Self-Check (Benign Explanation)
    // Only soften risk if a benign explanation was explicitly confirmed
    if (compositeRisk > 0.60 && context.benignExplanationChecked) {
      // Keep compositeRisk as calculated unless benign explanation is explicitly verified
    }

    // 5. Update posterior and benignExplanationChecked flag
    context.posterior = compositeRisk;
    context.benignExplanationChecked = true;

    // 6. Map the final posterior to a decision string
    let decision = 'PROCEED';
    if (compositeRisk < 0.20) {
      decision = 'PROCEED';
    } else if (compositeRisk >= 0.20 && compositeRisk < 0.40) {
      decision = 'CAUTION';
    } else if (compositeRisk >= 0.40 && compositeRisk < 0.60) {
      decision = 'REQUEST_VERIFICATION';
    } else if (compositeRisk >= 0.60 && compositeRisk <= 0.80) {
      decision = 'DO_NOT_PAY';
    } else {
      decision = 'ABORT_RECOMMENDED';
    }

    // 7. Save decision and return
    context.decision = decision;

    return {
      decision,
      posterior: compositeRisk,
      context
    };
  }
}
