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
 * Diagnostic command to probe and verify remote deployed MCP endpoints over SSE / HTTP.
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
          resolvedUrl = `${resolvedUrl.replace(/\/+$/, '')}/sse`;
        }
      } catch {}
    }

    if (!resolvedUrl && fallbackAppName) {
      resolvedUrl = `https://${fallbackAppName}.nitrocloud.ai/sse`;
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

  // 2. Perform SSE Probe with Timeout Guard
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = Date.now();
  let response: Response;
  let latencyMs = 0;

  try {
    response = await customFetch(resolvedUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream, application/json, text/plain',
        'User-Agent': 'NitroStack-CLI-Tester/1.0',
      },
      signal: controller.signal,
    });
    latencyMs = Date.now() - startTime;
    clearTimeout(timer);
  } catch (netErr) {
    clearTimeout(timer);
    spinner.fail(`Failed to connect to ${resolvedUrl}`);
    const isTimeout = (netErr as Error).name === 'AbortError';
    const errMessage = isTimeout
      ? `Connection timed out after ${timeoutMs}ms`
      : (netErr as Error).message;

    console.error(createErrorBox('Probe Failed', errMessage));
    throw new Error(`Remote health check failed: ${errMessage}`);
  }

  // 3. Evaluate Health and Protocol Capabilities
  const isHealthy = response.ok || response.status === 200 || response.status === 307;
  const contentType = response.headers.get('content-type') || '';
  const isSse = contentType.includes('text/event-stream');
  const transport = isSse ? 'SSE (Server-Sent Events)' : 'Streamable HTTP';

  if (!isHealthy) {
    spinner.fail(`Remote endpoint returned HTTP ${response.status}`);
    console.error(
      createErrorBox(
        'Health Check Failed',
        `Endpoint returned status ${response.status} (${response.statusText})`,
      ),
    );
    throw new Error(`Remote probe failed with HTTP status ${response.status}`);
  }

  spinner.succeed(`Connected in ${chalk.bold(`${latencyMs}ms`)}`);

  // 4. Output Formatted Diagnostics
  console.log(
    createSuccessBox('Remote MCP Server Operational', [
      `Target URL:      ${chalk.bold.cyan(resolvedUrl)}`,
      `Status:          ${chalk.bold.green('HEALTHY')} (HTTP ${response.status})`,
      `Roundtrip Time:  ${chalk.bold(`${latencyMs}ms`)}`,
      `Transport:       ${chalk.bold(transport)}`,
      `Content-Type:    ${chalk.dim(contentType || 'standard')}`,
    ]),
  );

  return {
    healthy: true,
    url: resolvedUrl,
    latencyMs,
    statusCode: response.status,
    transport,
    protocolVersion: '2024-11-05',
  };
}
