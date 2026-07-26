import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeCanonicalGitignore, loadCanonicalGitignore } from '../pack/canonical-gitignore.js';

describe('Init Command', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export initCommand function', async () => {
    const module = await import('../commands/init.js');
    expect(typeof module.initCommand).toBe('function');
  });

  it('writes canonical .gitignore with the shared superset rules', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nitro-init-gitignore-'));

    try {
      await writeCanonicalGitignore(projectDir);

      const written = await fs.readFile(path.join(projectDir, '.gitignore'), 'utf-8');
      const canonical = await loadCanonicalGitignore();

      expect(written).toBe(canonical);
      expect(written).toContain('node_modules/');
      expect(written).toContain('uploads/');
      expect(written).toContain('.env.*.local');
      expect(written).toContain('tokens.json');
      expect(written).toContain('*.pem');
      expect(await fs.pathExists(path.join(projectDir, '_gitignore'))).toBe(false);
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('ships template _gitignore placeholders (not .gitignore) for npm pack', async () => {
    const templatesRoot = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../templates',
    );

    for (const template of ['typescript-starter', 'typescript-pizzaz', 'typescript-oauth']) {
      const placeholder = path.join(templatesRoot, template, '_gitignore');
      const legacy = path.join(templatesRoot, template, '.gitignore');

      expect(await fs.pathExists(placeholder)).toBe(true);
      expect(await fs.pathExists(legacy)).toBe(false);

      const content = await fs.readFile(placeholder, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('tokens.json');
    }
  });
});
