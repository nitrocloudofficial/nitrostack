import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { testRemoteCommand } from '../test-remote.js';
import { saveProjectConfig } from '../../project/project-config.js';
import { saveConfig } from '../../auth/token-store.js';
import { StudioApiClient } from '../../api/client.js';

describe('Test Remote CLI Command', () => {
  const testDir = path.join(os.tmpdir(), `nitro-test-remote-${Date.now()}`);
  const testConfigFile = path.join(testDir, 'config.json');
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    await fs.remove(testDir);
    await fs.mkdirp(testDir);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await saveConfig(
      {
        token: 'test_token',
        apiUrl: 'https://api.nitrocloud.ai/api/v1',
      },
      testConfigFile,
    );

    await saveProjectConfig(
      {
        organizationId: 'org_1',
        appId: 'app_1',
        appName: 'remote-test-app',
        linkedAt: new Date().toISOString(),
        latestDeploymentId: 'dpl_remote_active',
      },
      testDir,
    );
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    await fs.remove(testDir);
  });

  it('probes a direct HTTP URL target successfully', async () => {
    const mockFetch = (jest.fn<any>().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (header: string) =>
          header.toLowerCase() === 'content-type' ? 'text/event-stream' : null,
      },
    })) as unknown as typeof fetch;

    const result = await testRemoteCommand('https://my-server.nitrocloud.ai/sse', {
      cwd: testDir,
      fetchFn: mockFetch,
    });

    expect(result.healthy).toBe(true);
    expect(result.url).toBe('https://my-server.nitrocloud.ai/sse');
    expect(result.statusCode).toBe(200);
    expect(result.transport).toContain('SSE');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://my-server.nitrocloud.ai/sse',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: expect.stringContaining('text/event-stream'),
        }),
      }),
    );
  });

  it('resolves remote URL from project deployment status when target is omitted', async () => {
    const mockClient = {
      request: jest.fn<any>().mockImplementation(async (endpoint: string) => {
        if (endpoint.includes('/status')) {
          return {
            status: 'READY',
            serviceUrl: 'https://remote-test-app.nitrocloud.ai',
            mcpUrl: 'https://remote-test-app.nitrocloud.ai/sse',
          };
        }
        return {};
      }),
    } as unknown as StudioApiClient;

    const mockFetch = (jest.fn<any>().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: () => 'application/json',
      },
    })) as unknown as typeof fetch;

    const result = await testRemoteCommand(undefined, {
      cwd: testDir,
      client: mockClient,
      fetchFn: mockFetch,
    });

    expect(result.healthy).toBe(true);
    expect(result.url).toBe('https://remote-test-app.nitrocloud.ai/sse');
    expect(result.statusCode).toBe(200);
  });

  it('fails with descriptive error if remote server returns HTTP 500', async () => {
    const mockFetch = (jest.fn<any>().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        get: () => null,
      },
    })) as unknown as typeof fetch;

    await expect(
      testRemoteCommand('https://error-service.nitrocloud.ai/sse', {
        cwd: testDir,
        fetchFn: mockFetch,
      }),
    ).rejects.toThrow('Remote probe failed with HTTP status 500');
  });

  describe('Streamable HTTP (/mcp) endpoints', () => {
    const mockResponse = (init: {
      status?: number;
      statusText?: string;
      headers?: Record<string, string>;
      body?: string;
    }) => {
      const status = init.status ?? 200;
      const headers = Object.fromEntries(
        Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
      );
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText: init.statusText ?? '',
        headers: { get: (h: string) => headers[h.toLowerCase()] ?? null },
        text: async () => init.body ?? '',
      };
    };

    const bodyOf = (call: any[]) => JSON.parse(String(call[1]?.body));

    it('runs an MCP handshake over POST instead of probing with GET', async () => {
      const mockFetch = jest.fn<any>().mockImplementation(async (_url: string, init: any) => {
        const msg = JSON.parse(String(init.body));
        if (msg.method === 'initialize') {
          return mockResponse({
            headers: { 'content-type': 'application/json', 'mcp-session-id': 'sess_123' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              result: { protocolVersion: '2025-06-18', serverInfo: { name: 'pizza' }, capabilities: {} },
            }),
          });
        }
        if (msg.method === 'notifications/initialized') {
          return mockResponse({ status: 202 });
        }
        if (msg.method === 'tools/list') {
          const tools = ['show_pizza_list', 'a', 'b', 'c', 'd'].map((name) => ({ name }));
          return mockResponse({
            headers: { 'content-type': 'text/event-stream' },
            body: `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools } })}\n\n`,
          });
        }
        return mockResponse({ status: 400 });
      });

      const result = await testRemoteCommand('https://pizza.dev.nitrocloud.ai/mcp', {
        cwd: testDir,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(result.healthy).toBe(true);
      expect(result.transport).toBe('Streamable HTTP');
      expect(result.protocolVersion).toBe('2025-06-18');
      expect(result.tools?.map((t) => t.name)).toContain('show_pizza_list');
      expect(result.tools).toHaveLength(5);

      const calls = mockFetch.mock.calls as any[][];
      expect(calls.every((c) => c[1]?.method === 'POST')).toBe(true);
      expect(calls.map((c) => bodyOf(c).method)).toEqual([
        'initialize',
        'notifications/initialized',
        'tools/list',
      ]);
      expect(calls[0][1].headers.Accept).toContain('text/event-stream');
      expect(calls[0][1].headers.Accept).toContain('application/json');
      expect(calls[2][1].headers['Mcp-Session-Id']).toBe('sess_123');
      expect(calls[2][1].headers['MCP-Protocol-Version']).toBe('2025-06-18');
    });

    it('reports an auth hint when the endpoint returns 401', async () => {
      const mockFetch = jest
        .fn<any>()
        .mockResolvedValue(mockResponse({ status: 401, statusText: 'Unauthorized' }));

      await expect(
        testRemoteCommand('https://secure.dev.nitrocloud.ai/mcp', {
          cwd: testDir,
          fetchFn: mockFetch as unknown as typeof fetch,
        }),
      ).rejects.toThrow('Remote probe failed with HTTP status 401');

      const printed = consoleErrorSpy.mock.calls.flat().map(String).join('\n');
      expect(printed).toContain('requires authentication');
    });

    it('fails when initialize returns a JSON-RPC error', async () => {
      const mockFetch = jest.fn<any>().mockResolvedValue(
        mockResponse({
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32600, message: 'Bad Request' } }),
        }),
      );

      await expect(
        testRemoteCommand('https://broken.dev.nitrocloud.ai/mcp', {
          cwd: testDir,
          fetchFn: mockFetch as unknown as typeof fetch,
        }),
      ).rejects.toThrow('Remote MCP handshake failed: Bad Request');
    });
  });

  it('enforces connection timeout guard', async () => {
    const mockFetch = (jest.fn<any>().mockImplementation(() => {
      const err = new Error('AbortError');
      err.name = 'AbortError';
      throw err;
    })) as unknown as typeof fetch;

    await expect(
      testRemoteCommand('https://slow-service.nitrocloud.ai/sse', {
        cwd: testDir,
        fetchFn: mockFetch,
        timeout: 50,
      }),
    ).rejects.toThrow('Connection timed out');
  });
});
