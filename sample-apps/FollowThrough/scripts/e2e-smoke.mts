import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  cwd: process.cwd(),
  env: { ...process.env },
});

const client = new Client({ name: 'e2e-smoke', version: '1.0.0' });

let failures = 0;
function assert(cond: boolean, label: string) {
  if (cond) console.log(`  PASS  ${label}`);
  else {
    console.log(`  FAIL  ${label}`);
    failures++;
  }
}

function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function call(name: string, args: Record<string, unknown>) {
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
  return parsed;
}

async function main() {
  await client.connect(transport);
  console.log('Connected to Follow-Through MCP server\n');

  const reset = await call('reset_demo', {});
  assert(reset.reset === true, 'reset_demo clears state');

  const sample = ((await call('get_sample_transcript', {})) as any).sample;
  const transcript = sample.text;
  assert(typeof transcript === 'string' && transcript.length > 100, 'get_sample_transcript returns transcript');

  const extracted = (await call('extract_commitments', {
    transcript_text: transcript,
    participants: sample.participants,
    meeting_date: sample.meeting_date,
  })) as any;
  assert(Array.isArray(extracted.commitments), 'extract_commitments returns array');
  const statuses = new Set(extracted.commitments.map((c: any) => c.status));
  assert(statuses.size === 1 && statuses.has('open'), 'all 4 extracted commitments start open');
  const byPhrase = new Map(extracted.commitments.map((c: any) => [c.what.toLowerCase(), c]));
  assert(byPhrase.has('get the vendor report over to acme logistics'), 'Priya commitment extracted');
  assert(byPhrase.has('publish the pricing api migration plan to the wiki'), 'Marcus commitment extracted');
  assert(byPhrase.has('get the security audit response drafted'), 'Aisha (hedged) commitment extracted');
  assert(
    [...byPhrase.keys()].some((k) => k.includes('error budget')),
    'Tom aspirational commitment extracted'
  );
  const tickets = new Set(extracted.commitments.map((c: any) => c.linked_ticket_id).filter(Boolean));
  assert(tickets.size >= 4, `auto-created Linear tickets (${tickets.size})`);
  const owners = extracted.commitments.map((c: any) => c.owner.name).sort();
  assert(
    JSON.stringify(owners) === JSON.stringify(['Aisha Khan', 'Marcus Chen', 'Priya Shah', 'Tom Park']),
    'owners resolved to roster members'
  );
  const priya = byPhrase.get('get the vendor report over to acme logistics');
  assert(priya.due_date === addDaysISO(sample.meeting_date, 3), 'Priya due = meeting date + 3');
  assert(priya.confidence_level === 'committed', 'Priya = committed');
  assert(byPhrase.get('get the security audit response drafted').confidence_level === 'hedged', 'Aisha = hedged');

  console.log('\n-- simulate_days_passing(3) --');
  const sim1 = (await call('simulate_days_passing', { days: 3 })) as any;
  console.log('  actions:', JSON.stringify(sim1.actions));
  const a1 = sim1.actions.map((a: any) => a.action).sort();
  assert(a1.includes('done_evidence'), 'Priya resolved via Slack/email evidence');
  assert(a1.includes('nudge_1'), 'Marcus received gentle nudge');
  assert(!a1.some((x: string) => x.startsWith('nudge') && x.endsWith('2')) && !a1.some((x: string) => x.startsWith('escalat')), 'no premature nudge_2/escalation');

  let after1 = (await call('query_commitments', {})) as any;
  let names1 = new Map(after1.commitments.map((c: any) => [c.owner.name, c.status]));
  assert(names1.get('Priya Shah') === 'done', 'Priya left the open pool (done)');
  assert(names1.get('Marcus Chen') === 'nudged_1', 'Marcus moved to nudged_1');

  console.log('\n-- simulate_days_passing(3) --');
  const sim2 = (await call('simulate_days_passing', { days: 3 })) as any;
  const a2 = sim2.actions.map((a: any) => a.action).sort();
  console.log('  actions:', JSON.stringify(sim2.actions));
  assert(a2.includes('nudge_2'), 'Marcus escalated to specific nudge');
  assert(a2.includes('done_linear') === false, 'no linear-done surprises');

  console.log('\n-- simulate_days_passing(3) --');
  const sim3 = (await call('simulate_days_passing', { days: 3 })) as any;
  const a3 = sim3.actions.map((a: any) => a.action).sort();
  console.log('  actions:', JSON.stringify(sim3.actions));
  assert(a3.some((x: string) => x.startsWith('escalat')), 'Marcus escalated to manager');
  assert(a3.includes('nudge_1'), 'Aisha (hedged) got her first nudge on time');
  assert(!a3.some((x: string) => x.includes('Tom')), 'aspirational never chased');

  const all = (await call('query_commitments', {})) as any;
  const byName = new Map(all.commitments.map((c: any) => [c.owner.name, c]));
  assert(byName.get('Priya Shah').status === 'done', 'Priya = done_evidence');
  assert(byName.get('Marcus Chen').status === 'escalated', 'Marcus = escalated');
  assert(byName.get('Aisha Khan').status === 'nudged_1', 'Aisha = nudged_1');
  assert(byName.get('Tom Park').status === 'open', 'Tom = untouched open');
  const marcusEvidence = byName.get('Marcus Chen').evidence_log;
  const weak = marcusEvidence.every((e: any) => e.matched_score <= 0.55);
  assert(weak, 'Marcus keyword-only evidence stays under threshold (no false done)');
  const priyaEv = byName.get('Priya Shah').evidence_log;
  assert(priyaEv.some((e: any) => e.source === 'slack') && priyaEv.some((e: any) => e.source === 'email'), 'Priya evidence from both channels');

  const escalation = await call('linear_get_status', { ticket_id: byName.get('Marcus Chen').linked_ticket_id });
  const es = escalation as any;
  console.log('  linear status:', JSON.stringify(es));
  assert(es.status === 'Escalated' && Array.isArray(es.watchers) && es.watchers.length > 0, 'Linear ticket Escalated + manager watcher added');

  const nudge = await call('send_nudge', {
    commitment_id: byName.get('Tom Park').commitment_id,
    tone: 'gentle',
    channel: 'slack',
    recipient: byName.get('Tom Park').owner.slack_id,
    message_body: 'Heads up — you mentioned tracking API error budgets this quarter. Anything you need a hand with?',
  });
  assert((nudge as any).sent === true, 'manual send_nudge works on aspirational');

  await client.close();
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
