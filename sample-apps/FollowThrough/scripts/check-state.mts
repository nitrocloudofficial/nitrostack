import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  cwd: process.cwd(),
  env: { ...process.env },
});

const client = new Client({ name: 'check-state', version: '1.0.0' });

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text;
  if (typeof text === 'string') {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return res;
}

async function main() {
  await client.connect(transport);
  console.log('Connected. Querying live server state...\n');

  const q = (await call('query_commitments', {})) as { count?: number; commitments?: any[] };
  const commitments = q.commitments ?? [];
  console.log(`=== COMMITMENTS (${q.count ?? commitments.length}) ===`);
  for (const c of commitments) {
    console.log(
      JSON.stringify({
        id: c.commitment_id,
        owner: c.owner?.name,
        what: c.what,
        status: c.status,
        due_date: c.due_date,
        updated_at: c.updated_at,
        linked_ticket_id: c.linked_ticket_id,
      })
    );
  }

  const ticketIds = [...new Set(commitments.map((c: any) => c.linked_ticket_id).filter(Boolean))];
  console.log(`\n=== TICKET STATUSES (${ticketIds.length}) ===`);
  for (const id of ticketIds) {
    const s = await call('linear_get_status', { ticket_id: id });
    console.log(JSON.stringify(s));
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
