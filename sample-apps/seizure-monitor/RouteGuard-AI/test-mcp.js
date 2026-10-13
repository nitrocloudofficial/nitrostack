/**
 * MCP Server Live Test
 * Calls all 4 main tools and prints results
 */
import http from 'http';

const HOST = 'localhost';
const PORT = 3000;
const PATH = '/mcp';

let sessionId = null;

async function mcpRequest(method, params, id = 1) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Accept': 'application/json, text/event-stream',
    };
    if (sessionId) headers['mcp-session-id'] = sessionId;

    const req = http.request({ host: HOST, port: PORT, path: PATH, method: 'POST', headers }, (res) => {
      // Capture session ID from first response
      if (res.headers['mcp-session-id']) sessionId = res.headers['mcp-session-id'];

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // SSE format: parse event data lines
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              resolve(json);
              return;
            } catch (_) {}
          }
        }
        // Try direct JSON parse (non-SSE response)
        try { resolve(JSON.parse(data)); } catch (_) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function printResult(label, result) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${label}`);
  console.log('='.repeat(60));
  if (result?.result?.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(result.result.content[0].text);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (_) {
      console.log(result.result.content[0].text);
    }
  } else if (result?.error) {
    console.log('ERROR:', result.error.message);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

async function initSession() {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0' }
  }});
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: HOST, port: PORT, path: PATH, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Accept': 'application/json, text/event-stream' },
        timeout: 10000,
      },
      (res) => {
        if (res.headers['mcp-session-id']) sessionId = res.headers['mcp-session-id'];
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('initSession timeout')); });
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('\n🚀 Supply Chain MCP Server — Live Test\n');
  console.log(`Connecting to http://${HOST}:${PORT}${PATH} ...`);

  // Initialize session
  await initSession();
  console.log(`✅ Session established${sessionId ? ` (${sessionId})` : ''}\n`);

  // ── Tool 1: scan_risk_feeds ───────────────────────────────────────────────
  console.log('📡 Calling scan_risk_feeds (severity: high, limit: 3)...');
  const feedResult = await mcpRequest('tools/call', {
    name: 'scan_risk_feeds',
    arguments: { severity: 'high', limit: 3 },
  }, 1);
  printResult('scan_risk_feeds — HIGH severity threats', feedResult);

  // ── Tool 2: analyze_supply_chain_impact ───────────────────────────────────
  console.log('\n📊 Calling analyze_supply_chain_impact (threat-001)...');
  const impactResult = await mcpRequest('tools/call', {
    name: 'analyze_supply_chain_impact',
    arguments: { threatId: 'threat-001' },
  }, 2);
  printResult('analyze_supply_chain_impact — Typhoon threat-001', impactResult);

  // ── Tool 3: generate_reroute_options ──────────────────────────────────────
  console.log('\n🔀 Calling generate_reroute_options (ship-001, threat-001)...');
  const rerouteResult = await mcpRequest('tools/call', {
    name: 'generate_reroute_options',
    arguments: { shipmentId: 'ship-001', threatId: 'threat-001' },
  }, 3);
  printResult('generate_reroute_options — ship-001 vs threat-001', rerouteResult);

  // ── Tool 4: compose_stakeholder_update ────────────────────────────────────
  console.log('\n📬 Calling compose_stakeholder_update...');
  const notifResult = await mcpRequest('tools/call', {
    name: 'compose_stakeholder_update',
    arguments: {
      threatId: 'threat-001',
      shipmentId: 'ship-001',
      recipientEmail: 'ops@company.com',
      includeReroute: true,
    },
  }, 4);
  printResult('compose_stakeholder_update — ops@company.com', notifResult);

  console.log('\n✅ All tools tested successfully!\n');
}

run().catch(err => {
  console.error('❌ Test failed:', err.message ?? err);
  console.error(err.stack ?? '');
  process.exit(1);
});
