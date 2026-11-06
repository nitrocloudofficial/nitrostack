import { describe, it, expect, afterEach } from 'vitest';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { extractTarGz, DEFAULT_LIMITS } from '../../src/common/safe-archive.js';
import { readKeyFiles } from '../../src/modules/assessment/files.js';
import { withRepo } from '../../src/modules/assessment/repo-source.js';
import { loggedCtx } from '../helpers/offline.js';

// Path traversal, symlink escape and archive bombs, offline. Archives are built in memory; nothing is fetched and no
// project code is run. A "victim" file next to the destination folder stands for anything outside the sandbox.

interface Entry {
  name: string | Buffer;
  type?: string; // '0' file, '5' dir, '2' symlink, '1' hard link, 'x' pax
  data?: Buffer | string;
  linkname?: string;
  declaredSize?: number; // header size that disagrees with the body
}

function header(e: Entry): Buffer {
  const h = Buffer.alloc(512);
  const data = Buffer.from(e.data ?? '');
  const name = Buffer.isBuffer(e.name) ? e.name : Buffer.from(e.name);
  name.copy(h, 0, 0, Math.min(name.length, 100));
  h.write('0000644\0', 100);
  h.write('0000000\0', 108);
  h.write('0000000\0', 116);
  h.write((e.declaredSize ?? data.length).toString(8).padStart(11, '0') + '\0', 124);
  h.write('00000000000\0', 136);
  h.write('        ', 148);
  h.write(e.type ?? '0', 156);
  if (e.linkname) h.write(e.linkname, 157);
  h.write('ustar\0', 257);
  h.write('00', 263);
  let sum = 0;
  for (const b of h) sum += b;
  h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return h;
}
const tarOf = (entries: Entry[]): Buffer => {
  const parts: Buffer[] = [];
  for (const e of entries) {
    const data = Buffer.from(e.data ?? '');
    parts.push(header(e), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return Buffer.concat(parts);
};
const tgz = (entries: Entry[]) => gzipSync(tarOf(entries));

const made: string[] = [];
async function sandbox() {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'metamorph-sec-archive-'));
  made.push(parent);
  const dest = path.join(parent, 'dest');
  const victim = path.join(parent, 'victim.txt');
  await fs.mkdir(dest);
  await fs.writeFile(victim, 'ORIGINAL');
  return { parent, dest, victim };
}
afterEach(async () => {
  while (made.length) await fs.rm(made.pop()!, { recursive: true, force: true });
});

async function listAll(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true, recursive: true })) out.push(path.join(e.parentPath ?? dir, e.name));
  return out.sort();
}

describe('path traversal in archive entry names', () => {
  const NAMES: Array<[string, string]> = [
    ['dot-dot at the start', '../victim.txt'],
    ['dot-dot after the top folder', 'r/../../victim.txt'],
    ['deep dot-dot', 'r/a/b/../../../../victim.txt'],
    ['dot then dot-dot', 'r/./../../victim.txt'],
    ['absolute path', '/tmp/metamorph-absolute-escape.txt'],
    ['backslash separator', 'r\\..\\..\\victim.txt'],
    ['windows drive letter', 'C:/metamorph-escape.txt'],
    ['windows drive with backslash', 'C:\\metamorph-escape.txt'],
    ['NUL inside the name', 'r/ok.txt\0../../victim.txt'],
    ['dot-dot as the last segment of a directory', 'r/sub/..']
  ];
  for (const [label, name] of NAMES) {
    it(`${label}: rejected, nothing written outside the destination`, async () => {
      const { parent, dest, victim } = await sandbox();
      await expect(extractTarGz(tgz([{ name }, { name: 'r/after.txt', data: 'x' }]), dest)).rejects.toThrow();
      expect(await fs.readFile(victim, 'utf8')).toBe('ORIGINAL');
      expect((await fs.readdir(parent)).sort()).toEqual(['dest', 'victim.txt']);
      expect(await fs.access('/tmp/metamorph-absolute-escape.txt').then(() => true, () => false)).toBe(false);
    });
  }

  const LITERAL: Array<[string, string]> = [
    ['percent-encoded dot-dot (a literal folder name, not decoded)', 'r/%2e%2e/%2e%2e/victim.txt'],
    ['encoded slash', 'r/..%2f..%2fvictim.txt'],
    ['full-width dots', 'r/\uFF0E\uFF0E/\uFF0E\uFF0E/victim.txt'],
    ['dot-dot-dot', 'r/.../.../victim.txt']
  ];
  for (const [label, name] of LITERAL) {
    it(`${label}: extracted as an ordinary name, stays inside the destination`, async () => {
      const { parent, dest, victim } = await sandbox();
      await extractTarGz(tgz([{ name, data: 'payload' }]), dest);
      expect(await fs.readFile(victim, 'utf8')).toBe('ORIGINAL');
      expect((await fs.readdir(parent)).sort()).toEqual(['dest', 'victim.txt']);
      for (const f of await listAll(dest)) expect(path.relative(dest, f).split(path.sep)[0]).not.toBe('..');
    });
  }

  it('a pax path record cannot smuggle a traversal past the header check', async () => {
    const { dest, victim } = await sandbox();
    const rec = (k: string, v: string) => {
      const body = ` ${k}=${v}\n`;
      let len = body.length + 1;
      while (String(len).length + body.length !== len) len = String(len).length + body.length;
      return `${len}${body}`;
    };
    const pax = tgz([{ name: 'PaxHeader', type: 'x', data: rec('path', 'r/../../victim.txt') }, { name: 'r/innocent.txt', data: 'pwn' }]);
    await expect(extractTarGz(pax, dest)).rejects.toThrow(/traversal/);
    expect(await fs.readFile(victim, 'utf8')).toBe('ORIGINAL');
  });
});

