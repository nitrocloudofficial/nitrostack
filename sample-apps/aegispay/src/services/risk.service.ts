// risk.service.ts — Deterministic risk engine. Zero I/O. Zero LLM calls.
//
// Runs every rule against a RiskContext, collects flags, and derives
// a DecisionTier. This is the enforcement core of AegisPay.
//
// LOQ owns this file. Do not edit outside the LOQ zone (see TEAM.md S3).

import type {
  RiskContext,
  RiskAssessment,
  RiskFlag,
  DecisionTier,
} from '../types/contracts.js';

import { ALL_RULES } from './risk.rules.js';

// ---------------------------------------------------------------------------
// Tier derivation
//
//   no flags & under autoLimit        -> AUTO
//   any medium flag, or over autoLimit -> SINGLE_APPROVAL
//   any high flag, or over dualLimit   -> DUAL_APPROVAL
//   any DENY_LIST flag                 -> BLOCKED (terminal)
// ---------------------------------------------------------------------------

export function deriveTier(
  flags: RiskFlag[],
  amount: number,
  autoLimit: number,
  dualLimit: number,
): DecisionTier {
  // DENY_LIST is terminal — no approval token can ever be minted.
  if (flags.some((f) => f.ruleId === 'DENY_LIST')) return 'BLOCKED';

  // Any HIGH flag -> DUAL_APPROVAL
  if (flags.some((f) => f.severity === 'high')) return 'DUAL_APPROVAL';

  // Amount above dual limit -> DUAL_APPROVAL
  if (amount > dualLimit) return 'DUAL_APPROVAL';

  // Any MEDIUM flag -> SINGLE_APPROVAL
  if (flags.some((f) => f.severity === 'medium')) return 'SINGLE_APPROVAL';

  // Amount above auto limit -> SINGLE_APPROVAL
  if (amount > autoLimit) return 'SINGLE_APPROVAL';

  return 'AUTO';
}

// ---------------------------------------------------------------------------
// Engine — runs all rules and returns the full assessment
// ---------------------------------------------------------------------------

export function assessRisk(ctx: RiskContext): RiskAssessment {
  const flags: RiskFlag[] = [];

  for (const rule of ALL_RULES) {
    const flag = rule(ctx);
    if (flag !== null) {
      flags.push(flag);
    }
  }

  const tier = deriveTier(
    flags,
    ctx.invoice.amount,
    ctx.thresholds.autoLimit,
    ctx.thresholds.dualLimit,
  );

  return {
    invoiceId: ctx.invoice.id,
    flags,
    tier,
  };
}
