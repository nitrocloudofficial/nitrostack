import { describe, it, expect } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { resolveTemplateName } from '../init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CLI Init Presets & Templates (NITRO-106-M1)', () => {
  it('resolves preset aliases correctly', () => {
    expect(resolveTemplateName({ preset: 'enterprise-search' })).toBe('typescript-enterprise-search');
    expect(resolveTemplateName({ preset: 'code-mode' })).toBe('typescript-code-mode');
    expect(resolveTemplateName({ template: 'enterprise-search' })).toBe('typescript-enterprise-search');
    expect(resolveTemplateName({ template: 'typescript-oauth' })).toBe('typescript-oauth');
    expect(resolveTemplateName({})).toBe('typescript-starter');
  });

  it('scaffolds enterprise-search preset with BM25SearchTransform', async () => {
    const tempDir = path.join(os.tmpdir(), `test-cli-search-${Date.now()}`);
    await fs.mkdirp(tempDir);

    const templateSource = path.join(__dirname, '../../../templates/typescript-enterprise-search');
    expect(await fs.pathExists(templateSource)).toBe(true);

    await fs.copy(templateSource, tempDir);
    const pkgJson = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(pkgJson.name).toBe('nitrostack-enterprise-search');

    const indexContent = await fs.readFile(path.join(tempDir, 'src/index.ts'), 'utf8');
    expect(indexContent).toContain('BM25SearchTransform');

    await fs.remove(tempDir);
  });

  it('scaffolds code-mode preset with CodeModeTransform and sandbox typings', async () => {
    const tempDir = path.join(os.tmpdir(), `test-cli-codemode-${Date.now()}`);
    await fs.mkdirp(tempDir);

    const templateSource = path.join(__dirname, '../../../templates/typescript-code-mode');
    expect(await fs.pathExists(templateSource)).toBe(true);

    await fs.copy(templateSource, tempDir);
    expect(await fs.pathExists(path.join(tempDir, 'nitro-sandbox.d.ts'))).toBe(true);

    const indexContent = await fs.readFile(path.join(tempDir, 'src/index.ts'), 'utf8');
    expect(indexContent).toContain('CodeModeTransform');

    await fs.remove(tempDir);
  });
});