describe('symlinks and links in archives', () => {
  it('a symlink entry is never created, and a later file of the same name is refused', async () => {
    const { dest, victim } = await sandbox();
    const data = tgz([
      { name: 'r/' , type: '5' },
      { name: 'r/victim.txt', type: '2', linkname: victim },
      { name: 'r/victim.txt', data: 'OVERWRITE' }
    ]);
    await expect(extractTarGz(data, dest)).rejects.toThrow(/skipped link/);
    expect(await fs.readFile(victim, 'utf8')).toBe('ORIGINAL');
    expect(await listAll(dest)).toEqual([]);
  });

  it('a directory symlink to the parent is not followed by later entries', async () => {
    const { parent, dest, victim } = await sandbox();
    const data = tgz([
      { name: 'r/up', type: '2', linkname: '..' },
      { name: 'r/up/victim.txt', data: 'OVERWRITE' }
    ]);
    await expect(extractTarGz(data, dest)).rejects.toThrow();
    expect(await fs.readFile(victim, 'utf8')).toBe('ORIGINAL');
    expect((await fs.readdir(parent)).sort()).toEqual(['dest', 'victim.txt']);
  });

  it('a hard link to an outside file is skipped, so a later write to the same name is refused', async () => {
    const { dest, victim } = await sandbox();
    const data = tgz([
      { name: 'r/h', type: '1', linkname: '../victim.txt' },
      { name: 'r/h', data: 'OVERWRITE' }
    ]);
    await expect(extractTarGz(data, dest)).rejects.toThrow(/skipped link/);
    expect(await fs.readFile(victim, 'utf8')).toBe('ORIGINAL');
  });

  it('a pre-existing symlink in the destination blocks writes through it (parent and leaf)', async () => {
    const { dest, victim } = await sandbox();
    await fs.symlink(victim, path.join(dest, 'leaf.txt'));
    await expect(extractTarGz(tgz([{ name: 'r/leaf.txt', data: 'OVERWRITE' }]), dest)).rejects.toThrow();
    expect(await fs.readFile(victim, 'utf8')).toBe('ORIGINAL');
  });
});

