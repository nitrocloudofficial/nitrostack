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
