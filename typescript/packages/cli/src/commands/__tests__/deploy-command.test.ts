import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { deployCommand } from '../deploy.js';
import { saveProjectConfig } from '../../project/project-config.js';
import { saveConfig } from '../../auth/token-store.js';
import { StudioApiClient } from '../../api/client.js';

describe('Deploy CLI Command', () => {
  const testDir = path.join(os.tmpdir(), `nitro-deploy-cmd-test-${Date.now()}`);
  const testConfigFile = path.join(testDir, 'config.json');
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    await fs.remove(testDir);
    await fs.mkdirp(testDir);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

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
    await fs.remove(testDir);
  });

  it('deploys in-memory package to S3 and confirms deployment without creating zip on disk', async () => {
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
        return {};
      }),
    } as unknown as StudioApiClient;

    const result = await deployCommand({
      cwd: testDir,
      configPath: testConfigFile,
      client: mockClient,
      fetchFn: mockFetch,
    });

    expect(result.deploymentId).toBe('dpl_success_777');
    expect(result.studioDeploymentId).toBe('sd_mock_555');
    expect(result.appName).toBe('weather-service');
    expect(result.filesIncluded).toBeGreaterThan(0);
    expect(result.zipSizeBytes).toBeGreaterThan(0);
    expect(s3UploadedBytes).toBe(result.zipSizeBytes);

    // Verify zero zip files exist on disk!
    const dirFiles = await fs.readdir(testDir);
    expect(dirFiles.some((f) => f.endsWith('.zip'))).toBe(false);
  });

  it('supports headless overrides for --org and --app', async () => {
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
    });

    expect(result.deploymentId).toBe('dpl_headless_1');
    expect(result.organizationId).toBe('org_override_99');
    expect(result.appId).toBe('app_override_99');
  });
});
