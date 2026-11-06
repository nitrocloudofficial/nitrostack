import { describe, it, expect, afterEach } from 'vitest';
import { gzipSync } from 'node:zlib';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  parseGithubRepo,
  archiveUrl,
  DEFAULT_LIMITS,
  resolveInside,
  createWorkdir,
  fetchArchive,
  extractTarGz
} from '../../src/common/safe-archive.js';

// ---- tiny tar writer (fixtures only) ----
interface Entry {
  name: string | Buffer;
  type?: string; // '0' file, '5' dir, '2' symlink, '1' hard link, 'L' gnu long name, 'x' pax, 'g' pax global
  data?: Buffer | string;
  linkname?: string;
}

function header(e: Entry): Buffer {
  const h = Buffer.alloc(512);
  const data = Buffer.from(e.data ?? '');
  const name = Buffer.isBuffer(e.name) ? e.name : Buffer.from(e.name);
  name.copy(h, 0, 0, Math.min(name.length, 100));
  h.write('0000644\0', 100);
  h.write('0000000\0', 108);
  h.write('0000000\0', 116);
  h.write(data.length.toString(8).padStart(11, '0') + '\0', 124);
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

function tar(entries: Entry[]): Buffer {
  const parts: Buffer[] = [];
  for (const e of entries) {
    const data = Buffer.from(e.data ?? '');
    parts.push(header(e), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return Buffer.concat(parts);
}

const tgz = (entries: Entry[]) => gzipSync(tar(entries));

const dirs: string[] = [];
async function tmp(): Promise<string> {
  const d = await fs.mkdtemp(path.join(os.tmpdir(), 'safe-archive-test-'));
  dirs.push(d);
  return d;
}
afterEach(async () => {
  while (dirs.length) await fs.rm(dirs.pop()!, { recursive: true, force: true });
});

const exists = (p: string) => fs.lstat(p).then(() => true, () => false);

describe('parseGithubRepo', () => {
  it('parses plain, .git and tree URLs', () => {
    expect(parseGithubRepo('https://github.com/octo/hello')).toEqual({ owner: 'octo', repo: 'hello' });
    expect(parseGithubRepo('https://github.com/octo/hello.git')).toEqual({ owner: 'octo', repo: 'hello' });
    expect(parseGithubRepo('https://github.com/octo/hello/')).toEqual({ owner: 'octo', repo: 'hello' });
    expect(parseGithubRepo('https://github.com/octo/hello/tree/main')).toEqual({ owner: 'octo', repo: 'hello', ref: 'main' });
    expect(parseGithubRepo('https://github.com/octo/hello/tree/feat/x-1.2')).toEqual({ owner: 'octo', repo: 'hello', ref: 'feat/x-1.2' });
  });

  it.each([
    'https://gitlab.com/octo/hello',
    'https://evil.com/github.com/octo/hello',
    'https://github.com.evil.com/octo/hello',
    'http://github.com/octo/hello',
    'file:///etc/passwd',
    'git@github.com:octo/hello.git',
    'ssh://git@github.com/octo/hello',
    'https://github.com/octo',
    'https://github.com/',
    'https://github.com/octo/..',
    'https://github.com/../hello',
    'https://github.com/octo/hello/tree/a/../b',
    'https://github.com/octo/hello/tree/%2e%2e/x',
    'https://github.com/octo/hello/tree/',
    'https://user:pass@github.com/octo/hello',
    'https://github.com:8443/octo/hello',
    'https://github.com/octo/hello/blob/main/README.md',
    'https://github.com/octo/hello/issues',
    'https://github.com/octo/hello?x=1',
    'https://github.com/octo/hello#frag',
    'https://github.com\\octo\\hello',
    'https://github.com/octo/he llo',
    '',
    'not a url'
  ])('rejects %s', (input) => {
    expect(() => parseGithubRepo(input)).toThrow();
  });
});

describe('archiveUrl', () => {
  it('builds codeload URLs with HEAD as default', () => {
    expect(archiveUrl('octo', 'hello')).toBe('https://codeload.github.com/octo/hello/tar.gz/HEAD');
    expect(archiveUrl('octo', 'hello', 'feat/x')).toBe('https://codeload.github.com/octo/hello/tar.gz/feat/x');
  });
  it('rejects bad parts', () => {
    expect(() => archiveUrl('..', 'hello')).toThrow();
    expect(() => archiveUrl('octo', 'a/b')).toThrow();
    expect(() => archiveUrl('octo', 'hello', '../x')).toThrow();
  });
});

describe('DEFAULT_LIMITS', () => {
  it('matches the documented values', () => {
    expect(DEFAULT_LIMITS).toEqual({
      maxDownloadBytes: 25 * 1024 * 1024,
      maxExtractedBytes: 80 * 1024 * 1024,
      maxFiles: 5000,
      maxDepth: 12,
      maxPathLength: 240,
      timeoutMs: 30000
    });
  });
});

describe('fetchArchive', () => {
  const OK = 'https://codeload.github.com/octo/hello/tar.gz/HEAD';
  const bodyOf = (b: Buffer, headers: Record<string, string> = {}) => new Response(b, { status: 200, headers });

  it('returns the body for an allowed host', async () => {
    const fetchFn = (async () => bodyOf(Buffer.from('abc'))) as typeof fetch;
    expect((await fetchArchive(OK, { fetchFn })).toString()).toBe('abc');
  });

  it('rejects other hosts before fetching', async () => {
    let calls = 0;
    const fetchFn = (async () => { calls++; return bodyOf(Buffer.from('x')); }) as typeof fetch;
    for (const u of [
      'https://github.com/octo/hello',
      'https://evil.example/x',
      'http://codeload.github.com/x',
      'https://127.0.0.1/x',
      'https://169.254.169.254/latest',
      'https://codeload.github.com.evil.example/x',
      'https://user@codeload.github.com/x',
      'file:///etc/passwd'
    ]) {
      await expect(fetchArchive(u, { fetchFn })).rejects.toThrow();
    }
    expect(calls).toBe(0);
  });

  it('rejects a redirect to another host and never follows it', async () => {
    const seen: string[] = [];
    const fetchFn = (async (u: string) => {
      seen.push(String(u));
      return new Response(null, { status: 302, headers: { location: 'https://evil.example/x' } });
    }) as unknown as typeof fetch;
    await expect(fetchArchive(OK, { fetchFn })).rejects.toThrow(/not allowed/);
    expect(seen).toHaveLength(1);
  });

  it('follows up to two redirects to the allowed host, not three', async () => {
    let n = 0;
    const redirecting = (count: number) => (async () => {
      n++;
      return n <= count
        ? new Response(null, { status: 302, headers: { location: '/octo/hello/tar.gz/next' } })
        : bodyOf(Buffer.from('ok'));
    }) as unknown as typeof fetch;
    expect((await fetchArchive(OK, { fetchFn: redirecting(2) })).toString()).toBe('ok');
    n = 0;
    await expect(fetchArchive(OK, { fetchFn: redirecting(3) })).rejects.toThrow();
  });

  it('enforces the byte cap even when Content-Length lies', async () => {
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        if (pulled++ >= 1000) return c.close();
        c.enqueue(new Uint8Array(1024));
      }
    });
    const fetchFn = (async () => new Response(stream, { status: 200, headers: { 'content-length': '10' } })) as typeof fetch;
    await expect(fetchArchive(OK, { fetchFn, limits: { maxDownloadBytes: 4096 } })).rejects.toThrow(/download limit/);
    expect(pulled).toBeLessThan(50); // aborted early, did not drain the stream
  });

  it('rejects early when Content-Length already exceeds the cap', async () => {
    const fetchFn = (async () => bodyOf(Buffer.alloc(10), { 'content-length': '999999' })) as typeof fetch;
    await expect(fetchArchive(OK, { fetchFn, limits: { maxDownloadBytes: 100 } })).rejects.toThrow(/download limit/);
  });

  it('times out', async () => {
    const fetchFn = ((_u: string, init: RequestInit) =>
      new Promise((_res, rej) => init.signal!.addEventListener('abort', () => rej(init.signal!.reason)))) as unknown as typeof fetch;
    await expect(fetchArchive(OK, { fetchFn, limits: { timeoutMs: 50 } })).rejects.toThrow(/timed out/);
  });

  it('times out while the body stalls', async () => {
    const stream = new ReadableStream<Uint8Array>({ pull() { return new Promise(() => undefined); } });
    const fetchFn = (async () => new Response(stream, { status: 200 })) as typeof fetch;
    await expect(fetchArchive(OK, { fetchFn, limits: { timeoutMs: 50 } })).rejects.toThrow(/timed out/);
  });

  it('rejects non-2xx statuses', async () => {
    const fetchFn = (async () => new Response('no', { status: 404 })) as typeof fetch;
    await expect(fetchArchive(OK, { fetchFn })).rejects.toThrow(/status 404/);
  });
});

