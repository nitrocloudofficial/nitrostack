/**
 * simulate.test.ts — What-If Simulator: deterministic counterfactuals,
 * no case mutation, demo money-shot pinned.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../src/lib/store.js';
import {
  qualifyLead, recordConsent, verifyKyc, screenFraud, pullBureau, fetchBankStatements,
  computeAffordabilityStep, underwriteStep,
} from '../src/lib/engine.js';
import { simulateScenario } from '../src/lib/simulate.js';

function runToUnderwrite(session_id: string) {
  const q = qualifyLead({ session_id, purpose: 'medical emergency', amount: 300000, tenure_months: 36, employment: 'SALARIED', city: 'Kochi' });
  const c = recordConsent({ session_id, lead_id: q.lead_id, consent_text_version: 'consent-v3', accepted: true, channel: 'web' });
  if (!c.accepted) throw new Error('consent');
  verifyKyc({ session_id, lead_id: q.lead_id, pan: 'VITTA1235K', name: 'Priya Sharma' });
  screenFraud({ session_id, lead_id: q.lead_id, identifiers: { mobile: '9876543222' } });
  pullBureau({ session_id, lead_id: q.lead_id, consent_token: c.consent_token, pan: 'VITTA1235K' });
  fetchBankStatements({ session_id, lead_id: q.lead_id, consent_token: c.consent_token });
  computeAffordabilityStep({ session_id, lead_id: q.lead_id });
  underwriteStep({ session_id, lead_id: q.lead_id });
  return q.lead_id;
}

beforeEach(() => store._resetAll());

describe('what-if simulator', () => {
  it('baseline CONDITIONAL — closing all ₹25k EMIs flips to APPROVE at full ₹3L', () => {
    const lead_id = runToUnderwrite('sim-1');
    const r = simulateScenario({ lead_id, close_existing_emi: 25000 });
    expect(r.baseline.decision.outcome).toBe('CONDITIONAL');
    expect(r.scenario.decision.outcome).toBe('APPROVE');
    expect(r.scenario.decision.max_amount).toBe(300000);
    expect(r.delta.outcome_changed).toBe(true);
    expect(r.delta.summary).toMatch(/CONDITIONAL → APPROVE/);
  });

  it('closing only ₹14k unlocks the FULL ₹3L but keeps human review (CONDITIONAL)', () => {
    const lead_id = runToUnderwrite('sim-1b');
    const r = simulateScenario({ lead_id, close_existing_emi: 14000 });
    expect(r.scenario.decision.outcome).toBe('CONDITIONAL');
    expect(r.scenario.decision.max_amount).toBe(300000); // amount unlocked
    expect(r.delta.max_amount_change).toBe(50000);
  });

  it('higher income lever raises the eligible amount', () => {
    const lead_id = runToUnderwrite('sim-2');
    const r = simulateScenario({ lead_id, net_income: 90000 });
    expect(r.scenario.decision.max_amount).toBeGreaterThan(r.baseline.decision.max_amount);
    expect(r.scenario.affordability.foir).toBeLessThan(r.baseline.affordability.foir);
  });

  it('does NOT mutate the stored case (pure counterfactual)', () => {
    const lead_id = runToUnderwrite('sim-3');
    const before = JSON.stringify(store.getCase(lead_id)!.decision);
    simulateScenario({ lead_id, close_existing_emi: 14000, net_income: 90000 });
    const after = JSON.stringify(store.getCase(lead_id)!.decision);
    expect(after).toBe(before);
  });

  it('longer tenure lowers proposed EMI in the scenario', () => {
    const lead_id = runToUnderwrite('sim-4');
    const r = simulateScenario({ lead_id, tenure_months: 48 });
    expect(r.scenario.affordability.proposed_emi).toBeLessThan(r.baseline.affordability.proposed_emi);
  });
});
