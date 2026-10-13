const serviceUrl = process.env.DEPLOYED_SERVICE_URL?.replace(/\/$/, '');
const mcpUrl = process.env.DEPLOYED_MCP_URL;

if (!serviceUrl && !mcpUrl) {
  throw new Error('Set DEPLOYED_SERVICE_URL and/or DEPLOYED_MCP_URL. NitroCloud usually shows the service URL and an MCP URL ending in /sse.');
}

async function checkHealth(): Promise<void> {
  if (!serviceUrl) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7_000);
  try {
    const candidates = [`${serviceUrl}/health`, serviceUrl];
    let last = '';
    for (const url of candidates) {
      const response = await fetch(url, { signal: controller.signal });
      last = `${url} -> ${response.status}`;
      if (response.ok) {
        process.stdout.write(`Service reachable: ${last}\n`);
        return;
      }
    }
    throw new Error(`Service health check failed: ${last}`);
  } finally {
    clearTimeout(timer);
  }
}

async function checkMcpEndpoint(): Promise<void> {
  if (!mcpUrl) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await fetch(mcpUrl, {
      signal: controller.signal,
      headers: { Accept: 'text/event-stream, application/json' }
    });
    if (!response.ok) throw new Error(`MCP endpoint returned ${response.status}: ${await response.text()}`);
    process.stdout.write(`MCP endpoint reachable: ${mcpUrl} (${response.status}, ${response.headers.get('content-type') ?? 'unknown content type'})\n`);
    await response.body?.cancel();
  } finally {
    clearTimeout(timer);
  }
}

await checkHealth();
await checkMcpEndpoint();
