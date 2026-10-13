/**
 * regress.ts — edge-path regression harness (PLAN.md §5 Phase 8).
 * Runs all six paths in-process and prints PASS/FAIL. Exit code != 0 on any fail.
 *   A APPROVE (PAN …0)         B CONDITIONAL demo (VITTA1235K)  C DECLINE + adverse (PAN …9)
 *   D consent-gate refusal      E fraud REVIEW (mobile …99)      F objection-handling render
 *
 * Run: npm run regress
 */
import { store } from '../src/lib/store.js';
import {
  qualifyLead, recordConsent, verifyKyc, screenFraud, pullBureau, fetchBankStatements,
  computeAffordabilityStep, underwriteStep, generateOffersStep, createSanctionStep,
} from '../src/lib/engine.js';
import { VittaPrompts } from '../src/prompts/vitta.prompts.js';
import type { ConsentRefusal } from '../src/lib/types.js';

const results: { path: string; ok: boolean; detail: string }[] = [];
function check(path: string, ok: boolean, detail: string) {
  results.push({ path, ok, detail });
}
function isRefusal(x: unknown): x is ConsentRefusal {
  return !!x && typeof x === 'object' && (x as any).error === 'CONSENT_REQUIRED';
}

function fullPath(session_id: string, pan: string, mobile: string, city: string, purpose: string) {
  const q = qualifyLead({ session_id, purpose, amount: 300000, tenure_months: 36, employment: 'SALARIED', city });
  const c = recordConsent({ session_id, lead_id: q.lead_id, consent_text_version: 'consent-v3', accepted: true, channel: 'web' });
  if (!c.accepted) throw new Error('consent failed');
  verifyKyc({ session_id, lead_id: q.lead_id, pan, name: 'Test Applicant' });
  const fraud = screenFraud({ session_id, lead_id: q.lead_id, identifiers: { mobile, pan } });
  const b = pullBureau({ session_id, lead_id: q.lead_id, consent_token: c.consent_token, pan });
  if (isRefusal(b)) throw new Error('unexpected consent refusal');
  fetchBankStatements({ session_id, lead_id: q.lead_id, consent_token: c.consent_token, months: 12 });
  const aff = computeAffordabilityStep({ session_id, lead_id: q.lead_id });
  const decision = underwriteStep({ session_id, lead_id: q.lead_id });
  const offers = generateOffersStep({ session_id, lead_id: q.lead_id });
  return { lead_id: q.lead_id, fraud, aff, decision, offers, intent: q.intent_flag };
}

function main() {
  store._resetAll();

  // A — APPROVE
  try {
    const r = fullPath('rg-A', 'AAAPA1230A', '9000000010', 'Mumbai', 'home renovation');
    check('A APPROVE (PAN …0)', r.decision.outcome === 'APPROVE' && r.offers.offers.length === 3,
      `outcome=${r.decision.outcome} amount=${r.decision.max_amount} offers=${r.offers.offers.length}`);
  } catch (e: any) { check('A APPROVE (PAN …0)', false, e.message); }

  // B — CONDITIONAL demo
  try {
    const r = fullPath('rg-B', 'VITTA1235K', '9876543222', 'Kochi', 'medical emergency');
    const sanction = createSanctionStep({ session_id: 'rg-B', lead_id: r.lead_id, offer_id: r.offers.recommended_offer_id });
    const ok = r.decision.outcome === 'CONDITIONAL' && r.decision.max_amount === 250000
      && Math.round(r.aff.foir * 100) === 57 && 'hash' in sanction;
    check('B CONDITIONAL demo (VITTA1235K)', ok,
      `outcome=${r.decision.outcome} amount=${r.decision.max_amount} foir=${Math.round(r.aff.foir * 100)}% intent=${r.intent}`);
  } catch (e: any) { check('B CONDITIONAL demo (VITTA1235K)', false, e.message); }

  // C — DECLINE + adverse action content
  try {
    const r = fullPath('rg-C', 'ZZZPZ1239Z', '9000000010', 'Mumbai', 'home renovation');
    const ok = r.decision.outcome === 'DECLINE' && r.decision.explanations.length > 0 && r.offers.offers.length === 0;
    check('C DECLINE + adverse-action (PAN …9)', ok,
      `outcome=${r.decision.outcome} reasons=[${r.decision.reason_codes.join(',')}]`);
  } catch (e: any) { check('C DECLINE + adverse-action (PAN …9)', false, e.message); }

  // D — consent-gate refusal (judge probe)
  try {
    store._resetAll();
    const q = qualifyLead({ session_id: 'rg-D', purpose: 'x', amount: 300000, tenure_months: 36, employment: 'SALARIED', city: 'Kochi' });
    const noTok = pullBureau({ session_id: 'rg-D', lead_id: q.lead_id, consent_token: undefined, pan: 'VITTA1235K' });
    const garbage = fetchBankStatements({ session_id: 'rg-D', lead_id: q.lead_id, consent_token: 'garbage.tok' });
    const ok = isRefusal(noTok) && noTok.code === 'CONSENT_REQUIRED' && isRefusal(garbage);
    check('D consent-gate refusal (judge probe)', ok, `pull_bureau→${isRefusal(noTok) ? noTok.code : 'PASSED?!'}`);
  } catch (e: any) { check('D consent-gate refusal (judge probe)', false, e.message); }

  // E — fraud REVIEW (mobile suffix 99)
  try {
    store._resetAll();
    const q = qualifyLead({ session_id: 'rg-E', purpose: 'x', amount: 300000, tenure_months: 36, employment: 'SALARIED', city: 'Kochi' });
    const fraud = screenFraud({ session_id: 'rg-E', lead_id: q.lead_id, identifiers: { mobile: '9000000099' } });
    check('E fraud REVIEW (mobile …99)', fraud.verdict === 'REVIEW', `verdict=${fraud.verdict} signals=[${fraud.signals.join(',')}]`);
  } catch (e: any) { check('E fraud REVIEW (mobile …99)', false, e.message); }

  // F — objection-handling prompt renders
  try {
    const prompts = new VittaPrompts();
    (async () => {
      const msgs = await prompts.objectionHandling({ objection: 'rate too high' }, {} as any);
      const text = msgs.map((m) => m.content).join(' ');
      check('F objection-handling render', text.length > 50 && /rate|EMI|tenure/i.test(text), `len=${text.length}`);
      report();
    })();
    return; // report() called in async
  } catch (e: any) { check('F objection-handling render', false, e.message); }

  report();
}

function report() {
  console.log('\n  VITTA REGRESSION — paths A–F\n  ' + '─'.repeat(48));
  let pass = 0;
  for (const r of results) {
    console.log(`  ${r.ok ? '✓ PASS' : '✗ FAIL'}  ${r.path}\n           ${r.detail}`);
    if (r.ok) pass++;
  }
  console.log('  ' + '─'.repeat(48));
  console.log(`  ${pass}/${results.length} PASS\n`);
  process.exit(pass === results.length ? 0 : 1);
}

main();
