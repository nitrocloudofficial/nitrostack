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
 * Merges into an existing entry when present (preserves command/args/env) instead of
 * blindly overwriting a local stdio server with the same name.
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
  const existing = mcpConfig.mcpServers[serverName] || {};
  // Prefer URL-based remote entry; keep unrelated keys from an existing remote config.
  // If the existing entry was command-based only, replace with the remote URL entry.
  const nextEntry: CursorMcpServerEntry = {
    ...existing,
    url: options.mcpUrl,
  };
  // NitroCloud hosted MCP uses streamable HTTP / SSE at /mcp — leave transport unset
  // when Cursor can auto-detect; only set sse when the URL clearly uses SSE.
  if (/\/sse(\?|$)/i.test(options.mcpUrl)) {
    nextEntry.transport = 'sse';
  } else {
    delete nextEntry.transport;
  }
  // Drop local command wiring when registering a remote URL endpoint.
  delete nextEntry.command;
  delete nextEntry.args;

  mcpConfig.mcpServers[serverName] = nextEntry;

  await fs.writeJson(configPath, mcpConfig, { spaces: 2 });
  log(`Configured Cursor MCP server '${serverName}' in ${chalk.dim(configPath)}`, 'success');

  return {
    configPath,
    serverName,
  };
}
