import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import chalk from 'chalk';
import { log } from '../ui/branding.js';

export interface RegisterCursorOptions {
  appName: string;
  mcpUrl: string;
  scope?: 'global' | 'project';
  projectRoot?: string;
  cursorConfigPath?: string;
}

export interface CursorMcpServerEntry {
  url?: string;
  transport?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface CursorMcpConfig {
  mcpServers: Record<string, CursorMcpServerEntry>;
  [key: string]: any;
}

/**
 * Registers or updates a live remote MCP server endpoint in Cursor's configuration.
 */
export async function registerCursorMcpServer(
  options: RegisterCursorOptions,
): Promise<{ configPath: string; serverName: string }> {
  const scope = options.scope || 'global';
  let configPath = options.cursorConfigPath;

  if (!configPath) {
    if (scope === 'project') {
      configPath = path.join(
        path.resolve(options.projectRoot || process.cwd()),
        '.cursor',
        'mcp.json',
      );
    } else {
      configPath = path.join(os.homedir(), '.cursor', 'mcp.json');
    }
  }

  await fs.ensureDir(path.dirname(configPath));

  let mcpConfig: CursorMcpConfig = { mcpServers: {} };
  if (await fs.pathExists(configPath)) {
    try {
      const parsed = await fs.readJson(configPath);
      if (parsed && typeof parsed === 'object') {
        mcpConfig = parsed;
        if (!mcpConfig.mcpServers || typeof mcpConfig.mcpServers !== 'object') {
          mcpConfig.mcpServers = {};
        }
      }
    } catch {
      mcpConfig = { mcpServers: {} };
    }
  }

  const serverName = options.appName;
  mcpConfig.mcpServers[serverName] = {
    url: options.mcpUrl,
    transport: 'sse',
  };

  await fs.writeJson(configPath, mcpConfig, { spaces: 2 });
  log(`Configured Cursor MCP server '${serverName}' in ${chalk.dim(configPath)}`, 'success');

  return {
    configPath,
    serverName,
  };
}
