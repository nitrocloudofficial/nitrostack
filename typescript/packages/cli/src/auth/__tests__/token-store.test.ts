import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  loadConfig,
  saveConfig,
  clearConfig,
  DEFAULT_API_URL,
} from '../token-store.js';

describe('Token Store', () => {
  const testDir = path.join(os.tmpdir(), `nitro-token-store-test-${Date.now()}`);
  const testConfigFile = path.join(testDir, 'config.json');

  beforeEach(async () => {
    delete process.env.NITRO_TOKEN;
    delete process.env.NITRO_API_URL;
    delete process.env.NITRO_CONFIG_PATH;
    await fs.remove(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  it('should return default configuration when no file exists', async () => {
    const config = await loadConfig(testConfigFile);
    expect(config.apiUrl).toBe(DEFAULT_API_URL);
    expect(config.token).toBeUndefined();
    expect(config.user).toBeUndefined();
  });

  it('should respect NITRO_TOKEN and NITRO_API_URL environment variables', async () => {
    process.env.NITRO_TOKEN = 'env_secret_token';
    process.env.NITRO_API_URL = 'https://custom-api.nitrocloud.ai';

    const config = await loadConfig(testConfigFile);
    expect(config.token).toBe('env_secret_token');
    expect(config.apiUrl).toBe('https://custom-api.nitrocloud.ai');
  });

  it('should save and reload configuration with user details', async () => {
    await saveConfig(
      {
        token: 'stored_token_xyz',
        apiUrl: 'https://preview-api.nitrocloud.ai',
        user: {
          id: 'user_123',
          email: 'jane@nitrostack.ai',
          name: 'Jane Developer',
        },
      },
      testConfigFile,
    );

    const config = await loadConfig(testConfigFile);
    expect(config.token).toBe('stored_token_xyz');
    expect(config.apiUrl).toBe('https://preview-api.nitrocloud.ai');
    expect(config.user?.email).toBe('jane@nitrostack.ai');
    expect(config.user?.name).toBe('Jane Developer');

    // Verify file mode permissions on unix
    if (process.platform !== 'win32') {
      const stats = await fs.stat(testConfigFile);
      expect(stats.mode & 0o777).toBe(0o600);
    }
  });

  it('should update partial configuration without losing existing data', async () => {
    await saveConfig(
      {
        token: 'initial_token',
        user: { id: 'u1', email: 'test@nitrostack.ai' },
      },
      testConfigFile,
    );

    // Update only user name
    await saveConfig(
      {
        user: { id: 'u1', email: 'test@nitrostack.ai', name: 'Updated Name' },
      },
      testConfigFile,
    );

    const config = await loadConfig(testConfigFile);
    expect(config.token).toBe('initial_token');
    expect(config.user?.name).toBe('Updated Name');
  });

  it('should clear stored configuration', async () => {
    await saveConfig({ token: 'will_be_cleared' }, testConfigFile);
    expect(await fs.pathExists(testConfigFile)).toBe(true);

    await clearConfig(testConfigFile);
    expect(await fs.pathExists(testConfigFile)).toBe(false);

    const config = await loadConfig(testConfigFile);
    expect(config.token).toBeUndefined();
  });
});
