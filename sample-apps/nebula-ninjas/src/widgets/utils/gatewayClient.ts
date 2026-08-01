/**
 * Gateway Client Utility — Dynamic Public & Local Client-Side MCP Runner
 * 
 * Automatically connects to the local backend on localhost/127.0.0.1,
 * and seamlessly switches to the public HTTPS backend URL on remote cloud domains!
 */

const LOCAL_GATEWAY = 'http://127.0.0.1:3000';
const REMOTE_GATEWAY = 'https://yrs-productive-references-marsh.trycloudflare.com';

function getGatewayUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return REMOTE_GATEWAY;
    }
  }
  return LOCAL_GATEWAY;
}

let activeSessionId: string | null = null;

async function getOrInitSession(): Promise<string> {
  if (activeSessionId) return activeSessionId;

  const baseUrl = getGatewayUrl();
  const initRes = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'sentinel-web-dashboard', version: '1.0.0' },
      },
    }),
  });

  const sessId = initRes.headers.get('mcp-session-id');
  if (sessId) {
    activeSessionId = sessId;
    return activeSessionId;
  }

  throw new Error(`Could not establish session with Sentinel Gateway on ${baseUrl}`);
}

export async function executeGatewayTool(
  toolName: string,
  args: Record<string, unknown> = {},
  sdkCallTool?: (name: string, toolArgs?: Record<string, unknown>) => Promise<unknown>,
  sdkIsReady?: boolean,
): Promise<unknown> {
  const isInsideIframe = typeof window !== 'undefined' && window.parent !== window;

  // Use iframe host SDK ONLY if strictly inside an iframe container (e.g. NitroStudio)
  if (isInsideIframe && sdkIsReady && sdkCallTool) {
    try {
      const res = await sdkCallTool(toolName, args);
      return res;
    } catch (e) {
      console.warn('Iframe SDK callTool failed, falling back to direct MCP HTTP:', e);
    }
  }

  // Direct MCP HTTP call
  const targetToolName = toolName.startsWith('sentinel_') ? toolName : `sentinel_${toolName}`;
  const baseUrl = getGatewayUrl();

  let sessId = await getOrInitSession();

  let callRes = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Mcp-Session-Id': sessId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: targetToolName,
        arguments: args || {},
      },
    }),
  });

  // If session expired (400/404), re-initialize once and retry
  if (!callRes.ok && callRes.status >= 400) {
    activeSessionId = null;
    sessId = await getOrInitSession();
    callRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Mcp-Session-Id': sessId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: targetToolName,
          arguments: args || {},
        },
      }),
    });
  }

  const rawText = await callRes.text();

  // Parse SSE stream message event: event: message\ndata: {...}
  const dataMatch = rawText.match(/data:\s*(\{.*\})/);
  if (dataMatch) {
    const jsonRpcRes = JSON.parse(dataMatch[1]);

    if (jsonRpcRes.error) {
      throw new Error(jsonRpcRes.error.message || 'MCP Error');
    }

    const contentObj = jsonRpcRes.result?.content?.[0];
    if (contentObj?.text) {
      try {
        return JSON.parse(contentObj.text);
      } catch {
        return contentObj.text;
      }
    }

    return jsonRpcRes.result;
  }

  throw new Error(`Invalid gateway response format: ${rawText.substring(0, 100)}`);
}
