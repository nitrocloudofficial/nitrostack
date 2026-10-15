import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  envPullCommand,
  envPushCommand,
  parseEnvContent,
  serializeEnvMap,
} from '../env.js';
import { saveProjectConfig } from '../../project/project-config.js';
import { saveConfig } from '../../auth/token-store.js';
import { StudioApiClient } from '../../api/client.js';

describe('Env CLI Commands (pull & push)', () => {
  const testDir = path.join(os.tmpdir(), `nitro-env-test-${Date.now()}`);
  const testConfigFile = path.join(testDir, 'config.json');
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(async () => {
    await fs.remove(testDir);
    await fs.mkdirp(testDir);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await saveConfig(
      {
        token: 'test_env_token',
        apiUrl: 'https://api.nitrocloud.ai/api/v1',
      },
      testConfigFile,
    );

    await saveProjectConfig(
      {
        organizationId: 'org_env',
        appId: 'app_env_vault',
        appName: 'env-vault-service',
        linkedAt: new Date().toISOString(),
      },
      testDir,
    );
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    await fs.remove(testDir);
  });

  describe('parseEnvContent & serializeEnvMap', () => {
    it('parses unquoted and quoted lines with comments and whitespace', () => {
      const content = `
# System Config
DATABASE_URL="postgres://user:pass@localhost:5432/db"
API_KEY=secret_key_123
EMPTY_VALUE=
SINGLE_QUOTED='hello world'
# trailing comment
PORT=3000
`;
      const parsed = parseEnvContent(content);
      expect(parsed).toEqual({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
        API_KEY: 'secret_key_123',
        EMPTY_VALUE: '',
        SINGLE_QUOTED: 'hello world',
        PORT: '3000',
      });
    });

    it('serializes env map into clean .env format', () => {
      const map = {
        API_KEY: 'super_secret',
        GREETING: 'hello world',
      };
      const serialized = serializeEnvMap(map);
      expect(serialized).toContain('API_KEY=super_secret');
      expect(serialized).toContain('GREETING="hello world"');
    });
  });

  describe('envPullCommand', () => {
    it('pulls vault secrets, writes .env.local, and adds entry to .gitignore', async () => {
      const mockClient = {
        getAppEnv: jest.fn<any>().mockResolvedValue({
          OPENAI_API_KEY: 'sk-mock-12345',
          DATABASE_URL: 'postgres://production',
        }),
      } as unknown as StudioApiClient;

      const result = await envPullCommand('.env.local', {
        cwd: testDir,
        client: mockClient,
        token: 'test_env_token',
      });

      expect(result.count).toBe(2);
      expect(result.keys).toEqual(['OPENAI_API_KEY', 'DATABASE_URL']);

      const localPath = path.join(testDir, '.env.local');
      expect(await fs.pathExists(localPath)).toBe(true);

      const content = await fs.readFile(localPath, 'utf8');
      expect(content).toContain('OPENAI_API_KEY=sk-mock-12345');
      expect(content).toContain('DATABASE_URL=postgres://production');

      // Verify .gitignore contains .env.local
      const gitignore = await fs.readFile(path.join(testDir, '.gitignore'), 'utf8');
      expect(gitignore).toContain('.env.local');
    });

    it('creates a .backup file before overwriting existing local environment', async () => {
      const localPath = path.join(testDir, '.env.local');
      await fs.writeFile(localPath, 'OLD_SECRET=previous_val\n', 'utf8');

      const mockClient = {
        getAppEnv: jest.fn<any>().mockResolvedValue({
          NEW_SECRET: 'new_val',
        }),
      } as unknown as StudioApiClient;

      const result = await envPullCommand('.env.local', {
        cwd: testDir,
        client: mockClient,
        token: 'test_env_token',
      });

      expect(result.backupPath).toBeDefined();
      expect(await fs.pathExists(result.backupPath!)).toBe(true);

      const backupContent = await fs.readFile(result.backupPath!, 'utf8');
      expect(backupContent).toContain('OLD_SECRET=previous_val');
    });
  });

  describe('envPushCommand', () => {
    it('reads local environment file and persists key-value pairs into vault', async () => {
      const localPath = path.join(testDir, '.env.local');
      await fs.writeFile(
        localPath,
        'STRIPE_KEY=sk_test_999\nAUTH_SECRET="long random string"\n',
        'utf8',
      );

      const mockClient = {
        updateAppEnv: jest.fn<any>().mockResolvedValue({
          STRIPE_KEY: 'sk_test_999',
          AUTH_SECRET: 'long random string',
        }),
      } as unknown as StudioApiClient;

      const result = await envPushCommand('.env.local', {
        cwd: testDir,
        client: mockClient,
        token: 'test_env_token',
      });

      expect(result.count).toBe(2);
      expect(result.keys).toEqual(['STRIPE_KEY', 'AUTH_SECRET']);
      expect(mockClient.updateAppEnv).toHaveBeenCalledWith('app_env_vault', {
        STRIPE_KEY: 'sk_test_999',
        AUTH_SECRET: 'long random string',
      });
    });

    it('throws an error if source environment file is missing', async () => {
      const mockClient = {} as unknown as StudioApiClient;

      await expect(
        envPushCommand('non_existent.env', {
          cwd: testDir,
          client: mockClient,
          token: 'test_env_token',
        }),
      ).rejects.toThrow("Environment source file '");
    });
  });
});