describe('archive bombs', () => {
  it('a high-ratio gzip (85 MiB of zeros) is stopped at the extraction cap without writing files', async () => {
    const { dest } = await sandbox();
    const bomb = gzipSync(Buffer.alloc(85 * 1024 * 1024));
    expect(bomb.length).toBeLessThan(1024 * 1024); // roughly 100:1 or better
    const t0 = Date.now();
    await expect(extractTarGz(bomb, dest)).rejects.toThrow(/extraction limit/);
    expect(Date.now() - t0).toBeLessThan(40_000); // generous: the bound matters, not the speed of the CI machine
    expect(await listAll(dest)).toEqual([]);
  }, 60_000);

  it('size: many files whose sum passes the cap are refused (small cap)', async () => {
    const { dest } = await sandbox();
    const files = Array.from({ length: 12 }, (_, i) => ({ name: `r/f${i}.bin`, data: Buffer.alloc(100_000, i) }));
    await expect(extractTarGz(tgz(files), dest, { maxExtractedBytes: 1_000_000 })).rejects.toThrow(/extraction limit/);
  });

  it('count: one file more than maxFiles is refused', async () => {
    const { dest } = await sandbox();
    // the documented default (5000) is asserted in tests/unit/safe-archive.test.ts; a small cap keeps this test fast
    const files = Array.from({ length: 201 }, (_, i) => ({ name: `r/d${i % 50}/f${i}`, data: 'x' }));
    await expect(extractTarGz(tgz(files), dest, { maxFiles: 200 })).rejects.toThrow(/too many files/);
  }, 60_000);

  it('count: directories count against the same cap', async () => {
    const { dest } = await sandbox();
    const dirs = Array.from({ length: 201 }, (_, i) => ({ name: `r/dir${i}/`, type: '5' }));
    await expect(extractTarGz(tgz(dirs), dest, { maxFiles: 200 })).rejects.toThrow(/too many entries/);
  }, 60_000);

  it('depth: an entry deeper than maxDepth is refused', async () => {
    const { dest } = await sandbox();
    const deep = ['r', ...Array.from({ length: DEFAULT_LIMITS.maxDepth + 1 }, (_, i) => `d${i}`), 'f.txt'].join('/');
    await expect(extractTarGz(tgz([{ name: deep, data: 'x' }]), dest)).rejects.toThrow(/too deep/);
  });

  it('path length: a name over maxPathLength is refused (GNU long name)', async () => {
    const { dest } = await sandbox();
    const long = Buffer.from('r/' + 'a'.repeat(DEFAULT_LIMITS.maxPathLength + 5) + '\0');
    await expect(extractTarGz(tgz([{ name: '././@LongLink', type: 'L', data: long }, { name: 'short', data: 'x' }]), dest)).rejects.toThrow(/too long/);
  });

  it('a header that claims more bytes than the archive holds is refused as truncated', async () => {
    const { dest } = await sandbox();
    await expect(extractTarGz(tgz([{ name: 'r/f.bin', data: 'tiny', declaredSize: 900 * 1024 * 1024 }]), dest)).rejects.toThrow(/truncated|extraction limit|corrupt/);
  });

  it('a pax or long-name record over 16 KiB is refused', async () => {
    const { dest } = await sandbox();
    await expect(extractTarGz(tgz([{ name: 'p', type: 'x', data: 'x'.repeat(20_000) }, { name: 'r/f', data: 'x' }]), dest)).rejects.toThrow(/too large/);
  });

  it('a gzip file inside the archive is stored as-is, never expanded (nested bomb)', async () => {
    const { dest } = await sandbox();
    const inner = gzipSync(Buffer.alloc(8 * 1024 * 1024));
    const r = await extractTarGz(tgz([{ name: 'r/inner.gz', data: inner }]), dest);
    expect(r.bytes).toBe(inner.length);
    expect((await fs.stat(path.join(dest, 'inner.gz'))).size).toBe(inner.length);
  }, 60_000);

  it('error messages carry no file content and no server path', async () => {
    const { dest } = await sandbox();
    const err = await extractTarGz(tgz([{ name: '../SECRET-NAME-IN-ARCHIVE', data: 'TOP-SECRET-CONTENT' }]), dest).catch((e: Error) => e);
    expect((err as Error).message).not.toContain('TOP-SECRET-CONTENT');
    expect((err as Error).message).not.toContain(dest);
  });
});

describe('withRepo: subfolder traversal', () => {
  const archive = tgz([{ name: 'repo-main/', type: '5' }, { name: 'repo-main/package.json', data: '{"name":"x"}' }, { name: 'repo-main/apps/api/package.json', data: '{"name":"api"}' }]);
  const fetchFn = (async () => new Response(archive, { status: 200 })) as unknown as typeof fetch;
  const BAD = ['..', '../', '../..', 'apps/../..', 'apps/../../etc', '/etc', '/', 'apps/\0x', '//etc/passwd', 'apps/api/../../../..'];
  for (const sub of BAD) {
    it(`refuses subfolder ${JSON.stringify(sub)} and never calls the analysis`, async () => {
      let ran = false;
      await expect(withRepo('https://github.com/o/r', sub, loggedCtx().ctx, async () => { ran = true; }, { fetchFn })).rejects.toThrow(/subfolder is not valid/);
      expect(ran).toBe(false);
    });
  }
  it('accepts a real subfolder', async () => {
    const seen = await withRepo('https://github.com/o/r', 'apps/api', loggedCtx().ctx, async (dir) => fs.readFile(path.join(dir, 'package.json'), 'utf8'), { fetchFn });
    expect(seen).toContain('"api"');
  });
  it('a symlinked subfolder cannot point outside (tar symlinks are never created)', async () => {
    const withLink = tgz([{ name: 'repo-main/package.json', data: '{}' }, { name: 'repo-main/out', type: '2', linkname: '/etc' }]);
    await expect(withRepo('https://github.com/o/r', 'out', loggedCtx().ctx, async () => 'ran', { fetchFn: (async () => new Response(withLink)) as unknown as typeof fetch })).rejects.toThrow(/subfolder is not valid/);
  });
  it('a missing subfolder or a file given as subfolder is refused without naming server paths (finding: the message used to contain the sandbox path)', async () => {
    for (const sub of ['no/such/folder', 'package.json']) {
      let msg = '';
      await withRepo('https://github.com/o/r', sub, loggedCtx().ctx, async () => 'ran', { fetchFn }).catch((e: Error) => (msg = e.message));
      expect(msg).toMatch(/subfolder is not valid/);
      expect(msg).not.toMatch(/\/tmp|metamorph-runs|run-/);
    }
  });
});

