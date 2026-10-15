import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { loginCommand } from '../login.js';
import { logoutCommand } from '../logout.js';
import { whoamiCommand } from '../whoami.js';
import { loadConfig } from '../../auth/token-store.js';

describe('Auth CLI Commands (login, logout, whoami)', () => {
  const testDir = path.join(os.tmpdir(), `nitro-auth-cmd-test-${Date.now()}`);
  const testConfigFile = path.join(testDir, 'config.json');

  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    delete process.env.NITRO_TOKEN;
    delete process.env.NITRO_API_URL;
    await fs.remove(testDir);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalFetch = global.fetch;
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    global.fetch = originalFetch;
    await fs.remove(testDir);
  });

  it('should authenticate directly using --token flag (headless mode)', async () => {
    global.fetch = jest.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: { _id: 'u99', email: 'ci@nitrostack.ai', name: 'CI Bot' },
      }),
    })) as unknown as typeof fetch;

    const token = await loginCommand({
      token: 'ci_static_token_123',
      apiUrl: 'https://api.nitrocloud.ai/api/v1',
      configPath: testConfigFile,
      skipPrompt: true,
    });

    expect(token).toBe('ci_static_token_123');

    const config = await loadConfig(testConfigFile);
    expect(config.token).toBe('ci_static_token_123');
    expect(config.user?.email).toBe('ci@nitrostack.ai');
  });

  it('should perform browser loopback login flow', async () => {
    global.fetch = jest.fn().mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/auth/me')) {
        return {
          ok: true,
          json: async () => ({
            data: { _id: 'u100', email: 'browser-user@nitrocloud.ai', name: 'Browser User' },
          }),
        };
      }
      return originalFetch(url);
    }) as unknown as typeof fetch;

    const loginPromise = loginCommand({
      apiUrl: 'https://api.nitrocloud.ai/api/v1',
      configPath: testConfigFile,
      skipPrompt: true,
      openBrowser: async (url) => {
        // Simulate browser receiving the redirect from NitroCloud and pinging localhost
        const parsed = new URL(url);
        const redirectUri = parsed.searchParams.get('redirect_uri')!;
        const state = parsed.searchParams.get('state')!;

        const cb = new URL(redirectUri);
        cb.searchParams.set('token', 'retrieved_browser_token');
        cb.searchParams.set('state', state);

        await originalFetch(cb.toString());
      },
    });

    const token = await loginPromise;
    expect(token).toBe('retrieved_browser_token');

    const config = await loadConfig(testConfigFile);
    expect(config.token).toBe('retrieved_browser_token');
    expect(config.user?.email).toBe('browser-user@nitrocloud.ai');
  });

  it('whoami prints unauthenticated status when no token exists', async () => {
    await whoamiCommand({ configPath: testConfigFile });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No active session found'));
  });

  it('whoami prints user info when authenticated', async () => {
    await loginCommand({
      token: 'tok_whoami',
      apiUrl: 'https://api.nitrocloud.ai/api/v1',
      configPath: testConfigFile,
      skipPrompt: true,
    });

    global.fetch = jest.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        data: { _id: 'u1', email: 'verified@nitrocloud.ai', name: 'Verified User' },
      }),
    })) as unknown as typeof fetch;

    await whoamiCommand({ configPath: testConfigFile });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Logged in as:'));
  });

  it('logout command removes credentials', async () => {
    await loginCommand({
      token: 'to_be_deleted',
      apiUrl: 'https://api.nitrocloud.ai/api/v1',
      configPath: testConfigFile,
      skipPrompt: true,
    });

    let config = await loadConfig(testConfigFile);
    expect(config.token).toBe('to_be_deleted');

    await logoutCommand({ configPath: testConfigFile });

    config = await loadConfig(testConfigFile);
    expect(config.token).toBeUndefined();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Logged Out'));
  });
});
