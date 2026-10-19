import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import {
  loadProjectConfig,
  saveProjectConfig,
  removeProjectConfig,
  ensureGitignoreContainsNitro,
  getProjectConfigPath,
  NitroProjectConfig,
} from '../project-config.js';

describe('Project Config (.nitro/project.json)', () => {
  const testDir = path.join(os.tmpdir(), `nitro-project-cfg-test-${Date.now()}`);

  beforeEach(async () => {
    await fs.remove(testDir);
    await fs.mkdirp(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('loadProjectConfig returns null when no .nitro/project.json exists', async () => {
    const config = await loadProjectConfig(testDir);
    expect(config).toBeNull();
  });

  it('saveProjectConfig creates .nitro/project.json and loadProjectConfig reads it', async () => {
    const mockConfig: NitroProjectConfig = {
      organizationId: 'org_123',
      orgSlug: 'acme-corp',
      orgName: 'Acme Corp',
      appId: 'app_456',
      appName: 'weather-mcp',
      linkedAt: '2026-10-15T12:00:00.000Z',
    };

    await saveProjectConfig(mockConfig, testDir);
    const configPath = getProjectConfigPath(testDir);
    expect(await fs.pathExists(configPath)).toBe(true);

    const loaded = await loadProjectConfig(testDir);
    expect(loaded).toEqual(mockConfig);
  });

  it('removeProjectConfig safely deletes project.json and empty directory', async () => {
    const mockConfig: NitroProjectConfig = {
      organizationId: 'org_123',
      appId: 'app_456',
      appName: 'weather-mcp',
      linkedAt: new Date().toISOString(),
    };

    await saveProjectConfig(mockConfig, testDir);
    const configPath = getProjectConfigPath(testDir);
    expect(await fs.pathExists(configPath)).toBe(true);

    const removed = await removeProjectConfig(testDir);
    expect(removed).toBe(true);
    expect(await fs.pathExists(configPath)).toBe(false);
  });

  it('ensureGitignoreContainsNitro creates .gitignore if absent', async () => {
    const gitignorePath = path.join(testDir, '.gitignore');
    expect(await fs.pathExists(gitignorePath)).toBe(false);

    const updated = await ensureGitignoreContainsNitro(testDir);
    expect(updated).toBe(true);
    expect(await fs.pathExists(gitignorePath)).toBe(true);

    const content = await fs.readFile(gitignorePath, 'utf8');
    expect(content).toContain('.nitro');
  });

  it('ensureGitignoreContainsNitro appends .nitro if not present and avoids duplicates', async () => {
    const gitignorePath = path.join(testDir, '.gitignore');
    await fs.writeFile(gitignorePath, 'node_modules/\ndist/\n');

    const firstRun = await ensureGitignoreContainsNitro(testDir);
    expect(firstRun).toBe(true);

    let content = await fs.readFile(gitignorePath, 'utf8');
    expect(content).toContain('.nitro');

    // Run again - should detect presence and not duplicate
    const secondRun = await ensureGitignoreContainsNitro(testDir);
    expect(secondRun).toBe(false);

    content = await fs.readFile(gitignorePath, 'utf8');
    const occurrences = (content.match(/\.nitro/g) || []).length;
    expect(occurrences).toBe(1);
  });
});
