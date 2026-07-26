/**
 * e2e-wire.mjs — drive the FULL demo path over real MCP stdio (JSON-RPC),
 * exactly what Studio/NitroChat does. Threads the live consent_token between
 * calls. Run: node scripts/e2e-wire.mjs   (needs a prior `npm run build`)
 */
import { spawn } from 'node:child_process';

const srv = spawn(process.execPath, ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'ignore'],
  env: { ...process.env, NODE_ENV: 'development', MCP_TRANSPORT_TYPE: 'stdio' },
});

let buf = '';
const pending = new Map();
srv.stdout.on('data', (c) => {
  buf += c.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    try {
      const m = JSON.parse(line);
      if (m.id != null && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
    } catch {}
  }
});

let nextId = 1;
function rpc(method, params) {
  const id = nextId++;
  return new Promise((res, rej) => {
    pending.set(id, res);
    srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`timeout ${method}`)); } }, 15000);
  });
}
function notify(method, params) {
  srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}
async function call(name, args) {
  const m = await rpc('tools/call', { name, arguments: args });
  const r = m.result ?? m.error;
  if (r?.structuredContent) return r.structuredContent;
  const t = r?.content?.[0]?.text;
  try { return JSON.parse(t); } catch { return t ?? r; }
}

const S = 'demo-1';
let failures = 0;
function step(n, label, ok, detail) {
  console.log(`${ok ? '✓' : '✗'} ${String(n).padStart(2)} ${label}\n      ${detail}`);
  if (!ok) failures++;
}

try {
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'e2e-wire', version: '1' } });
  notify('notifications/initialized');

  // 1 qualify_lead
  const q = await call('qualify_lead', { session_id: S, purpose: 'medical emergency', amount: 300000, tenure_months: 36, employment: 'SALARIED', city: 'Kochi', income_band: '50k-75k' });
  step(1, 'qualify_lead', q.prelim_eligibility === 'ELIGIBLE' && q.intent_flag === 'FAST_TRACK', `lead_id=${q.lead_id} intent=${q.intent_flag}`);
  const L = q.lead_id;

  // 2 pull_bureau BEFORE consent → refusal (judge Path D)
  const probe = await call('pull_bureau', { session_id: S, lead_id: L, pan: 'VITTA1235K', consent_token: 'garbage' });
  step(2, 'pull_bureau w/o consent → REFUSED', probe.error === 'CONSENT_REQUIRED', JSON.stringify(probe));

  // 3 record_consent → token
  const c = await call('record_consent', { session_id: S, lead_id: L, consent_text_version: 'consent-v3', accepted: true, channel: 'web' });
  step(3, 'record_consent', c.accepted === true && !!c.consent_token, `expires=${c.expires_at} scopes=${c.scopes?.join(',')}`);
  const TOK = c.consent_token;

  // 4 verify_kyc
  const k = await call('verify_kyc', { session_id: S, lead_id: L, pan: 'VITTA1235K', name: 'Priya Sharma' });
  step(4, 'verify_kyc', k.kyc_status === 'PASS', `status=${k.kyc_status}`);

  // 5 screen_fraud
  const f = await call('screen_fraud', { session_id: S, lead_id: L, identifiers: { mobile: '9876543222', pan: 'VITTA1235K' } });
  step(5, 'screen_fraud', f.verdict === 'CLEAR', `verdict=${f.verdict}`);

  // 6 pull_bureau WITH token
  const b = await call('pull_bureau', { session_id: S, lead_id: L, pan: 'VITTA1235K', consent_token: TOK });
  step(6, 'pull_bureau (valid token)', b.score === 705, `score=${b.score} active_emi=${b.active_emi}`);

  // 7 fetch_bank_statements
  const bs = await call('fetch_bank_statements', { session_id: S, lead_id: L, consent_token: TOK, months: 12 });
  step(7, 'fetch_bank_statements', bs.stability_index === 88, `stability=${bs.stability_index} surplus=${bs.net_surplus}`);

  // 8 compute_affordability
  const a = await call('compute_affordability', { session_id: S, lead_id: L });
  step(8, 'compute_affordability', Math.round(a.foir * 100) === 57, `foir=${(a.foir * 100).toFixed(1)}% proposed_emi=${a.proposed_emi}`);

  // 9 underwrite
  const d = await call('underwrite', { session_id: S, lead_id: L });
  step(9, 'underwrite', d.outcome === 'CONDITIONAL' && d.max_amount === 250000, `outcome=${d.outcome} max=${d.max_amount} reasons=[${d.reason_codes?.join(',')}]`);

  // 10 generate_offers
  const o = await call('generate_offers', { session_id: S, lead_id: L });
  const rec = o.offers?.find((x) => x.offer_id === o.recommended_offer_id);
  step(10, 'generate_offers', o.offers?.length >= 1 && rec && rec.emi === Math.min(...o.offers.map((x) => x.emi)), `offers=${o.offers?.length} recommended EMI=₹${rec?.emi}`);

  // 11 create_sanction_letter
  const sl = await call('create_sanction_letter', { session_id: S, lead_id: L, offer_id: o.recommended_offer_id });
  step(11, 'create_sanction_letter', !!sl.hash, `hash=${String(sl.hash).slice(0, 16)}… url=${sl.url}`);

  // 12 audit trail — redaction check
  const t = await call('get_audit_trail', { session_id: S, view: 'FULL' });
  const blob = JSON.stringify(t);
  step(12, 'get_audit_trail + PII redaction', t.count >= 10 && !blob.includes('VITTA1235K') && !blob.includes('9876543222'), `events=${t.count} rawPAN=${blob.includes('VITTA1235K')} rawMobile=${blob.includes('9876543222')}`);

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILED'} — full demo path over MCP stdio`);
} catch (e) {
  console.error('E2E error:', e.message);
  failures++;
} finally {
  srv.kill();
  process.exit(failures === 0 ? 0 : 1);
}
