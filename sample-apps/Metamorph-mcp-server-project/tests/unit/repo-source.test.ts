import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import { withRepo } from '../../src/modules/assessment/repo-source.js';
import { tgzOf } from '../helpers/tar.js';

const ctx = { logger: { info: () => undefined } } as unknown as Parameters<typeof withRepo>[2];
const URL_OK = 'https://github.com/octo/hello';
const serve = (body: Buffer): typeof fetch => (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;
const archive = tgzOf({ 'hello-abc/package.json': '{"name":"x"}', 'hello-abc/apps/api/index.js': 'x' });

describe('withRepo', () => {
  it('extracts the repo, runs fn on the root and cleans up', async () => {
    let seen = '';
    const out = await withRepo(URL_OK, undefined, ctx, async (dir) => {
      seen = dir;
      return (await fs.readFile(`${dir}/package.json`, 'utf8')).length;
    }, { fetchFn: serve(archive) });
    expect(out).toBe(12);
    await expect(fs.stat(seen)).rejects.toThrow();
  });

  it('resolves a subfolder', async () => {
    const names = await withRepo(URL_OK, 'apps/api', ctx, (dir) => fs.readdir(dir), { fetchFn: serve(archive) });
    expect(names).toEqual(['index.js']);
  });

  it('cleans up when fn throws', async () => {
    let seen = '';
    await expect(withRepo(URL_OK, undefined, ctx, async (dir) => { seen = dir; throw new Error('boom'); }, { fetchFn: serve(archive) })).rejects.toThrow('boom');
    await expect(fs.stat(seen)).rejects.toThrow();
  });

  it('gives guidance errors without server paths', async () => {
    await expect(withRepo('https://example.com/a/b', undefined, ctx, async () => 1)).rejects.toThrow(/Invalid repository URL/);
    const fail = (async () => new Response('no', { status: 404 })) as unknown as typeof fetch;
    await expect(withRepo(URL_OK, undefined, ctx, async () => 1, { fetchFn: fail })).rejects.toThrow(/Could not download/);
    await expect(withRepo(URL_OK, undefined, ctx, async () => 1, { fetchFn: serve(Buffer.from('not a tarball')) })).rejects.toThrow(/could not be unpacked/);
    await expect(withRepo(URL_OK, '../etc', ctx, async () => 1, { fetchFn: serve(archive) })).rejects.toThrow(/subfolder is not valid/);
  });
});
