import { describe, it, expect, afterEach } from '@jest/globals';
import { CodeModeTransform } from '../code-mode.transform.js';

describe('Sandbox Security & Isolation Suite (NITRO-103-M5)', () => {
  let transform: CodeModeTransform | null = null;

  afterEach(async () => {
    if (transform) {
      await transform.dispose();
      transform = null;
    }
  });

  it('rejects nested calls to the execute meta-tool', async () => {
    transform = new CodeModeTransform({ workerPoolSize: 1, timeoutMs: 3000 });
    const result = await transform.execute(
      `try { await callTool('execute', { code: 'return 1' }); return 'REACHED'; }
       catch (e) { return e.message; }`,
    );
    expect(result.value).toEqual(expect.stringContaining('cannot invoke Code Mode meta-tools'));
    expect(result.value).not.toEqual('REACHED');
  });

  it('blocks access to process global', async () => {
    transform = new CodeModeTransform({ workerPoolSize: 1 });
    const result = await transform.execute('return typeof process;');
    expect(result.value).toBe('undefined');
  });

  it('blocks require, Buffer, fetch, and fs host globals', async () => {
    transform = new CodeModeTransform({ workerPoolSize: 1 });
    const checks = [
      'return typeof require;',
      'return typeof Buffer;',
      'return typeof fetch;',
      'return typeof fs;',
      'return typeof child_process;',
    ];
    for (const code of checks) {
      const result = await transform.execute(code);
      expect(result.value).toBe('undefined');
    }
  });

  it('blocks constructor prototype pollution escapes', async () => {
    transform = new CodeModeTransform({ workerPoolSize: 1 });
    const attacks = [
      'const f = ({}).constructor.constructor; return f("return process")();',
      'return this.constructor.constructor("return process.env")();',
      'return (async () => {}).constructor("return process")();',
    ];
    for (const attack of attacks) {
      await expect(transform.execute(attack)).rejects.toThrow();
    }
  });

  it('fails safely when eval is used to escape sandbox to host', async () => {
    transform = new CodeModeTransform({ workerPoolSize: 1 });
    const script = `
      try {
        eval("process.exit(1)");
        return "escaped";
      } catch (err) {
        return { caught: true, message: err.message };
      }
    `;
    const result = await transform.execute(script);
    expect(result.value).toEqual({
      caught: true,
      message: "'process' is not defined",
    });
  });

  it('prevents Function constructor from reaching host Node process', async () => {
    transform = new CodeModeTransform({ workerPoolSize: 1 });
    const script = `
      try {
        const fn = Function("return process.env");
        return fn();
      } catch (err) {
        return { blocked: true, message: err.message };
      }
    `;
    const result = await transform.execute(script);
    expect(result.value).toEqual({
      blocked: true,
      message: "'process' is not defined",
    });
  });
});
