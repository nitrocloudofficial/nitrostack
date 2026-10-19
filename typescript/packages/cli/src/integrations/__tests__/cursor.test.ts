import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { registerCursorMcpServer } from '../cursor.js';

describe('Cursor MCP Integration', () => {
  const testDir = path.join(os.tmpdir(), `nitro-cursor-test-${Date.now()}`);
  const customConfigPath = path.join(testDir, '.cursor', 'mcp.json');

  beforeEach(async () => {
    await fs.remove(testDir);
    await fs.mkdirp(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('registers a new MCP server in cursor config', async () => {
    const result = await registerCursorMcpServer({
      appName: 'weather-mcp-service',
      mcpUrl: 'https://weather-mcp-service.nitrocloud.ai/sse',
      cursorConfigPath: customConfigPath,
    });

    expect(result.serverName).toBe('weather-mcp-service');
    expect(result.configPath).toBe(customConfigPath);

    const config = await fs.readJson(customConfigPath);
    expect(config.mcpServers).toBeDefined();
    expect(config.mcpServers['weather-mcp-service']).toEqual({
      url: 'https://weather-mcp-service.nitrocloud.ai/sse',
      transport: 'sse',
    });
  });

  it('preserves existing server configurations when registering a new server', async () => {
    await fs.ensureDir(path.dirname(customConfigPath));
    await fs.writeJson(customConfigPath, {
      mcpServers: {
        'existing-local-tool': {
          command: 'node',
          args: ['/path/to/server.js'],
        },
      },
    });

    await registerCursorMcpServer({
      appName: 'new-cloud-server',
      mcpUrl: 'https://new-cloud-server.nitrocloud.ai/sse',
      cursorConfigPath: customConfigPath,
    });

    const config = await fs.readJson(customConfigPath);
    expect(config.mcpServers['existing-local-tool']).toEqual({
      command: 'node',
      args: ['/path/to/server.js'],
    });
    expect(config.mcpServers['new-cloud-server']).toEqual({
      url: 'https://new-cloud-server.nitrocloud.ai/sse',
      transport: 'sse',
    });
  });

  it('supports project-scoped configuration file resolution', async () => {
    const projectRoot = path.join(testDir, 'my-project');
    await fs.mkdirp(projectRoot);

    const result = await registerCursorMcpServer({
      appName: 'scoped-server',
      mcpUrl: 'https://scoped.nitrocloud.ai/sse',
      scope: 'project',
      projectRoot,
    });

    const expectedPath = path.join(projectRoot, '.cursor', 'mcp.json');
    expect(result.configPath).toBe(expectedPath);
    expect(await fs.pathExists(expectedPath)).toBe(true);

    const config = await fs.readJson(expectedPath);
    expect(config.mcpServers['scoped-server'].url).toBe('https://scoped.nitrocloud.ai/sse');
  });

  it('recovers gracefully from corrupted or empty JSON config files', async () => {
    await fs.ensureDir(path.dirname(customConfigPath));
    await fs.writeFile(customConfigPath, '{ bad_json: invalid', 'utf8');

    await registerCursorMcpServer({
      appName: 'repaired-service',
      mcpUrl: 'https://repaired.nitrocloud.ai/sse',
      cursorConfigPath: customConfigPath,
    });

    const config = await fs.readJson(customConfigPath);
    expect(config.mcpServers['repaired-service']).toEqual({
      url: 'https://repaired.nitrocloud.ai/sse',
      transport: 'sse',
    });
  });
});
