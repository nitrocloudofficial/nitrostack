#!/usr/bin/env node
import { parseCommand, decide } from './parse-command.mjs';

const endpoint = process.env.DEP_BOUNCER_URL || 'https://dep-bouncer-6ad22414-giberelin-heapify-global-community.app.nitrocloud.ai/mcp';
const cursor = process.argv.includes('--cursor');
const failClosed = process.env.DEP_BOUNCER_FAIL_CLOSED === '1';
const apiKey = process.env.DEP_BOUNCER_API_KEY;

function output(decision, reason) {
  if (!['deny', 'ask'].includes(decision)) return;
  const result = cursor
    ? { permission: decision, userMessage: reason, agentMessage: reason }
    : { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function unavailable(reason, command) {
  const message = `Dep Bouncer unavailable: ${reason}`;
  process.stderr.write(`${message}${failClosed ? '' : `; leaving host permissions unchanged for ${command}`}\n`);
  return message;
}

/** NitroCloud scales to zero: a cold server answers 502/503/504 for a few seconds. */
async function fetchWithWarmup(url, init) {
  const delays = [1_500, 3_000, 6_000];
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, init());
    if (![502, 503, 504].includes(response.status) || attempt >= delays.length) return response;
    await response.body?.cancel();
    await new Promise(resolve => setTimeout(resolve, delays[attempt]));
  }
}

async function checkPackage(request, id) {
  const response = await fetchWithWarmup(endpoint, () => ({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: {
      name: 'bouncer_check_package', arguments: { name: request.name, ...(request.spec ? { version: request.spec } : {}) },
      ...(apiKey ? { _meta: { apiKey } } : {}),
    } }),
    signal: AbortSignal.timeout(25_000),
  }));
  if (!response.ok) throw new Error(`HTTP ${response.status}${[401, 403].includes(response.status) ? ': check DEP_BOUNCER_API_KEY' : ''}`);
  const body = await response.text();
  let rpc;
  try {
    rpc = JSON.parse(body);
  } catch {
    // SSE messages can contain multiple data lines; ignore unrelated notifications.
    for (const event of body.replace(/\r\n/g, '\n').split(/\n\n/)) {
      const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data) continue;
      try {
        const message = JSON.parse(data);
        if (message.id === id) rpc = message;
      } catch { /* An unrelated event must not hide a later valid response. */ }
    }
  }
  if (!rpc || rpc.id !== id) throw new Error('Missing MCP response');
  if (rpc.error) throw new Error(`${rpc.error.message || 'MCP error'}${/api.?key|unauthori[sz]ed|forbidden/i.test(rpc.error.message ?? '') ? ': check DEP_BOUNCER_API_KEY' : ''}`);
  const result = rpc.result;
  if (result?.isError) throw new Error(`${result.content?.[0]?.text || 'MCP tool error'}${/api.?key|unauthori[sz]ed|forbidden/i.test(result.content?.[0]?.text ?? '') ? ': check DEP_BOUNCER_API_KEY' : ''}`);
  const report = JSON.parse(result?.content?.[0]?.text ?? 'null');
  if (!report || !['ALLOW', 'REVIEW', 'BLOCK'].includes(report.verdict)
    || typeof report.package !== 'string' || typeof report.version !== 'string'
    || !Array.isArray(report.findings) || report.findings.some(finding => !finding || typeof finding.title !== 'string')
    || (report.summary !== undefined && typeof report.summary !== 'string')
    || (report.safeVersion !== undefined && (!report.safeVersion || typeof report.safeVersion.version !== 'string'))) {
    throw new Error('Invalid package report');
  }
  return report;
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    const reason = unavailable('Invalid hook JSON', '(unknown command)');
    if (failClosed) output('ask', reason);
    return;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
    || (!cursor && typeof payload.tool_name !== 'string')) {
    const reason = unavailable('Invalid hook payload', '(unknown command)');
    if (failClosed) output('ask', reason);
    return;
  }
  if (!cursor && payload.tool_name !== 'Bash') return;
  const command = cursor ? payload?.command : payload?.tool_input?.command;
  if (typeof command !== 'string') {
    const reason = unavailable('Missing shell command', '(unknown command)');
    if (failClosed) output('ask', reason);
    return;
  }
  const parsed = parseCommand(command);
  const unique = new Map(parsed.installs.map(request => [JSON.stringify([request.name, request.spec]), request]));
  const requests = [...unique.values()];
  const results = [];
  // Bound request concurrency without dropping packages from large install commands.
  for (let start = 0; start < requests.length; start += 5) {
    results.push(...await Promise.allSettled(requests.slice(start, start + 5).map((request, index) => checkPackage(request, start + index + 1))));
  }
  const reports = [], warnings = [];
  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') reports.push(result.value);
    else warnings.push(unavailable(`${requests[index].name}: ${result.reason?.message || String(result.reason)}`, command));
  }
  const { decision, reason } = decide(reports);
  output(decision === 'deny' ? 'deny' : parsed.uncertain || (warnings.length && failClosed) ? 'ask' : decision,
    [reason, ...warnings, ...(parsed.uncertain ? ['Dep Bouncer could not fully parse or verify this package install; ask the user before running it.'] : [])].filter(Boolean).join('\n'));
}

await main();
