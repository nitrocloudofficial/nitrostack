/**
 * simulate.ts — the What-If Simulator (demo money-shot).
 * Re-runs affordability + underwriting with overridden levers (income, tenure,
 * existing EMI closed, amount) WITHOUT mutating the case. Proves the decisioning
 * is deterministic + explainable: same inputs, one lever moved, watch the
 * decision change with reasons.
 */
import { computeAffordability } from './affordability.js';
import { underwrite } from './scorecard.js';
import { resolveCity, resolveNetIncome } from './seeds.js';
import { store } from './store.js';
import type { Affordability, Decision } from './types.js';

export interface ScenarioInput {
  lead_id: string;
  /** Override monthly net income (₹), e.g. "what if my salary were 70,000?" */
  net_income?: number;
  /** Override tenure in months, e.g. "what about 48 months?" */
  tenure_months?: number;
  /** Override requested amount (₹) */
  requested_amount?: number;
  /** Simulate closing existing EMIs: subtract this ₹/month from current obligations */
  close_existing_emi?: number;
}

export interface ScenarioResult {
  baseline: { affordability: Affordability; decision: Decision };
  scenario: { affordability: Affordability; decision: Decision; levers: Record<string, number> };
  delta: {
    outcome_changed: boolean;
    outcome: string;
    max_amount_change: number;
    foir_change_pct: number;
    summary: string;
  };
}

export function simulateScenario(input: ScenarioInput): ScenarioResult {
  const rec = store.getCase(input.lead_id);
  if (!rec || !rec.bureau || !rec.bank || !rec.affordability || !rec.decision) {
    throw new Error('SIMULATE_PRECONDITION: run the path through underwrite first');
  }

  const baseAff = rec.affordability;
  const baseDec = rec.decision;
  const cap = resolveCity(rec.city ?? '').cap ?? 700000;

  // build the scenario inputs (levers override baseline)
  const levers: Record<string, number> = {};
  const net_income = input.net_income ?? resolveNetIncome(rec.mobile ?? '9000000000');
  if (input.net_income != null) levers.net_income = input.net_income;

  const tenure = input.tenure_months ?? rec.tenure_months ?? 36;
  if (input.tenure_months != null) levers.tenure_months = input.tenure_months;

  const amount = input.requested_amount ?? rec.amount ?? 0;
  if (input.requested_amount != null) levers.requested_amount = input.requested_amount;

  // closing existing EMIs → reduce bureau active_emi for the scenario
  const bureau = { ...rec.bureau };
  if (input.close_existing_emi != null && input.close_existing_emi > 0) {
    bureau.active_emi = Math.max(0, bureau.active_emi - input.close_existing_emi);
    levers.close_existing_emi = input.close_existing_emi;
  }

  const scenAff = computeAffordability({
    requested_amount: amount,
    tenure_months: tenure,
    bureau,
    bank: rec.bank,
    net_income,
  });
  const scenDec = underwrite({
    requested_amount: amount,
    tenure_months: tenure,
    employment: rec.employment ?? 'SALARIED',
    segment_cap: cap,
    bureau,
    affordability: scenAff,
  });

  const foirDelta = Math.round((scenAff.foir - baseAff.foir) * 1000) / 10;
  const amtDelta = scenDec.max_amount - baseDec.max_amount;
  const outcomeChanged = scenDec.outcome !== baseDec.outcome;

  const bits: string[] = [];
  if (outcomeChanged) bits.push(`Outcome moves ${baseDec.outcome} → ${scenDec.outcome}.`);
  if (amtDelta !== 0) bits.push(`Eligible amount ${amtDelta > 0 ? 'rises' : 'falls'} by ₹${Math.abs(amtDelta).toLocaleString('en-IN')} to ₹${scenDec.max_amount.toLocaleString('en-IN')}.`);
  if (foirDelta !== 0) bits.push(`FOIR moves ${Math.round(baseAff.foir * 100)}% → ${Math.round(scenAff.foir * 100)}%.`);
  if (!bits.length) bits.push('No change — this lever does not move the decision.');

  // audit the simulation (redacted, non-mutating)
  store.audit(rec.session_id, 'simulate_scenario', 'SCENARIO_SIMULATED', {
    lead_id: input.lead_id,
    levers,
    baseline_outcome: baseDec.outcome,
    scenario_outcome: scenDec.outcome,
  });

  return {
    baseline: { affordability: baseAff, decision: baseDec },
    scenario: { affordability: scenAff, decision: scenDec, levers },
    delta: {
      outcome_changed: outcomeChanged,
      outcome: scenDec.outcome,
      max_amount_change: amtDelta,
      foir_change_pct: foirDelta,
      summary: bits.join(' '),
    },
  };
}
