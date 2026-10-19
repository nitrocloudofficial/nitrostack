import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { deployCommand } from '../deploy.js';
import { saveProjectConfig, loadProjectConfig } from '../../project/project-config.js';
import { saveConfig } from '../../auth/token-store.js';
import { StudioApiClient } from '../../api/client.js';

describe('Deploy CLI Command', () => {
  const testDir = path.join(os.tmpdir(), `nitro-deploy-cmd-test-${Date.now()}`);
  const testConfigFile = path.join(testDir, 'config.json');
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    await fs.remove(testDir);
    await fs.mkdirp(testDir);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create valid minimal NitroStack MCP project
    await fs.writeJSON(path.join(testDir, 'package.json'), {
      name: 'deployable-mcp-server',
      version: '1.0.0',
      dependencies: {
        '@nitrostack/core': '^1.0.0',
      },
    });
    await fs.mkdirp(path.join(testDir, 'src'));
    await fs.writeFile(path.join(testDir, 'src/index.ts'), 'export const hello = "world";');

    // Create session
    await saveConfig(
      {
        token: 'active_session_token_123',
        apiUrl: 'https://api.nitrocloud.ai/api/v1',
      },
      testConfigFile,
    );

    // Link project
    await saveProjectConfig(
      {
        organizationId: 'org_acme_prod',
        orgName: 'Acme Prod',
        appId: 'app_weather_service',
        appName: 'weather-service',
        linkedAt: new Date().toISOString(),
      },
      testDir,
    );
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    await fs.remove(testDir);
  });

  it('deploys in-memory package to S3, observes build logs, and confirms deployment without creating zip on disk', async () => {
    let s3UploadedBytes = 0;
    const mockFetch = (jest.fn<any>().mockImplementation(async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes('s3.amazonaws.com')) {
        expect(init?.method).toBe('PUT');
        expect(init?.headers?.['Content-Type']).toBe('application/octet-stream');
        s3UploadedBytes = init?.body?.length || 0;
        return { ok: true, status: 200, statusText: 'OK' };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    })) as unknown as typeof fetch;

    let pollCount = 0;
    const mockClient = {
      request: jest.fn<any>().mockImplementation(async (endpoint: string, init: any) => {
        if (endpoint === '/studio/apps/deployments/presign') {
          return {
            studioDeploymentId: 'sd_mock_555',
            presignedUrl: 'https://s3.amazonaws.com/nitro-builds/package.zip',
          };
        }
        if (endpoint.endsWith('/upload-complete')) {
          return { success: true };
        }
        if (endpoint.endsWith('/confirm')) {
          return {
            deploymentId: 'dpl_success_777',
            appId: 'app_weather_service',
          };
        }
        if (endpoint.includes('/status')) {
          pollCount++;
          if (pollCount === 1) {
            return {
              studioDeploymentId: 'sd_mock_555',
              status: 'BUILDING',
              isTerminal: false,
            };
          }
          return {
            studioDeploymentId: 'sd_mock_555',
            status: 'READY',
            isTerminal: true,
            serviceUrl: 'https://weather-service.nitrocloud.ai',
            mcpUrl: 'https://weather-service.nitrocloud.ai/sse',
          };
        }
        if (endpoint.includes('/logs')) {
          return {
            lines: [
              '[builder] Compiling MCP server...',
              '[builder] Build successful in 1.2s',
            ],
            nextOffset: 2,
            eof: true,
          };
        }
        return {};
      }),
    } as unknown as StudioApiClient;

    const result = await deployCommand({
      cwd: testDir,
      configPath: testConfigFile,
      client: mockClient,
      fetchFn: mockFetch,
      pollIntervalMs: 10,
      sleepFn: async () => {},
    });

    expect(result.deploymentId).toBe('dpl_success_777');
    expect(result.studioDeploymentId).toBe('sd_mock_555');
    expect(result.appName).toBe('weather-service');
    expect(result.status).toBe('READY');
    expect(result.mcpUrl).toBe('https://weather-service.nitrocloud.ai/sse');
    expect(result.filesIncluded).toBeGreaterThan(0);
    expect(result.zipSizeBytes).toBeGreaterThan(0);
    expect(s3UploadedBytes).toBe(result.zipSizeBytes);

    // Verify zero zip files exist on disk
    const dirFiles = await fs.readdir(testDir);
    expect(dirFiles.some((f) => f.endsWith('.zip'))).toBe(false);

    // Verify .nitro/project.json recorded latestDeploymentId
    const updatedProject = await loadProjectConfig(testDir);
    expect(updatedProject?.latestDeploymentId).toBe('dpl_success_777');
  });

  it('supports --no-wait to trigger deployment and exit immediately', async () => {
    // Remove existing link
    await fs.remove(path.join(testDir, '.nitro'));

    const mockFetch = (jest.fn<any>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    })) as unknown as typeof fetch;

    const mockClient = {
      request: jest.fn<any>().mockImplementation(async (endpoint: string) => {
        if (endpoint === '/studio/apps/deployments/presign') {
          return {
            studioDeploymentId: 'sd_headless_1',
            presignedUrl: 'https://s3.amazonaws.com/pkg.zip',
          };
        }
        if (endpoint.endsWith('/upload-complete')) return { success: true };
        if (endpoint.endsWith('/confirm')) {
          return { deploymentId: 'dpl_headless_1' };
        }
        return {};
      }),
    } as unknown as StudioApiClient;

    const result = await deployCommand({
      cwd: testDir,
      org: 'org_override_99',
      app: 'app_override_99',
      configPath: testConfigFile,
      client: mockClient,
      fetchFn: mockFetch,
      noWait: true,
    });

    expect(result.deploymentId).toBe('dpl_headless_1');
    expect(result.organizationId).toBe('org_override_99');
    expect(result.appId).toBe('app_override_99');

    // Should not poll status if noWait is true
    expect(mockClient.request).not.toHaveBeenCalledWith(
      expect.stringContaining('/status'),
      expect.anything(),
    );
  });

  it('handles build failure by dumping logs excerpt and throwing descriptive error', async () => {
    const mockFetch = (jest.fn<any>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    })) as unknown as typeof fetch;

    const mockClient = {
      request: jest.fn<any>().mockImplementation(async (endpoint: string) => {
        if (endpoint === '/studio/apps/deployments/presign') {
          return {
            studioDeploymentId: 'sd_failed_1',
            presignedUrl: 'https://s3.amazonaws.com/pkg.zip',
          };
        }
        if (endpoint.endsWith('/upload-complete')) return { success: true };
        if (endpoint.endsWith('/confirm')) {
          return { deploymentId: 'dpl_failed_1' };
        }
        if (endpoint.includes('/status')) {
          return {
            studioDeploymentId: 'sd_failed_1',
            status: 'FAILED',
            isTerminal: true,
            errorMessage: 'Syntax error in src/index.ts at line 14',
          };
        }
        if (endpoint.includes('/logs')) {
          return {
            lines: [
              '[builder] Compiling...',
              '[builder] error TS1005: ";" expected in src/index.ts:14',
            ],
            nextOffset: 2,
            eof: true,
          };
        }
        return {};
      }),
    } as unknown as StudioApiClient;

    await expect(
      deployCommand({
        cwd: testDir,
        configPath: testConfigFile,
        client: mockClient,
        fetchFn: mockFetch,
        sleepFn: async () => {},
      }),
    ).rejects.toThrow('Deployment failed (FAILED): Syntax error in src/index.ts at line 14');
  });

  it('automatically configures Cursor MCP server when --cursor-project is passed', async () => {
    const mockFetch = (jest.fn<any>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    })) as unknown as typeof fetch;

    const mockClient = {
      request: jest.fn<any>().mockImplementation(async (endpoint: string) => {
        if (endpoint === '/studio/apps/deployments/presign') {
          return {
            studioDeploymentId: 'sd_cursor_1',
            presignedUrl: 'https://s3.amazonaws.com/pkg.zip',
          };
        }
        if (endpoint.endsWith('/upload-complete')) return { success: true };
        if (endpoint.endsWith('/confirm')) return { deploymentId: 'dpl_cursor_1' };
        if (endpoint.includes('/status')) {
          return {
            status: 'READY',
            isTerminal: true,
            serviceUrl: 'https://weather-service.nitrocloud.ai',
            mcpUrl: 'https://weather-service.nitrocloud.ai/sse',
          };
        }
        if (endpoint.includes('/logs')) {
          return { lines: [], nextOffset: 0, eof: true };
        }
        return {};
      }),
    } as unknown as StudioApiClient;

    await deployCommand({
      cwd: testDir,
      configPath: testConfigFile,
      client: mockClient,
      fetchFn: mockFetch,
      cursorProject: true,
      sleepFn: async () => {},
    });

    const cursorConfigPath = path.join(testDir, '.cursor', 'mcp.json');
    expect(await fs.pathExists(cursorConfigPath)).toBe(true);
    const cursorConfig = await fs.readJson(cursorConfigPath);
    expect(cursorConfig.mcpServers['weather-service']).toEqual({
      url: 'https://weather-service.nitrocloud.ai/sse',
      transport: 'sse',
    });
  });
});

