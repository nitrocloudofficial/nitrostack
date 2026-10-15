import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface NitroUser {
  id: string;
  email: string;
  name?: string;
}

export interface NitroConfig {
  apiUrl: string;
  cloudUrl?: string;
  token?: string;
  user?: NitroUser;
}

export const CONFIG_DIR = path.join(os.homedir(), '.nitrostack');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export const DEFAULT_API_URL = 'https://api.nitrocloud.ai/api/v1';

export function resolveConfigFilePath(customPath?: string): string {
  return customPath || process.env.NITRO_CONFIG_PATH || CONFIG_FILE;
}

/**
 * Loads the NitroStack CLI configuration, applying environment variable overrides.
 */
export async function loadConfig(customPath?: string): Promise<NitroConfig> {
  const filePath = resolveConfigFilePath(customPath);
  const envToken = process.env.NITRO_TOKEN;
  const envApiUrl = process.env.NITRO_API_URL;
  let fileConfig: Partial<NitroConfig> = {};

  if (await fs.pathExists(filePath)) {
    try {
      fileConfig = await fs.readJSON(filePath);
    } catch {
      fileConfig = {};
    }
  }

  return {
    apiUrl: envApiUrl || fileConfig.apiUrl || DEFAULT_API_URL,
    token: envToken || fileConfig.token,
    user: fileConfig.user,
  };
}

/**
 * Persists updated configuration fields to the local config store with 0600 permissions.
 */
export async function saveConfig(config: Partial<NitroConfig>, customPath?: string): Promise<void> {
  const filePath = resolveConfigFilePath(customPath);
  const dirPath = path.dirname(filePath);

  await fs.mkdirp(dirPath);
  try {
    await fs.chmod(dirPath, 0o700);
  } catch {}

  let existing: Partial<NitroConfig> = {};
  if (await fs.pathExists(filePath)) {
    try {
      existing = await fs.readJSON(filePath);
    } catch {
      existing = {};
    }
  }

  const merged: NitroConfig = {
    apiUrl: config.apiUrl || existing.apiUrl || DEFAULT_API_URL,
    token: config.token !== undefined ? config.token : existing.token,
    user: config.user !== undefined ? config.user : existing.user,
  };

  await fs.writeJSON(filePath, merged, { spaces: 2, mode: 0o600 });
  try {
    await fs.chmod(filePath, 0o600);
  } catch {}
}

/**
 * Clears the stored configuration and session credentials.
 */
export async function clearConfig(customPath?: string): Promise<void> {
  const filePath = resolveConfigFilePath(customPath);
  if (await fs.pathExists(filePath)) {
    await fs.remove(filePath);
  }
}
