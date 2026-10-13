/**
 * Demo Traffic Generator Script
 * 
 * Simulates continuous agent activity routing through Sentinel Gateway.
 * Run with: npx tsx src/scripts/demo-traffic.ts
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

const agents = ['sales-bot', 'data-analyst', 'support-bot'];
const calls = [
  { agentId: 'sales-bot', serverName: 'crm-server', toolName: 'get_customer', args: { customerId: 'cust-001' } },
  { agentId: 'sales-bot', serverName: 'crm-server', toolName: 'search_customers', args: { query: 'Acme' } },
  { agentId: 'data-analyst', serverName: 'filesystem-server', toolName: 'read_file', args: { path: '/config.yaml' } },
  { agentId: 'data-analyst', serverName: 'filesystem-server', toolName: 'list_directory', args: { path: '/logs' } },
  { agentId: 'sales-bot', serverName: 'email-server', toolName: 'list_inbox', args: { unreadOnly: true } },
];

async function sendCall(call: typeof calls[0]) {
  try {
    const res = await fetch(`${GATEWAY_URL}/call_tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(call),
    });
    const data = (await res.json()) as { status?: string };
    console.log(`[TRAFFIC] ${call.agentId} -> ${call.serverName}/${call.toolName}:`, data.status || 'OK');
  } catch (err) {
    console.error(`[TRAFFIC ERROR] ${call.agentId} -> ${call.serverName}/${call.toolName}:`, err instanceof Error ? err.message : err);
  }
}

async function loop() {
  console.log('📡 Starting background traffic generator...');
  while (true) {
    const randomCall = calls[Math.floor(Math.random() * calls.length)];
    await sendCall(randomCall);
    await new Promise((r) => setTimeout(r, 4000));
  }
}

loop();
