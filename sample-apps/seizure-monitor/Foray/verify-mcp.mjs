/**
 * FORAY — END-TO-END MCP VERIFICATION
 *
 *     node verify-mcp.mjs        (Python API must be running)
 *
 * verify-warden.mjs proves the permission boundary. This proves the other
 * half: that an ALLOWED tool call actually round-trips
 *
 *     MCP client -> NitroStack tool -> Python API -> SQLite -> back
 *
 * and returns real data. "Allowed" only means the Guard dispatched to the
 * handler; without this test a tool could be allowed and still return an
 * error, and verify-warden would still pass.
 */

import { spawn } from 'node:child_process';

const CALLS = [
  { role: 'diagnostician', tool: 'get_concept',
    args: { concept_id: 'C03' }, expect: /Addressing and ports/ },
  { role: 'faculty', tool: 'get_clusters',
    args: { week: 6 }, expect: /CL_006_M12/ },
  { role: 'faculty', tool: 'get_cohort_mastery',
    args: { concept_id: 'C03' }, expect: /mean_level/ },
  { role: 'grounding_verifier', tool: 'get_material_chunks',
    args: { concept_id: 'C03' }, expect: /MAT_/ },
  { role: 'root_cause_analyst', tool: 'get_prereqs',
    args: { concept_id: 'C11', depth: 4 }, expect: /C03/ },
  // ── S7 ──
  { role: 'faculty', tool: 'get_roster',
    args: { class_id: 'CLS_CN5' }, expect: /scenario/ },
  { role: 'faculty', tool: 'get_topic_questions',
    args: {}, expect: /C11/ },
  { role: 'elicitor', tool: 'get_chat_log',
    args: { session_id: 'CS_9001' }, expect: /messages/ },
];

function callTool(role, tool, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['dist/index.js'], {
      env: { ...process.env, FORAY_ROLE: role, NITROSTACK_APP_MODE: 'stdio' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; child.kill(); resolve(v); } };

    child.stdout.on('data', (d) => {
      out += d.toString();
      for (const line of out.split('\n')) {
        const t = line.trim();
        if (!t.startsWith('{')) continue;
        let msg;
        try { msg = JSON.parse(t); } catch { continue; }
        if (msg.id === 2) done(JSON.stringify(msg));
      }
    });
    child.on('error', () => done('SPAWN_ERROR'));

    setTimeout(() => child.stdin.write(JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {},
                clientInfo: { name: 'foray-verify-mcp', version: '1.0.0' } },
    }) + '\n'), 2500);

    setTimeout(() => child.stdin.write(JSON.stringify({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: tool, arguments: args },
    }) + '\n'), 4000);

    setTimeout(() => done('TIMEOUT'), 13000);
  });
}

console.log('\n  FORAY — MCP round trip (NitroStack -> Python -> SQLite)');
console.log('  ' + '─'.repeat(60));
let bad = 0;
for (const c of CALLS) {
  const body = await callTool(c.role, c.tool, c.args);
  const unreachable = /Foray API unreachable/.test(body);
  const ok = !unreachable && c.expect.test(body);
  if (!ok) bad++;
  const mark = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${mark} ${c.role.padEnd(19)} ${c.tool.padEnd(20)} ` +
              (ok ? 'real data' : unreachable ? 'API UNREACHABLE' : 'no match'));
  if (!ok) console.log(`      ${body.slice(0, 220)}`);
}
console.log('  ' + '─'.repeat(60));
if (bad === 0) {
  console.log('  \x1b[32mALL ROUND TRIPS OK\x1b[0m — the MCP layer serves live data.\n');
  process.exit(0);
}
console.log(`  \x1b[31m${bad} FAILED\x1b[0m — is the Python API running on :8000?\n`);
process.exit(1);