describe('readKeyFiles: symlinks, special files and size', () => {
  const have = (cmd: string) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).error === undefined;

  it('ignores symlinked key files (file and directory) that point outside the project', async () => {
    const { parent, dest } = await sandbox();
    const outside = path.join(parent, 'outside');
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'secret.txt'), 'OUTSIDE-SECRET-CONTENT');
    await fs.writeFile(path.join(outside, 'composer.json'), '{"name":"outside/pkg","require":{"php":">=5"}}');
    await fs.writeFile(path.join(outside, 'x.php'), '<?php echo "OUTSIDE-SECRET-CONTENT";');
    await fs.symlink(path.join(outside, 'secret.txt'), path.join(dest, 'package.json'));
    await fs.symlink(path.join(outside, 'secret.txt'), path.join(dest, '.env'));
    await fs.symlink(path.join(outside, 'secret.txt'), path.join(dest, 'Dockerfile'));
    await fs.symlink(path.join(outside, 'x.php'), path.join(dest, 'evil.php'));
    await fs.symlink(outside, path.join(dest, 'linked-dir'));
    await fs.symlink('/etc/passwd', path.join(dest, 'composer.lock'));
    await fs.symlink(path.join(dest, 'does-not-exist'), path.join(dest, 'tsconfig.json')); // dangling
    await fs.writeFile(path.join(dest, 'Procfile'), 'web: node index.js');
    const r = await readKeyFiles(dest);
    expect(r.paths).toEqual(['Procfile']);
    expect(JSON.stringify(r)).not.toContain('OUTSIDE-SECRET-CONTENT');
    expect(JSON.stringify(r)).not.toContain('root:');
    expect(r.php).toEqual([]);
  });

  it.skipIf(!have('mkfifo'))('does not block on or read a FIFO that is named like a key file', async () => {
    const { dest } = await sandbox();
    expect(spawnSync('mkfifo', [path.join(dest, 'package.json')]).status).toBe(0);
    await fs.writeFile(path.join(dest, 'Procfile'), 'web: x');
    const t0 = Date.now();
    const r = await readKeyFiles(dest);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(r.paths).toEqual(['Procfile']);
  }, 10_000);

  it('does not read a file over the size limit, and caps the number of files and the depth', async () => {
    const { dest } = await sandbox();
    await fs.writeFile(path.join(dest, 'package.json'), '{"name":"' + 'a'.repeat(300_000) + '"}');
    for (let i = 0; i < 30; i++) await fs.writeFile(path.join(dest, `f${i}.txt`), 'x');
    let deep = dest;
    for (let i = 0; i < 20; i++) {
      deep = path.join(deep, `d${i}`);
      await fs.mkdir(deep);
    }
    await fs.writeFile(path.join(deep, 'composer.json'), '{}');
    const r = await readKeyFiles(dest, { maxFiles: 10, maxDepth: 12, maxFileBytes: 256 * 1024 });
    expect(r.paths.length).toBeLessThanOrEqual(10);
    expect(r.truncated).toBe(true);
    expect(r.contents['package.json']).toBeUndefined();
    expect(Object.keys(r.contents).some((k) => k.includes('d19'))).toBe(false);
  });

  it('a dotenv file is reduced to KEY= lines on read: values never leave the reader', async () => {
    const { dest } = await sandbox();
    await fs.writeFile(path.join(dest, '.env'), 'DB_PASSWORD=hunter2-planted\n# note=comment-secret\nexport TOKEN="abc-planted"\n');
    const r = await readKeyFiles(dest);
    expect(r.contents['.env']).toBe('DB_PASSWORD=\nTOKEN=\n');
  });
});
