/**
 * Minimal MCP HTTP client
 *
 * The deployed server's /mcp endpoint is a standard MCP Streamable HTTP
 * transport (JSON-RPC over POST, responses framed as SSE "data:" lines,
 * CORS wide open). This is just enough of a client to call a single tool
 * from a plain browser page — no MCP SDK, no chat host required.
 */

const SERVER_URL = 'https://lab-report-triage-6a64d8e2-dhakshins-org-0ddc63d5.app.nitrocloud.ai/mcp';

let sessionId: string | null = null;
let nextId = 1;

async function rpc(method: string, params: unknown): Promise<{ result?: unknown; error?: { message: string } }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream'
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const res = await fetch(SERVER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params })
  });

  const returnedSession = res.headers.get('Mcp-Session-Id');
  if (returnedSession) sessionId = returnedSession;

  if (!res.ok) {
    throw new Error(`MCP request failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const dataLine = text
    .split('\n')
    .reverse()
    .find((line) => line.startsWith('data:'));

  if (!dataLine) {
    throw new Error('No data in MCP response');
  }

  return JSON.parse(dataLine.slice('data:'.length).trim());
}

async function ensureSession(): Promise<void> {
  if (sessionId) return;
  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'lab-report-triage-demo', version: '1.0.0' }
  });
}

/**
 * Call an MCP tool on the deployed server and return its structured output.
 */
export async function callMcpTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  await ensureSession();
  const response = await rpc('tools/call', { name, arguments: args });

  if (response.error) {
    throw new Error(response.error.message);
  }

  const result = response.result as { structuredContent?: T; content?: Array<{ type: string; text?: string }>; isError?: boolean };

  if (result.isError) {
    const message = result.content?.find((c) => c.type === 'text')?.text ?? 'Tool call failed';
    throw new Error(message);
  }

  if (result.structuredContent) {
    return result.structuredContent;
  }

  const textContent = result.content?.find((c) => c.type === 'text')?.text;
  if (textContent) {
    return JSON.parse(textContent);
  }

  throw new Error('No structured content in tool response');
}
