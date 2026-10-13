/**
 * verify-prod.mjs — §6.5 post-deploy verification against the LIVE deployment.
 * Speaks Streamable HTTP with session handling (cloud runs sessions enabled).
 * Run after EVERY deploy:  node scripts/verify-prod.mjs <base-url>
 * Exit 0 = all checks pass. Log the result in docs/DEPLOY_LOG.md.
 */

const BASE = (process.argv[2] ?? 'https://vitta-6a5a5835-the-beetles-amrita-university-amritapuri-campus.app.nitrocloud.ai').replace(/\/$/, '');
const MCP = `${BASE}/mcp`;

let SESSION_HEADER = null;
let nextId = 1;

async function rpc(method, params) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (SESSION_HEADER) headers['Mcp-Session-Id'] = SESSION_HEADER;
  const res = await fetch(MCP, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });
  const sid = res.headers.get('mcp-session-id');
  if (sid) SESSION_HEADER = sid;
  const text = await res.text();
  // parse SSE (event:/data:) or plain JSON
  const dataLine = text.split(/\r?\n/).find((l) => l.startsWith('data:'));
  const payload = dataLine ? dataLine.slice(5).trim() : text;
  if (!payload) throw new Error(`empty response (HTTP ${res.status}) for ${method}`);
  return JSON.parse(payload);
}

function toolResult(m) {
  const r = m.result ?? m.error;
  if (r?.structuredContent) return r.structuredContent;
  const t = r?.content?.[0]?.text;
  try { return JSON.parse(t); } catch { return t ?? r; }
}
async function call(name, args) {
  return toolResult(await rpc('tools/call', { name, arguments: args }));
}

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? '✓' : '✗'} ${label}\n    ${detail}`);
  if (!ok) failures++;
}

console.log(`Verifying PROD: ${BASE}\n`);

// init + session
const init = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'verify-prod', version: '1' } });
check('initialize', init.result?.serverInfo?.name === 'vitta-lending', `server=${init.result?.serverInfo?.name} session=${SESSION_HEADER ? 'yes' : 'no'}`);
await rpc('notifications/initialized', {}).catch(() => {});

// 6.5-2: primitives enumerate
const tools = await rpc('tools/list', {});
const resources = await rpc('resources/list', {});
const prompts = await rpc('prompts/list', {});
check('primitives enumerate', tools.result?.tools?.length >= 16 && prompts.result?.prompts?.length === 5 && resources.result?.resources?.length >= 5,
  `tools=${tools.result?.tools?.length} resources=${resources.result?.resources?.length} prompts=${prompts.result?.prompts?.length}`);

// 6.5-3: health + secret configured
const h = await call('health_check', {});
check('health_check ok', h.ok === true, `version=${h.version} commit=${h.commit}`);
check('CONSENT_SECRET configured in prod', h.consent_secret_configured === true,
  h.consent_secret_configured ? 'strong secret set' : 'NOT SET — tokens forgeable, set env var and redeploy!');

// 6.5-4: consent probe (judge Path D) on PROD
const probe = await call('pull_bureau', { session_id: 'prod-verify', lead_id: 'probe', pan: 'VITTA1235K', consent_token: 'garbage' });
check('consent gate refuses on prod', probe?.error === 'CONSENT_REQUIRED', JSON.stringify(probe));

// 6.5-5: demo pair story end-to-end on PROD (also proves cross-request state persistence)
const S = `prod-verify-${Date.now().toString(36)}`;
const q = await call('qualify_lead', { session_id: S, purpose: 'medical emergency', amount: 300000, tenure_months: 36, employment: 'SALARIED', city: 'Kochi' });
const c = await call('record_consent', { session_id: S, lead_id: q.lead_id, consent_text_version: 'consent-v3', accepted: true, channel: 'web' });
await call('verify_kyc', { session_id: S, lead_id: q.lead_id, pan: 'VITTA1235K', name: 'Priya Sharma' });
await call('screen_fraud', { session_id: S, lead_id: q.lead_id, identifiers: { mobile: '9876543222' } });
const b = await call('pull_bureau', { session_id: S, lead_id: q.lead_id, pan: 'VITTA1235K', consent_token: c.consent_token });
await call('fetch_bank_statements', { session_id: S, lead_id: q.lead_id, consent_token: c.consent_token, months: 12 });
const a = await call('compute_affordability', { session_id: S, lead_id: q.lead_id });
const d = await call('underwrite', { session_id: S, lead_id: q.lead_id });
check('demo pair → CONDITIONAL ₹2.5L on prod', d.outcome === 'CONDITIONAL' && d.max_amount === 250000 && Math.round(a.foir * 100) === 57,
  `outcome=${d.outcome} max=${d.max_amount} foir=${Math.round((a.foir ?? 0) * 100)}% bureau=${b.score}`);

// what-if flip on prod
const sim = await call('simulate_scenario', { session_id: S, lead_id: q.lead_id, close_existing_emi: 25000 });
check('what-if flip on prod', sim?.scenario?.decision?.outcome === 'APPROVE' && sim?.scenario?.decision?.max_amount === 300000,
  sim?.delta?.summary ?? JSON.stringify(sim).slice(0, 120));

// offers + sanction + audit redaction
const o = await call('generate_offers', { session_id: S, lead_id: q.lead_id });
const sl = await call('create_sanction_letter', { session_id: S, lead_id: q.lead_id, offer_id: o.recommended_offer_id });
const t = await call('get_audit_trail', { session_id: S, view: 'FULL' });
const blob = JSON.stringify(t);
check('offers + sanction on prod', (o.offers?.length ?? 0) >= 1 && !!sl.hash, `offers=${o.offers?.length} hash=${String(sl.hash).slice(0, 12)}…`);
check('audit redaction on prod', (t.count ?? 0) >= 10 && !blob.includes('VITTA1235K') && !blob.includes('9876543222'), `events=${t.count}`);

// live external data
const rates = await call('get_reference_rates', {});
check('live reference rates', !!rates?.inr_per?.USD, `source=${rates.source} USD→INR=${rates?.inr_per?.USD}`);

// sanction letter downloadable over HTTP (GET /letters/:leadId)
try {
  const letterRes = await fetch(sl.url);
  const letterHtml = letterRes.ok ? await letterRes.text() : '';
  check('letter URL serves the signed letter', letterRes.ok && letterHtml.includes(String(sl.hash)),
    `${sl.url} → HTTP ${letterRes.status}, hash-in-doc=${letterHtml.includes(String(sl.hash))}`);
} catch (e) {
  check('letter URL serves the signed letter', false, `${sl.url} → ${e.message}`);
}

console.log(`\n${failures === 0 ? 'ALL PROD CHECKS PASS' : failures + ' CHECKS FAILED'} — ${BASE}`);
process.exit(failures === 0 ? 0 : 1);
