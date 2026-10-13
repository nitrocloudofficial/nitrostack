/**
 * seed-demo.ts — reset demo state and pre-run the golden path so the live case
 * record (case://<lead_id>) has data before a recording. Prints the ids to use.
 * Run: npm run seed:demo
 */
import { store } from '../src/lib/store.js';
import {
  qualifyLead, recordConsent, verifyKyc, screenFraud, pullBureau, fetchBankStatements,
  computeAffordabilityStep, underwriteStep, generateOffersStep,
} from '../src/lib/engine.js';

const SESSION = 'demo-seed';
store.resetSession(SESSION);

const q = qualifyLead({
  session_id: SESSION,
  purpose: 'medical emergency',
  amount: 300000,
  tenure_months: 36,
  employment: 'SALARIED',
  city: 'Kochi',
  income_band: '50k-75k',
});
const c = recordConsent({
  session_id: SESSION,
  lead_id: q.lead_id,
  consent_text_version: 'consent-v3',
  accepted: true,
  channel: 'web',
});
if (!c.accepted) throw new Error('consent failed');
verifyKyc({ session_id: SESSION, lead_id: q.lead_id, pan: 'VITTA1235K', name: 'Priya Sharma' });
screenFraud({ session_id: SESSION, lead_id: q.lead_id, identifiers: { mobile: '9876543222', pan: 'VITTA1235K' } });
pullBureau({ session_id: SESSION, lead_id: q.lead_id, consent_token: c.consent_token, pan: 'VITTA1235K' });
fetchBankStatements({ session_id: SESSION, lead_id: q.lead_id, consent_token: c.consent_token, months: 12 });
computeAffordabilityStep({ session_id: SESSION, lead_id: q.lead_id });
const d = underwriteStep({ session_id: SESSION, lead_id: q.lead_id });
const o = generateOffersStep({ session_id: SESSION, lead_id: q.lead_id });

console.log('Demo state seeded.');
console.log(`  session_id      ${SESSION}`);
console.log(`  lead_id         ${q.lead_id}`);
console.log(`  consent_token   ${c.consent_token.slice(0, 24)}… (15-min TTL — reissue live on camera)`);
console.log(`  decision        ${d.outcome} ₹${d.max_amount.toLocaleString('en-IN')}`);
console.log(`  offers          ${o.offers.length} (recommended ${o.recommended_offer_id})`);
console.log(`  case resource   case://${q.lead_id}`);
