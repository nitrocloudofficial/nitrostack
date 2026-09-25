import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execFileSync, spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { resolveTemplateName, PRESET_ALIASES } from '../init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const templatesDir = path.join(__dirname, '../../../templates');
const coreDir = path.resolve(__dirname, '../../../../core');

describe('CLI Init Presets & Templates (NITRO-106-M1)', () => {
  it('resolves preset aliases correctly', () => {
    expect(resolveTemplateName({ preset: 'enterprise-search' })).toBe('typescript-enterprise-search');
    expect(resolveTemplateName({ preset: 'code-mode' })).toBe('typescript-code-mode');
    expect(resolveTemplateName({ template: 'enterprise-search' })).toBe('typescript-enterprise-search');
    expect(resolveTemplateName({ template: 'typescript-oauth' })).toBe('typescript-oauth');
    expect(resolveTemplateName({})).toBe('typescript-starter');
  });

  it('only aliases templates that exist', async () => {
    for (const template of Object.values(PRESET_ALIASES)) {
      expect(await fs.pathExists(path.join(templatesDir, template))).toBe(true);
    }
  });

  it('scaffolds enterprise-search preset with BM25SearchTransform', async () => {
    const tempDir = path.join(os.tmpdir(), `test-cli-search-${Date.now()}`);
    await fs.mkdirp(tempDir);

    const templateSource = path.join(templatesDir, 'typescript-enterprise-search');
    expect(await fs.pathExists(templateSource)).toBe(true);

    await fs.copy(templateSource, tempDir);
    const pkgJson = await fs.readJson(path.join(tempDir, 'package.json'));
    expect(pkgJson.name).toBe('nitrostack-enterprise-search');

    const moduleContent = await fs.readFile(path.join(tempDir, 'src/app.module.ts'), 'utf8');
    expect(moduleContent).toContain('BM25SearchTransform');

    await fs.remove(tempDir);
  });

  it('scaffolds code-mode preset with CodeModeTransform and sandbox typings', async () => {
    const tempDir = path.join(os.tmpdir(), `test-cli-codemode-${Date.now()}`);
    await fs.mkdirp(tempDir);

    const templateSource = path.join(templatesDir, 'typescript-code-mode');
    expect(await fs.pathExists(templateSource)).toBe(true);

    await fs.copy(templateSource, tempDir);
    expect(await fs.pathExists(path.join(tempDir, 'nitro-sandbox.d.ts'))).toBe(true);

    const moduleContent = await fs.readFile(path.join(tempDir, 'src/app.module.ts'), 'utf8');
    expect(moduleContent).toContain('CodeModeTransform');

    await fs.remove(tempDir);
  });
});

/**
 * Compiles each scaffold against the local @nitrostack/core build. Requires the
 * core package to be built (`dist/core/index.d.ts`).
 */
describe('Scaffolded transform templates compile and run', () => {
  const scaffolds = new Map<string, string>();

  async function scaffold(template: string): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), `nitro-${template}-`));
    await fs.copy(path.join(templatesDir, template), dir);
    const modules = path.join(dir, 'node_modules');
    const link = async (name: string, target: string) => {
      await fs.mkdirp(path.dirname(path.join(modules, name)));
      await fs.symlink(target, path.join(modules, name), 'dir');
    };
    const coreRequire = createRequire(path.join(coreDir, 'package.json'));
    await link('@nitrostack/core', coreDir);
    await link('dotenv', path.dirname(coreRequire.resolve('dotenv/package.json')));
    await link('@types/node', path.dirname(require.resolve('@types/node/package.json')));
    return dir;
  }

  const tsc = (dir: string, ...args: string[]) =>
    execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', dir, ...args], {
      encoding: 'utf8',
      stdio: 'pipe',
    });

  beforeAll(async () => {
    if (!(await fs.pathExists(path.join(coreDir, 'dist/core/index.d.ts')))) {
      throw new Error(`Build @nitrostack/core first: ${coreDir}/dist is missing`);
    }
    for (const template of ['typescript-code-mode', 'typescript-enterprise-search']) {
      scaffolds.set(template, await scaffold(template));
    }
  });

  afterAll(async () => {
    for (const dir of scaffolds.values()) await fs.remove(dir);
  });

  it.each(['typescript-code-mode', 'typescript-enterprise-search'])('%s type-checks', (template) => {
    let output = '';
    try {
      tsc(scaffolds.get(template)!, '--noEmit');
    } catch (error) {
      output = String((error as { stdout?: string }).stdout ?? error);
    }
    expect(output).toBe('');
  });

  it('code-mode serves the Code Mode meta-tools and runs the sample script', async () => {
    const dir = scaffolds.get('typescript-code-mode')!;
    tsc(dir);
    const proc = spawn(process.execPath, [path.join(dir, 'dist/index.js')], {
      cwd: dir,
      env: { ...process.env, NITRO_MCP_PROTOCOL_VERSION: '2025-06-18', MCP_TRANSPORT_TYPE: 'stdio' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const responses = new Map<number, (message: any) => void>();
    let buffer = '';
    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          responses.get(message.id)?.(message);
        } catch {
          /* not JSON-RPC */
        }
      }
    });
    const request = (id: number, method: string, params: Record<string, unknown> = {}) =>
      new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`No response to ${method}`)), 15000);
        responses.set(id, (message) => {
          clearTimeout(timer);
          resolve(message);
        });
        proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });

    try {
      const init = await request(1, 'initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'template-test', version: '1.0.0' },
      });
      expect(init.error).toBeUndefined();
      proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

      const listed = await request(2, 'tools/list');
      expect(listed.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
        'execute',
        'get_schema',
        'search',
      ]);

      const code = await fs.readFile(path.join(dir, 'src/scripts/sample-batch.js'), 'utf8');
      const executed = await request(3, 'tools/call', { name: 'execute', arguments: { code } });
      expect(executed.result.isError).not.toBe(true);
      const text = executed.result.content.map((part: { text?: string }) => part.text ?? '').join('');
      expect(text).toContain('totalSum');
      expect(text).toContain('353');
    } finally {
      // SIGKILL: the @McpApp shutdown hooks stop the server on SIGTERM but do not exit the process.
      if (proc.exitCode === null && proc.signalCode === null) {
        const exited = new Promise((resolve) => proc.once('exit', resolve));
        proc.kill('SIGKILL');
        await exited;
      }
    }
  });
});
