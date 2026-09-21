import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  cwd: process.cwd(),
  env: { ...process.env },
});

const client = new Client({ name: 'live-check', version: '1.0.0' });

async function call(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; data: any; error?: string }> {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text;
  let parsed: unknown = text;
  if (typeof text === 'string') {
    try {
      parsed = JSON.parse(text);
    } catch {
      /* not json */
    }
  }
  return { ok: !res.isError, data: parsed, error: res.isError ? String(text ?? 'tool error') : undefined };
}

let failures = 0;
function line(label: string, ok: boolean, extra = '') {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
}

async function main() {
  await client.connect(transport);
  console.log('LIVE PROVIDER CHECK (real integrations)\n');

  const today = new Date().toISOString().slice(0, 10);

  console.log('-- Linear --');
  const created = await call('linear_create_ticket', {
    title: `LIVE CHECK ${new Date().toISOString()}`,
    description: 'Live connectivity test from scripts/live-check.mts — safe to delete.',
    labels: ['commitment', 'committed'],
  });
  const ticketId = created.ok ? (created.data?.ticket_id ?? created.data?.ticket?.ticket_id) : undefined;
  const idOk = typeof ticketId === 'string' && /^[A-Z]+-\d+$/.test(ticketId);
  line('linear_create_ticket', created.ok && idOk, created.ok ? JSON.stringify(created.data) : created.error);

  if (ticketId) {
    const status = await call('linear_get_status', { ticket_id: ticketId });
    const s = status.data as any;
    line('linear_get_status (read-back)', status.ok && typeof s?.status === 'string' && s?.as_of, status.ok ? JSON.stringify(s) : status.error);
    await call('linear_update_status', { ticket_id: ticketId, status: 'Done' });
    const after = await call('linear_get_status', { ticket_id: ticketId });
    line('linear_update_status -> Done', after.ok && (after.data as any)?.status === 'Done', after.ok ? JSON.stringify(after.data) : after.error);
    await call('linear_update_status', { ticket_id: ticketId, status: 'Cancelled' });
  }

  console.log('-- Slack --');
  const slack = await call('search_slack_evidence', {
    query_terms: ['vendor', 'report', 'acme'],
    since: today,
  });
  const slackCount = slack.ok ? (slack.data as any)?.count : undefined;
  line('search_slack_evidence (connected, no error)', slack.ok && Number.isInteger(slackCount), slack.ok ? `${slackCount} result(s)` : slack.error);

  console.log('-- Email (IMAP) --');
  const email = await call('search_email_evidence', {
    query_terms: ['report', 'acme'],
    since: today,
  });
  const emailCount = email.ok ? (email.data as any)?.count : undefined;
  line('search_email_evidence (connected, no error)', email.ok && Number.isInteger(emailCount), email.ok ? `${emailCount} result(s)` : email.error);

  console.log('');
  console.log(failures === 0 ? 'LIVE CHECK: all providers responding' : `LIVE CHECK: ${failures} failure(s)`);
  await client.close();
}

main().catch((e) => {
  console.error('live-check crashed:', e);
  process.exit(1);
});
