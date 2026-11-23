import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../auth/token-store.js';
import { loadProjectConfig } from '../project/project-config.js';
import { StudioApiClient } from '../api/client.js';
import { fetchDeploymentStatus } from '../deploy/status-poller.js';
import { NitroSpinner, createSuccessBox, createErrorBox, log } from '../ui/branding.js';

export interface TestRemoteOptions {
  timeout?: number | string;
  token?: string;
  apiUrl?: string;
  configPath?: string;
  cwd?: string;
  client?: StudioApiClient;
  fetchFn?: typeof fetch;
}

export interface RemoteTestResult {
  healthy: boolean;
  url: string;
  latencyMs: number;
  statusCode: number;
  transport: string;
  protocolVersion?: string;
  tools?: Array<{ name: string; description?: string }>;
}

/**
 * Diagnostic command to verify a remote deployed MCP endpoint. Streamable HTTP endpoints get a
 * real MCP handshake (initialize + tools/list); legacy /sse endpoints get a GET probe.
 */
export async function testRemoteCommand(
  targetArg?: string,
  options: TestRemoteOptions = {},
): Promise<RemoteTestResult> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const timeoutMs = options.timeout ? parseInt(String(options.timeout), 10) : 5000;
  const customFetch = options.fetchFn || fetch;

  console.log(chalk.bold('\nNitroStack Remote MCP Health Check ─ Diagnostic Probe\n'));

  // 1. Resolve Remote Endpoint URL
  let resolvedUrl = targetArg;

  if (!resolvedUrl || !resolvedUrl.startsWith('http')) {
    const config = await loadConfig(options.configPath);
    const token = options.token || config.token;

    let deploymentId = resolvedUrl;
    let fallbackAppName: string | undefined;

    if (!deploymentId) {
      const projectConfig = await loadProjectConfig(cwd);
      if (projectConfig?.latestDeploymentId) {
        deploymentId = projectConfig.latestDeploymentId;
      }
      fallbackAppName = projectConfig?.appName;
    }

    if (deploymentId && (token || options.client)) {
      const client =
        options.client ||
        (await StudioApiClient.create({
          token: token!,
          apiUrl: options.apiUrl || config.apiUrl,
          fetchFn: customFetch,
        }));

      try {
        const status = await fetchDeploymentStatus(client, deploymentId);
        resolvedUrl = status.mcpUrl || status.serviceUrl || status.appUrl;
        if (resolvedUrl && !resolvedUrl.endsWith('/sse') && !resolvedUrl.endsWith('/mcp')) {
          resolvedUrl = `${resolvedUrl.replace(/\/+$/, '')}/mcp`;
        }
      } catch {}
    }

    if (!resolvedUrl && fallbackAppName) {
      resolvedUrl = `https://${fallbackAppName}.nitrocloud.ai/mcp`;
    }
  }

  if (!resolvedUrl) {
    throw new Error(
      'Could not resolve remote endpoint URL. Please specify a URL or deployment ID:\n' +
        'Usage: nitrostack test-remote [url | deployment-id]',
    );
  }

  if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
    resolvedUrl = `https://${resolvedUrl}`;
  }

  const spinner = new NitroSpinner(`Connecting to ${chalk.cyan(resolvedUrl)}...`).start();

  // 2. Probe the endpoint.
  // Legacy SSE endpoints (/sse) are probed with GET. Streamable HTTP endpoints (/mcp) only
  // accept POST — a GET may legitimately return 405 — so for those we run a real MCP
  // handshake: initialize -> notifications/initialized -> tools/list.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();
  const isLegacySse = /\/sse\/?(?:[?#].*)?$/.test(resolvedUrl);

  let outcome: ProbeOutcome;
  try {
    outcome = isLegacySse
      ? await probeLegacySse(customFetch, resolvedUrl, controller.signal)
      : await probeStreamableHttp(customFetch, resolvedUrl, controller.signal);
  } catch (netErr) {
    spinner.fail(`Failed to connect to ${resolvedUrl}`);
    const isTimeout = (netErr as Error).name === 'AbortError';
    const errMessage = isTimeout
      ? `Connection timed out after ${timeoutMs}ms`
      : (netErr as Error).message;

    console.error(createErrorBox('Probe Failed', errMessage));
    throw new Error(`Remote health check failed: ${errMessage}`);
  } finally {
    clearTimeout(timer);
  }
  const latencyMs = Date.now() - startTime;

  // 3. Evaluate Health and Protocol Capabilities
  if (outcome.kind === 'http-error') {
    spinner.fail(`Remote endpoint returned HTTP ${outcome.status}`);
    const hint = httpErrorHint(outcome.status, isLegacySse);
    console.error(
      createErrorBox(
        'Health Check Failed',
        `Endpoint returned status ${outcome.status} (${outcome.statusText || 'no status text'})` +
          (hint ? `\n${hint}` : ''),
      ),
    );
    throw new Error(`Remote probe failed with HTTP status ${outcome.status}`);
  }

  if (outcome.kind === 'protocol-error') {
    spinner.fail('Remote endpoint did not complete the MCP handshake');
    console.error(createErrorBox('MCP Handshake Failed', outcome.message));
    throw new Error(`Remote MCP handshake failed: ${outcome.message}`);
  }

  const transport = isLegacySse ? 'SSE (Server-Sent Events)' : 'Streamable HTTP';
  spinner.succeed(`Connected in ${chalk.bold(`${latencyMs}ms`)}`);

  // 4. Output Formatted Diagnostics
  const lines = [
    `Target URL:     ${chalk.bold.cyan(resolvedUrl)}`,
    `Status:         ${chalk.bold.green('HEALTHY')} (HTTP ${outcome.status})`,
    `Latency:        ${chalk.bold(`${latencyMs}ms`)}`,
    `Transport:      ${chalk.bold(transport)}`,
    `Content-Type:   ${chalk.dim(outcome.contentType || 'standard')}`,
  ];
  if (outcome.serverName) {
    lines.push(`Server:         ${chalk.bold(outcome.serverName)}`);
  }
  if (outcome.protocolVersion) {
    lines.push(`Protocol:       ${chalk.bold(outcome.protocolVersion)}`);
  }
  if (outcome.tools) {
    const names = outcome.tools.map((t) => t.name);
    const shown = names.slice(0, 10).join(', ') + (names.length > 10 ? ', …' : '');
    lines.push(`Tools:          ${chalk.bold(String(names.length))}${names.length ? chalk.dim(` (${shown})`) : ''}`);
  }
  console.log(createSuccessBox('Remote MCP Server Operational', lines));

  return {
    healthy: true,
    url: resolvedUrl,
    latencyMs,
    statusCode: outcome.status,
    transport,
    protocolVersion: outcome.protocolVersion,
    tools: outcome.tools,
  };
}

// ── Probe helpers ────────────────────────────────────────────────────────────

const USER_AGENT = 'NitroStack-CLI-Tester/1.0';
const MCP_PROTOCOL_VERSION = '2025-06-18';

type ProbeOutcome =
  | { kind: 'http-error'; status: number; statusText?: string }
  | { kind: 'protocol-error'; status: number; message: string }
  | {
      kind: 'ok';
      status: number;
      contentType: string;
      protocolVersion?: string;
      serverName?: string;
      tools?: Array<{ name: string; description?: string }>;
    };

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: number | string | null;
  result?: any;
  error?: { code?: number; message?: string };
}

