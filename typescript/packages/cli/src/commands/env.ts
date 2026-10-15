import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { loadConfig } from '../auth/token-store.js';
import { loadProjectConfig } from '../project/project-config.js';
import { StudioApiClient, StudioApiError } from '../api/client.js';
import { ensureGitignoreContains } from '../utils/gitignore.js';
import { log, createSuccessBox } from '../ui/branding.js';

export interface EnvCommandOptions {
  app?: string;
  cwd?: string;
  token?: string;
  apiUrl?: string;
  client?: StudioApiClient;
  force?: boolean;
}

export interface EnvPullResult {
  destination: string;
  count: number;
  keys: string[];
  backupPath?: string;
}

export interface EnvPushResult {
  source: string;
  count: number;
  keys: string[];
}

/**
 * Parses a standard .env formatted string into key-value pairs.
 */
export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();

    // Strip wrapping quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    }

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Serializes key-value pairs into a clean .env formatted string.
 */
export function serializeEnvMap(env: Record<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    if (value.includes('\n') || value.includes(' ') || value.includes('"')) {
      lines.push(`${key}="${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}

/**
 * Pulls environment variables from NitroCloud Vault into a local file (e.g. .env.local).
 */
export async function envPullCommand(
  destination: string = '.env.local',
  options: EnvCommandOptions = {},
): Promise<EnvPullResult> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const destPath = path.isAbsolute(destination) ? destination : path.join(cwd, destination);

  const config = await loadConfig();
  const token = options.token || config.token;

  if (!token && !options.client) {
    throw new StudioApiError(
      'No active session found. Please run "nitrostack login" to authenticate.',
      401,
    );
  }

  const client =
    options.client ||
    (await StudioApiClient.create({
      token,
      apiUrl: options.apiUrl || config.apiUrl,
    }));

  let appId = options.app;
  let appName = 'NitroStack App';
  if (!appId) {
    const projectConfig = await loadProjectConfig(cwd);
    if (!projectConfig?.appId) {
      throw new Error(
        'Local workspace is not linked to a NitroCloud App. Run "nitrostack link" or specify --app <appId>.',
      );
    }
    appId = projectConfig.appId;
    appName = projectConfig.appName;
  }

  // 1. Fetch from vault
  const envVars = (await client.getAppEnv(appId)) || {};
  const keys = Object.keys(envVars);

  // 2. Ensure gitignore protects the destination secret file
  await ensureGitignoreContains(path.basename(destPath), cwd);

  // 3. Backup existing file if present
  let backupPath: string | undefined;
  if (await fs.pathExists(destPath)) {
    backupPath = `${destPath}.backup`;
    await fs.copy(destPath, backupPath);
  }

  // 4. Write new environment file
  await fs.ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, serializeEnvMap(envVars), 'utf8');

  log(`Successfully pulled ${chalk.bold(keys.length)} secrets from NitroCloud vault for ${chalk.cyan(appName)}`, 'success');
  if (backupPath) {
    log(`Backed up previous file to ${chalk.dim(backupPath)}`, 'dim');
  }

  return {
    destination: destPath,
    count: keys.length,
    keys,
    backupPath,
  };
}

/**
 * Pushes local environment variables into NitroCloud OpenBao vault.
 */
export async function envPushCommand(
  source: string = '.env.local',
  options: EnvCommandOptions = {},
): Promise<EnvPushResult> {
  const cwd = path.resolve(options.cwd || process.cwd());
  const sourcePath = path.isAbsolute(source) ? source : path.join(cwd, source);

  if (!(await fs.pathExists(sourcePath))) {
    throw new Error(`Environment source file '${sourcePath}' does not exist.`);
  }

  const config = await loadConfig();
  const token = options.token || config.token;

  if (!token && !options.client) {
    throw new StudioApiError(
      'No active session found. Please run "nitrostack login" to authenticate.',
      401,
    );
  }

  const client =
    options.client ||
    (await StudioApiClient.create({
      token,
      apiUrl: options.apiUrl || config.apiUrl,
    }));

  let appId = options.app;
  let appName = 'NitroStack App';
  if (!appId) {
    const projectConfig = await loadProjectConfig(cwd);
    if (!projectConfig?.appId) {
      throw new Error(
        'Local workspace is not linked to a NitroCloud App. Run "nitrostack link" or specify --app <appId>.',
      );
    }
    appId = projectConfig.appId;
    appName = projectConfig.appName;
  }

  // 1. Read and parse local secrets
  const rawContent = await fs.readFile(sourcePath, 'utf8');
  const envMap = parseEnvContent(rawContent);
  const keys = Object.keys(envMap);

  if (keys.length === 0) {
    log(`No environment variables found in ${chalk.dim(sourcePath)}`, 'warning');
    return {
      source: sourcePath,
      count: 0,
      keys: [],
    };
  }

  // 2. Encrypt & update OpenBao vault
  await client.updateAppEnv(appId, envMap);

  log(
    `Successfully pushed ${chalk.bold(keys.length)} environment variables to NitroCloud vault for ${chalk.cyan(appName)}`,
    'success',
  );

  return {
    source: sourcePath,
    count: keys.length,
    keys,
  };
}
