#!/usr/bin/env node
/**
 * Change guardrails on a running server, no redeploy:
 *
 *   npm run policy -- show --team social
 *   npm run policy -- set slang 8 --team social
 *   npm run policy -- set channels chat,email,social,press --team marketing
 *   npm run policy -- history --team social
 *   npm run policy -- rollback --to 2 --team social
 *   npm run policy -- webhook --team social [--send]
 *   npm run policy -- health
 *
 * Talks to the control plane (GUARDRAILS_URL, default http://127.0.0.1:<PORT+1>) with the
 * admin key from GUARDRAILS_ADMIN_API_KEY or, in the demo profile, .brandvoice/admin.key.
 */

import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const POLICY = 'brandvoice-mutation';
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv.splice(i, 2)[1] : fallback;
};
const has = (name) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? (argv.splice(i, 1), true) : false;
};

const stateDir = resolve(process.env.BRANDVOICE_STATE_DIR || '.brandvoice');
const readSecret = (file) => {
  try {
    return readFileSync(join(stateDir, file), 'utf8').trim();
  } catch {
    return undefined;
  }
};

const team = flag('team', 'social');
const send = has('send');
const to = flag('to');
const [command = 'help', ...rest] = argv;
const base = (process.env.GUARDRAILS_URL || `http://127.0.0.1:${Number(process.env.PORT || 3100) + 1}`).replace(/\/$/, '');
const key = process.env.GUARDRAILS_ADMIN_API_KEY || readSecret('admin.key');

async function api(method, path, body) {
  if (!key && !path.startsWith('/healthz')) fail('No admin key. Start the server once (demo) or set GUARDRAILS_ADMIN_API_KEY.');
  let res;
  try {
    res = await fetch(base + path, {
      method,
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'x-change-source': 'cli' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    fail(`Cannot reach ${base}. Is the server running (npm start)?`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) fail(`${res.status}: ${data.error ?? res.statusText}`);
  return data;
}

function fail(message) {
  console.error('policy: ' + message);
  process.exit(1);
}

function parseValue(field, raw) {
  if (raw === undefined) fail(`Usage: policy set <field> <value> --team <team>`);
  if (['channels', 'voices', 'audiences'].includes(field)) return raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (raw === 'true' || raw === 'false') return raw === 'true';
  return /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
}

const policyPath = `/guardrails/v1/policies/${encodeURIComponent(team)}/${POLICY}`;

switch (command) {
  case 'show': {
    const { head, settings } = await api('GET', policyPath);
    console.log(`${team}/${POLICY} revision ${head.revision} (version ${head.activeVersion}) by ${head.updatedBy} via ${head.source}`);
    console.log(JSON.stringify(settings, null, 2));
    break;
  }
  case 'set': {
    const [field, raw] = rest;
    const before = (await api('GET', policyPath)).head.revision;
    const head = await api('PATCH', `${policyPath}/settings`, { [field]: parseValue(field, raw) });
    console.log(`${team}: ${field} = ${raw}  (revision ${before} → ${head.revision}). Live on the next tool call.`);
    break;
  }
  case 'history': {
    const { versions } = await api('GET', `${policyPath}/versions?limit=20`);
    for (const v of versions) {
      const note = v.restoredFrom ? ` (restored v${v.restoredFrom})` : v.comment ? ` (${v.comment})` : '';
      console.log(`v${v.version}  ${v.status.padEnd(9)} ${v.kind.padEnd(8)} ${v.source.padEnd(7)} ${v.createdBy}  ${v.createdAt}${note}`);
    }
    break;
  }
  case 'rollback': {
    if (!to) fail('Usage: policy rollback --to <version> --team <team>');
    const head = await api('POST', `${policyPath}/rollback`, { toVersion: Number(to) });
    console.log(`${team}: restored version ${to} as revision ${head.revision}`);
    break;
  }
  case 'webhook': {
    const secret = process.env.GUARDRAILS_WEBHOOK_SECRET?.split(',')[0] || readSecret('webhook.secret');
    if (!secret) fail('No webhook secret. Set GUARDRAILS_WEBHOOK_SECRET.');
    const body = JSON.stringify({ type: 'policy.changed', tenantId: team });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    const delivery = randomUUID();
    if (!send) {
      console.log(`curl -X POST ${base}/guardrails/webhook \\
  -H 'content-type: application/json' \\
  -H 'x-nitro-timestamp: ${timestamp}' \\
  -H 'x-nitro-delivery: ${delivery}' \\
  -H 'x-nitro-signature: ${signature}' \\
  -d '${body}'`);
      console.log('\n# valid for 5 minutes. Signature = HMAC-SHA256(secret, "<timestamp>.<body>")');
      break;
    }
    const res = await fetch(`${base}/guardrails/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-nitro-timestamp': timestamp, 'x-nitro-delivery': delivery, 'x-nitro-signature': signature },
      body,
    });
    console.log(res.status, await res.text());
    break;
  }
  case 'health':
    console.log(JSON.stringify(await api('GET', '/healthz/guardrails'), null, 2));
    break;
  default:
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n/, '').replace(/^ \* ?/gm, ''));
}