describe('extractTarGz', () => {
  it('extracts a normal archive and strips the top-level folder', async () => {
    const dest = await tmp();
    const data = tgz([
      { name: 'pax_global_header', type: 'g', data: '52 comment=0123456789abcdef0123456789abcdef01234567\n' },
      { name: 'repo-abc/', type: '5' },
      { name: 'repo-abc/README.md', data: '# hi\n' },
      { name: 'repo-abc/src/', type: '5' },
      { name: 'repo-abc/src/a/b.ts', data: 'export {};\n' }
    ]);
    const r = await extractTarGz(data, dest);
    expect(r).toEqual({ files: 2, bytes: 5 + 11, commit: '0123456789abcdef0123456789abcdef01234567' });
    expect(await fs.readFile(path.join(dest, 'README.md'), 'utf8')).toBe('# hi\n');
    expect(await fs.readFile(path.join(dest, 'src/a/b.ts'), 'utf8')).toBe('export {};\n');
    expect(await exists(path.join(dest, 'repo-abc'))).toBe(false);
    expect(await exists(path.join(dest, 'pax_global_header'))).toBe(false);
    const st = await fs.stat(path.join(dest, 'README.md'));
    expect(st.mode & 0o7777).toBe(0o644 & ~process.umask());
  });

  it('ignores archive modes (no setuid)', async () => {
    const dest = await tmp();
    const t = tar([{ name: 'r/x.sh', data: 'echo' }]);
    t.write('0004755\0', 100); // setuid mode in header; checksum fixed below
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 32 : t[i];
    t.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    await extractTarGz(gzipSync(t), dest);
    expect((await fs.stat(path.join(dest, 'x.sh'))).mode & 0o7000).toBe(0);
  });

  it('supports GNU long names and pax path records', async () => {
    const dest = await tmp();
    const longName = 'r/' + 'd/'.repeat(5) + 'f'.repeat(120) + '.txt';
    const body = ` path=${longName.replace('.txt', '.pax')}\n`;
    let len = body.length + 3;
    if (String(len).length !== 3) len = body.length + String(len).length;
    const pax = `${len}${body}`;
    const data = tgz([
      { name: '././@LongLink', type: 'L', data: Buffer.concat([Buffer.from(longName), Buffer.from([0])]) },
      { name: 'truncated-name', data: 'one' },
      { name: 'PaxHeader', type: 'x', data: pax },
      { name: 'truncated-name2', data: 'two' }
    ]);
    expect(await extractTarGz(data, dest)).toEqual({ files: 2, bytes: 6 });
    const base = 'd/d/d/d/d/' + 'f'.repeat(120);
    expect(await fs.readFile(path.join(dest, base + '.txt'), 'utf8')).toBe('one');
    expect(await fs.readFile(path.join(dest, base + '.pax'), 'utf8')).toBe('two');
  });

  it.each([
    ['zip-slip', '../evil'],
    ['zip-slip nested', 'r/../../evil'],
    ['absolute path', '/etc/evil'],
    ['backslash', 'r\\..\\evil'],
    ['drive letter', 'C:/evil'],
    ['NUL byte hiding a suffix', Buffer.from('r/ok.txt\0../../evil')]
  ])('rejects %s entries and writes nothing outside', async (_label, name) => {
    const parent = await tmp();
    const dest = path.join(parent, 'dest');
    await fs.mkdir(dest);
    await expect(extractTarGz(tgz([{ name, data: 'pwn' }]), dest)).rejects.toThrow();
    expect(await fs.readdir(parent)).toEqual(['dest']);
    expect(await fs.readdir(dest)).toEqual([]);
  });

  it('rejects a NUL byte inside a GNU long name', async () => {
    const dest = await tmp();
    const data = tgz([
      { name: '././@LongLink', type: 'L', data: Buffer.from('r/a\0b\0') },
      { name: 'x', data: 'pwn' }
    ]);
    await expect(extractTarGz(data, dest)).rejects.toThrow(/NUL/);
    expect(await fs.readdir(dest)).toEqual([]);
  });

  it('skips symlinks and rejects a later file written through them', async () => {
    const parent = await tmp();
    const dest = path.join(parent, 'dest');
    const outside = path.join(parent, 'outside');
    await fs.mkdir(dest);
    await fs.mkdir(outside);
    const only = tgz([
      { name: 'r/', type: '5' },
      { name: 'r/link', type: '2', linkname: outside },
      { name: 'r/ok.txt', data: 'fine' }
    ]);
    expect(await extractTarGz(only, dest)).toEqual({ files: 1, bytes: 4 });
    expect(await exists(path.join(dest, 'link'))).toBe(false);

    const dest2 = path.join(parent, 'dest2');
    await fs.mkdir(dest2);
    const through = tgz([
      { name: 'r/', type: '5' },
      { name: 'r/link', type: '2', linkname: outside },
      { name: 'r/link/pwn.txt', data: 'pwn' }
    ]);
    await expect(extractTarGz(through, dest2)).rejects.toThrow();
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it('refuses to write through a pre-existing symlink inside destDir', async () => {
    const parent = await tmp();
    const dest = path.join(parent, 'dest');
    const outside = path.join(parent, 'outside');
    await fs.mkdir(dest);
    await fs.mkdir(outside);
    await fs.symlink(outside, path.join(dest, 'link'));
    await expect(extractTarGz(tgz([{ name: 'r/link/pwn.txt', data: 'pwn' }]), dest)).rejects.toThrow(/escapes/);
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it('skips hard links, devices and FIFOs', async () => {
    const dest = await tmp();
    const data = tgz([
      { name: 'r/hard', type: '1', linkname: 'r/ok.txt' },
      { name: 'r/chr', type: '3' },
      { name: 'r/blk', type: '4' },
      { name: 'r/fifo', type: '6' },
      { name: 'r/ok.txt', data: 'fine' }
    ]);
    expect(await extractTarGz(data, dest)).toEqual({ files: 1, bytes: 4 });
    expect((await fs.readdir(dest)).sort()).toEqual(['ok.txt']);
  });

  it('stops a zip bomb at the output cap without writing anything', async () => {
    const dest = await tmp();
    const bomb = gzipSync(tar([{ name: 'r/big', data: Buffer.alloc(8 * 1024 * 1024) }]));
    expect(bomb.length).toBeLessThan(20 * 1024);
    await expect(extractTarGz(bomb, dest, { maxExtractedBytes: 1024 * 1024 })).rejects.toThrow(/limit/);
    expect(await fs.readdir(dest)).toEqual([]);
  });

  it('rejects data that is not gzip or not tar', async () => {
    const dest = await tmp();
    await expect(extractTarGz(Buffer.from('plain text'), dest)).rejects.toThrow(/gzip/);
    await expect(extractTarGz(gzipSync(Buffer.alloc(512, 7)), dest)).rejects.toThrow(/corrupt/);
  });

  it('throws when there are too many files', async () => {
    const dest = await tmp();
    const entries = Array.from({ length: 6 }, (_, i) => ({ name: `r/f${i}`, data: 'x' }));
    await expect(extractTarGz(tgz(entries), dest, { maxFiles: 5 })).rejects.toThrow(/too many files/);
  });

  it('throws when entries are too deep or paths too long', async () => {
    const dest = await tmp();
    await expect(extractTarGz(tgz([{ name: 'r/a/b/c/d.txt', data: 'x' }]), dest, { maxDepth: 3 })).rejects.toThrow(/deep/);
    await expect(extractTarGz(tgz([{ name: 'r/' + 'a'.repeat(50), data: 'x' }]), dest, { maxPathLength: 40 })).rejects.toThrow(/long/);
  });

  it('does not overwrite a pre-existing file', async () => {
    const dest = await tmp();
    await fs.writeFile(path.join(dest, 'keep.txt'), 'original');
    await expect(extractTarGz(tgz([{ name: 'r/keep.txt', data: 'new' }]), dest)).rejects.toThrow();
    expect(await fs.readFile(path.join(dest, 'keep.txt'), 'utf8')).toBe('original');
  });

  it('does not put file contents in error messages', async () => {
    const dest = await tmp();
    let msg = '';
    try {
      await extractTarGz(tgz([{ name: '../evil', data: 'SECRET-TOKEN-VALUE' }]), dest);
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).not.toContain('SECRET-TOKEN-VALUE');
  });
});

describe('resolveInside', () => {
  it('resolves existing and not-yet-existing paths inside root', async () => {
    const root = await tmp();
    await fs.mkdir(path.join(root, 'a'));
    const real = await fs.realpath(root);
    expect(await resolveInside(root, 'a')).toBe(path.join(real, 'a'));
    expect(await resolveInside(root, 'a/new/file.txt')).toBe(path.join(real, 'a/new/file.txt'));
  });

  it('rejects .. and absolute escapes', async () => {
    const root = await tmp();
    await expect(resolveInside(root, '../x')).rejects.toThrow(/escapes/);
    await expect(resolveInside(root, 'a/../../x')).rejects.toThrow(/escapes/);
    await expect(resolveInside(root, '/etc/passwd')).rejects.toThrow(/escapes/);
    await expect(resolveInside(root, 'a\0b')).rejects.toThrow();
  });

  it('rejects a symlink pointing outside, including dangling ones', async () => {
    const parent = await tmp();
    const root = path.join(parent, 'root');
    const outside = path.join(parent, 'outside');
    await fs.mkdir(root);
    await fs.mkdir(outside);
    await fs.symlink(outside, path.join(root, 'link'));
    await fs.symlink(path.join(parent, 'missing'), path.join(root, 'dangling'));
    await expect(resolveInside(root, 'link')).rejects.toThrow(/escapes/);
    await expect(resolveInside(root, 'link/file.txt')).rejects.toThrow(/escapes/);
    await expect(resolveInside(root, 'dangling')).rejects.toThrow(/escapes/);
  });
});

describe('createWorkdir', () => {
  it('creates distinct 0700 directories and cleanup removes them', async () => {
    const base = await tmp();
    const a = await createWorkdir(base);
    const b = await createWorkdir(base);
    expect(a.dir).not.toBe(b.dir);
    expect(path.dirname(a.dir)).toBe(base);
    expect((await fs.stat(a.dir)).mode & 0o777).toBe(0o700);
    expect((await fs.stat(b.dir)).mode & 0o777).toBe(0o700);
    await fs.writeFile(path.join(a.dir, 'f'), 'x');
    await a.cleanup();
    expect(await exists(a.dir)).toBe(false);
    expect(await exists(b.dir)).toBe(true);
    await b.cleanup();
    await b.cleanup(); // idempotent
    expect(await exists(b.dir)).toBe(false);
  });

  it('defaults to a metamorph-runs directory under the OS temp dir', async () => {
    const w = await createWorkdir();
    try {
      expect(w.dir.startsWith(path.join(os.tmpdir(), 'metamorph-runs'))).toBe(true);
    } finally {
      await w.cleanup();
    }
  });
});
