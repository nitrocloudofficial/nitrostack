/**
 * FORAY — BEAT 6 VERIFICATION HARNESS
 *
 *   node verify-warden.mjs
 *
 * Speaks MCP over stdio to the built server and asserts the permission
 * boundary in both directions:
 *
 *   diagnostician → get_reflection   MUST be ALLOWED
 *   faculty       → get_reflection   MUST be DENIED
 *   faculty       → get_clusters     MUST be ALLOWED
 *
 * Run this before every rehearsal. If it prints anything other than
 * "ALL CHECKS PASSED", beat 6 is broken and nothing else matters.
 *
 * Note: "ALLOWED" here means the Warden let the call through to the
 * handler. The handler then tries to reach the Python API — if that is not
 * running you will see an upstream error, which is still proof the guard
 * allowed it. The guard is what we are testing, not the backend.
 */

import { spawn } from 'node:child_process';

const TESTS = [
  { role: 'diagnostician', tool: 'get_reflection', args: { reflection_id: 'R_0921' }, expect: 'ALLOW' },
  { role: 'faculty',       tool: 'get_reflection', args: { reflection_id: 'R_0921' }, expect: 'DENY'  },
  { role: 'faculty',       tool: 'get_mastery',    args: { student_id: 'S_014' },     expect: 'DENY'  },
  { role: 'faculty',       tool: 'get_clusters',   args: { week: 6 },                 expect: 'ALLOW' },
  { role: 'root_cause_analyst', tool: 'get_reflection', args: { reflection_id: 'R_0921' }, expect: 'DENY' },
  // ── S7: the chat log is the regulation record. Faculty reads counts,
  //        never the words — in BOTH directions again.
  { role: 'faculty',       tool: 'get_chat_log',  args: { session_id: 'CS_9001' },   expect: 'DENY'  },
  { role: 'elicitor',      tool: 'get_chat_log',  args: { session_id: 'CS_9001' },   expect: 'ALLOW' },
  { role: 'faculty',       tool: 'get_roster',    args: { class_id: 'CLS_CN5' },     expect: 'ALLOW' },
  { role: 'diagnostician', tool: 'get_roster',    args: { class_id: 'CLS_CN5' },     expect: 'DENY'  },
  { role: 'faculty',       tool: 'get_topic_questions', args: {},                    expect: 'ALLOW' },
];

function callTool(role, tool, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['dist/index.js'], {
      env: { ...process.env, FORAY_ROLE: role, NITROSTACK_APP_MODE: 'stdio' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (verdict, detail) => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({ verdict, detail });
    };

    child.stdout.on('data', (d) => {
      stdout += d.toString();
      for (const line of stdout.split('\n')) {
        const t = line.trim();
        if (!t.startsWith('{')) continue;
        let msg;
        try { msg = JSON.parse(t); } catch { continue; }
        if (msg.id !== 2) continue;
        const body = JSON.stringify(msg);
        if (/DENIED|WardenDenied|P-0\d|not declared in the permission matrix/.test(body)) {
          finish('DENY', body.slice(0, 300));
        } else {
          finish('ALLOW', body.slice(0, 300));
        }
      }
    });

    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', () => finish('ERROR', 'spawn failed'));

    // MCP handshake, then the tool call.
    setTimeout(() => {
      child.stdin.write(JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'foray-verify', version: '1.0.0' },
        },
      }) + '\n');
    }, 2500);

    setTimeout(() => {
      child.stdin.write(JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: { name: tool, arguments: args },
      }) + '\n');
    }, 4000);

    setTimeout(() => {
      // No id:2 response. Fall back to the guard's own log line, which is
      // authoritative — the Warden logs WARDEN DENY before it throws.
      if (/WARDEN DENY/.test(stderr + stdout)) finish('DENY', 'via warden log');
      else if (/warden allow/.test(stderr + stdout)) finish('ALLOW', 'via warden log');
      else finish('TIMEOUT', (stderr || stdout).slice(-300));
    }, 11000);
  });
}

console.log('\n  FORAY — Warden verification (beat 6)\n  ' + '─'.repeat(52));
let failures = 0;

for (const t of TESTS) {
  const { verdict, detail } = await callTool(t.role, t.tool, t.args);
  const ok = verdict === t.expect;
  if (!ok) failures++;
  const mark = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(
    `  ${mark} ${t.role.padEnd(21)} → ${t.tool.padEnd(16)} ` +
    `expected ${t.expect.padEnd(5)} got ${verdict}`,
  );
  if (!ok) console.log(`      ${detail}`);
}

console.log('  ' + '─'.repeat(52));
if (failures === 0) {
  console.log('  \x1b[32mALL CHECKS PASSED\x1b[0m — the permission boundary holds.\n');
  process.exit(0);
} else {
  console.log(`  \x1b[31m${failures} CHECK(S) FAILED\x1b[0m — beat 6 is broken. Fix before anything else.\n`);
  process.exit(1);
}
