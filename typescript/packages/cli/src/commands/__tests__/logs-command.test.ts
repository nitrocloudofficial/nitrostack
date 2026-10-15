import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { logsCommand } from '../logs.js';
import { saveProjectConfig } from '../../project/project-config.js';
import { saveConfig } from '../../auth/token-store.js';
import { StudioApiClient } from '../../api/client.js';

describe('Logs CLI Command', () => {
  const testDir = path.join(os.tmpdir(), `nitro-logs-cmd-test-${Date.now()}`);
  const testConfigFile = path.join(testDir, 'config.json');
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    await fs.remove(testDir);
    await fs.mkdirp(testDir);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await saveConfig(
      {
        token: 'test_logs_token',
        apiUrl: 'https://api.nitrocloud.ai/api/v1',
      },
      testConfigFile,
    );

    await saveProjectConfig(
      {
        organizationId: 'org_logs_test',
        appId: 'app_logs_test',
        appName: 'logs-app',
        linkedAt: new Date().toISOString(),
        latestDeploymentId: 'dpl_saved_recent_1',
      },
      testDir,
    );
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    await fs.remove(testDir);
  });

  it('automatically resolves target deployment ID from .nitro/project.json', async () => {
    const mockClient = {
      request: jest.fn<any>().mockImplementation(async (endpoint: string) => {
        if (endpoint.includes('/logs/build')) {
          return {
            lines: [
              '[builder] Compiling code...',
              '[builder] Container built successfully',
            ],
            nextOffset: 2,
            eof: true,
          };
        }
        return {};
      }),
    } as unknown as StudioApiClient;

    const result = await logsCommand(undefined, {
      cwd: testDir,
      client: mockClient,
      token: 'test_logs_token',
    });

    expect(result.deploymentId).toBe('dpl_saved_recent_1');
    expect(result.linesCount).toBe(2);
    expect(mockClient.request).toHaveBeenCalledWith(
      expect.stringContaining('/deployments/dpl_saved_recent_1/logs/build'),
    );
  });

  it('uses explicitly provided deployment ID argument', async () => {
    const mockClient = {
      request: jest.fn<any>().mockResolvedValue({
        lines: ['[builder] Custom deployment log'],
        nextOffset: 1,
        eof: true,
      }),
    } as unknown as StudioApiClient;

    const result = await logsCommand('dpl_custom_999', {
      cwd: testDir,
      client: mockClient,
      token: 'test_logs_token',
    });

    expect(result.deploymentId).toBe('dpl_custom_999');
    expect(result.linesCount).toBe(1);
    expect(mockClient.request).toHaveBeenCalledWith(
      expect.stringContaining('/deployments/dpl_custom_999/logs/build'),
    );
  });

  it('streams runtime logs when --runtime flag is passed', async () => {
    const mockClient = {
      request: jest.fn<any>().mockResolvedValue({
        deploymentLog: '[runtime] listening on port 3000\n[runtime] ping received',
      }),
    } as unknown as StudioApiClient;

    const result = await logsCommand('dpl_runtime_test', {
      cwd: testDir,
      client: mockClient,
      token: 'test_logs_token',
      runtime: true,
    });

    expect(result.linesCount).toBe(2);
    expect(mockClient.request).toHaveBeenCalledWith(
      expect.stringContaining('/deployments/dpl_runtime_test/logs/deployment'),
    );
  });

  it('follows log stream continuously until EOF is reached', async () => {
    let callCount = 0;
    const mockClient = {
      request: jest.fn<any>().mockImplementation(async (endpoint: string) => {
        if (endpoint.includes('/logs/build')) {
          callCount++;
          if (callCount === 1) {
            return {
              lines: ['Line 1: starting build'],
              nextOffset: 1,
              eof: false,
            };
          }
          return {
            lines: ['Line 2: completed build'],
            nextOffset: 2,
            eof: true,
          };
        }
        if (endpoint.includes('/status')) {
          return { status: 'READY', isTerminal: true };
        }
        return {};
      }),
    } as unknown as StudioApiClient;

    const result = await logsCommand('dpl_follow_test', {
      cwd: testDir,
      client: mockClient,
      token: 'test_logs_token',
      follow: true,
      pollIntervalMs: 5,
      sleepFn: async () => {},
    });

    expect(result.linesCount).toBe(2);
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('throws an error if no deployment ID is provided and no project is linked', async () => {
    await fs.remove(path.join(testDir, '.nitro'));

    const mockClient = {} as unknown as StudioApiClient;

    await expect(
      logsCommand(undefined, {
        cwd: testDir,
        client: mockClient,
        token: 'test_logs_token',
      }),
    ).rejects.toThrow('No deployment ID provided and no active deployment recorded');
  });
});
