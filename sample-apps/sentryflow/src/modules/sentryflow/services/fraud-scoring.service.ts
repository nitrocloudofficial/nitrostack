/**
 * FraudScoringService
 * 
 * Computes fraud confidence from named, inspectable signals.
 * Includes a fairness check that actively looks for reasons to CLEAR the buyer.
 */

import { Injectable } from '@nitrostack/core';
import { PackageLog, OrderMeta, FraudSignal, FraudScoreResult } from '../sentryflow.types.js';

@Injectable()
export class FraudScoringService {
  /**
   * Score an incident based on dispatch/return logs and order metadata.
   * Returns a score (0-100) and the individual signals that contributed to it.
   */
  scoreIncident(
    dispatch: PackageLog,
    returned: PackageLog,
    orderMeta: OrderMeta,
  ): FraudScoreResult {
    const signals: FraudSignal[] = [];

    // Signal 1: Weight mismatch (55% weight)
    // Core fraud indicator: significant weight loss between dispatch and return
    const weightLossPct = ((dispatch.weightGrams - returned.weightGrams) / dispatch.weightGrams) * 100;
    const weightMismatchTriggered = weightLossPct > 30;
    signals.push({
      name: 'weight_mismatch',
      weight: 0.55,
      triggered: weightMismatchTriggered,
      detail: `Dispatched ${dispatch.weightGrams}g, returned ${returned.weightGrams}g (${weightLossPct.toFixed(1)}% loss)`,
    });

    // Signal 2: Return velocity (25% weight)
    // High return rate on account suggests pattern of abuse
    const returnVelocityTriggered = orderMeta.accountReturnRate90d > 0.4;
    signals.push({
      name: 'return_velocity',
      weight: 0.25,
      triggered: returnVelocityTriggered,
      detail: `Account return rate (90d): ${(orderMeta.accountReturnRate90d * 100).toFixed(0)}%`,
    });

    // Signal 3: Courier seal flag (20% weight)
    // Courier notes indicate suspicious packaging condition
    const courierSealTriggered = returned.courierNotes.includes('seal_intact_but_light');
    signals.push({
      name: 'courier_seal_flag',
      weight: 0.2,
      triggered: courierSealTriggered,
      detail: returned.courierNotes,
    });

    // Signal 4: Legitimate return indicator (−30% weight)
    // FAIRNESS CHECK: actively looks for reasons the buyer might be legitimate.
    // If this SKU has had multiple damage complaints from OTHER buyers in 90d,
    // it suggests a product quality issue, not buyer fraud.
    // This REDUCES confidence rather than adding it — a fraud bot that only
    // accumulates evidence against the buyer is weaker than one that tries to
    // clear them first.
    const legitimateReturnTriggered = orderMeta.priorDamageComplaintsThisSku > 2;
    signals.push({
      name: 'legitimate_return_indicator',
      weight: -0.3,
      triggered: legitimateReturnTriggered,
      detail:
        orderMeta.priorDamageComplaintsThisSku > 2
          ? `${orderMeta.priorDamageComplaintsThisSku} other buyers reported this exact SKU arriving damaged in 90d — suggests product quality issue, not buyer fraud`
          : 'No pattern of SKU-level damage complaints',
    });

    // Compute final score: sum of (weight × triggered) for each signal
    const rawScore = signals.reduce((sum, s) => sum + (s.triggered ? s.weight : 0), 0);
    const finalScore = Math.max(0, Math.round(rawScore * 100));

    return {
      score: finalScore,
      signals,
    };
  }
}