async function probeLegacySse(
  fetchFn: typeof fetch,
  url: string,
  signal: AbortSignal,
): Promise<ProbeOutcome> {
  const response = await fetchFn(url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream, application/json, text/plain',
      'User-Agent': USER_AGENT,
    },
    signal,
  });
  // The SSE stream stays open; we only needed the headers.
  void cancelBody(response);

  if (!response.ok && response.status !== 307) {
    return { kind: 'http-error', status: response.status, statusText: response.statusText };
  }
  return {
    kind: 'ok',
    status: response.status,
    contentType: response.headers.get('content-type') || '',
  };
}

async function probeStreamableHttp(
  fetchFn: typeof fetch,
  url: string,
  signal: AbortSignal,
): Promise<ProbeOutcome> {
  const init = await mcpPost(
    fetchFn,
    url,
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'nitrostack-cli-test-remote', version: '1.0.0' },
      },
    },
    { signal },
  );

  if (!init.response.ok) {
    void cancelBody(init.response);
    return { kind: 'http-error', status: init.response.status, statusText: init.response.statusText };
  }

  const initMsg = await readJsonRpcResponse(init.response, 1);
  if (!initMsg?.result) {
    const reason = initMsg?.error?.message || 'no initialize result in response';
    return { kind: 'protocol-error', status: init.response.status, message: reason };
  }

  const protocolVersion: string | undefined = initMsg.result.protocolVersion;
  const serverName: string | undefined = initMsg.result.serverInfo?.name;
  const sessionId = init.response.headers.get('mcp-session-id') || undefined;
  const followUp = { signal, sessionId, protocolVersion };

  const initialized = await mcpPost(
    fetchFn,
    url,
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    followUp,
  );
  void cancelBody(initialized.response);

  let tools: Array<{ name: string; description?: string }> | undefined;
  const list = await mcpPost(fetchFn, url, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, followUp);
  if (list.response.ok) {
    const listMsg = await readJsonRpcResponse(list.response, 2);
    if (Array.isArray(listMsg?.result?.tools)) {
      tools = listMsg!.result.tools.map((t: any) => ({ name: String(t.name), description: t.description }));
    }
  } else {
    void cancelBody(list.response);
  }

  return {
    kind: 'ok',
    status: init.response.status,
    contentType: init.response.headers.get('content-type') || '',
    protocolVersion,
    serverName,
    tools,
  };
}

