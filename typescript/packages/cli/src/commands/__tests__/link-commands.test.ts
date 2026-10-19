import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { linkCommand } from '../link.js';
import { unlinkCommand } from '../unlink.js';
import { loadProjectConfig } from '../../project/project-config.js';
import { StudioApiClient } from '../../api/client.js';

describe('Link & Unlink CLI Commands', () => {
  const testDir = path.join(os.tmpdir(), `nitro-link-cmd-test-${Date.now()}`);
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    await fs.remove(testDir);
    await fs.mkdirp(testDir);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    await fs.remove(testDir);
  });

  it('links headless with --org and --app flags', async () => {
    const config = await linkCommand({
      org: 'org_acme_1',
      app: 'app_mcp_1',
      cwd: testDir,
      token: 'fake_jwt_token',
    });

    expect(config.organizationId).toBe('org_acme_1');
    expect(config.appId).toBe('app_mcp_1');

    const loaded = await loadProjectConfig(testDir);
    expect(loaded?.organizationId).toBe('org_acme_1');
    expect(loaded?.appId).toBe('app_mcp_1');

    // Check .gitignore
    const gitignore = await fs.readFile(path.join(testDir, '.gitignore'), 'utf8');
    expect(gitignore).toContain('.nitro');
  });

  it('links interactively to an existing application', async () => {
    const mockClient = {
      getOrganizations: jest.fn<any>().mockResolvedValue([
        { _id: 'org_demo', name: 'Demo Org', slug: 'demo-org' },
      ]),
      getOrganizationApps: jest.fn<any>().mockResolvedValue([
        { _id: 'app_existing', name: 'existing-mcp-service' },
      ]),
      createApp: jest.fn<any>(),
    } as unknown as StudioApiClient;

    const mockPrompt = jest.fn<any>().mockImplementation(async (questions: any) => {
      const q = questions[0];
      if (q.name === 'orgId') {
        return { orgId: 'org_demo' };
      }
      if (q.name === 'appId') {
        return { appId: 'app_existing' };
      }
      return {};
    });

    const config = await linkCommand({
      cwd: testDir,
      token: 'fake_jwt_token',
      client: mockClient,
      promptFn: mockPrompt as any,
    });

    expect(config.organizationId).toBe('org_demo');
    expect(config.appId).toBe('app_existing');
    expect(config.appName).toBe('existing-mcp-service');
  });

  it('links interactively with [+ Create New App]', async () => {
    const mockClient = {
      getOrganizations: jest.fn<any>().mockResolvedValue([
        { _id: 'org_demo', name: 'Demo Org', slug: 'demo-org' },
      ]),
      getOrganizationApps: jest.fn<any>().mockResolvedValue([]),
      createApp: jest.fn<any>().mockResolvedValue({
        _id: 'app_brand_new_id',
        name: 'super-mcp-tool',
      }),
    } as unknown as StudioApiClient;

    const mockPrompt = jest.fn<any>().mockImplementation(async (questions: any) => {
      const q = questions[0];
      if (q.name === 'orgId') {
        return { orgId: 'org_demo' };
      }
      if (q.name === 'appId') {
        return { appId: '__create_new_app__' };
      }
      if (questions.some((item: any) => item.name === 'name')) {
        return {
          name: 'super-mcp-tool',
          description: 'A newly created MCP app',
        };
      }
      return {};
    });

    const config = await linkCommand({
      cwd: testDir,
      token: 'fake_jwt_token',
      client: mockClient,
      promptFn: mockPrompt as any,
    });

    expect(config.organizationId).toBe('org_demo');
    expect(config.appId).toBe('app_brand_new_id');
    expect(config.appName).toBe('super-mcp-tool');
    expect(mockClient.createApp).toHaveBeenCalledWith({
      name: 'super-mcp-tool',
      organizationId: 'org_demo',
      description: 'A newly created MCP app',
    });
  });

  it('unlinks project safely with -y flag', async () => {
    await linkCommand({
      org: 'org_to_unlink',
      app: 'app_to_unlink',
      cwd: testDir,
      token: 'fake_jwt_token',
    });

    expect(await loadProjectConfig(testDir)).not.toBeNull();

    const result = await unlinkCommand({
      cwd: testDir,
      yes: true,
    });

    expect(result).toBe(true);
    expect(await loadProjectConfig(testDir)).toBeNull();
  });

  it('unlink warns if project is not linked', async () => {
    const result = await unlinkCommand({
      cwd: testDir,
      yes: true,
    });

    expect(result).toBe(false);
  });
});