async function mcpPost(
  fetchFn: typeof fetch,
  url: string,
  body: Record<string, unknown>,
  opts: { signal: AbortSignal; sessionId?: string; protocolVersion?: string },
): Promise<{ response: Response }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': USER_AGENT,
  };
  if (opts.sessionId) headers['Mcp-Session-Id'] = opts.sessionId;
  if (opts.protocolVersion) headers['MCP-Protocol-Version'] = opts.protocolVersion;

  const response = await fetchFn(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  return { response };
}

/**
 * Reads the JSON-RPC response with the given id from either a JSON body or an SSE stream.
 * For SSE, stops reading as soon as the matching message arrives instead of waiting for
 * the server to close the stream.
 */
async function readJsonRpcResponse(response: Response, id: number): Promise<JsonRpcMessage | undefined> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/event-stream')) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      const messages: JsonRpcMessage[] = Array.isArray(parsed) ? parsed : [parsed];
      return messages.find((m) => m && m.id === id);
    } catch {
      return undefined;
    }
  }

  const reader = response.body && typeof response.body.getReader === 'function' ? response.body.getReader() : undefined;
  if (!reader) {
    return findSseMessage(await response.text(), id);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      const found = findSseMessage(buffer, id);
      if (found || done) return found;
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
}

function findSseMessage(raw: string, id: number): JsonRpcMessage | undefined {
  for (const event of raw.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data) continue;
    try {
      const msg = JSON.parse(data) as JsonRpcMessage;
      if (msg && msg.id === id) return msg;
    } catch {
      // partial or non-JSON event — keep reading
    }
  }
  return undefined;
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // ignore
  }
}

function httpErrorHint(status: number, isLegacySse: boolean): string | undefined {
  if (status === 401 || status === 403) {
    return 'The server is reachable but requires authentication (e.g. OAuth). Connect with an authenticated MCP client.';
  }
  if (status === 405) {
    return isLegacySse
      ? 'The endpoint rejected GET. If this server uses Streamable HTTP, probe its /mcp URL instead.'
      : 'The endpoint rejected the MCP POST. Check that the URL points at the MCP route (usually /mcp).';
  }
  if (status === 404) {
    return 'No MCP route at this path. Deployed NitroStack servers usually serve MCP at /mcp.';
  }
  return undefined;
}
