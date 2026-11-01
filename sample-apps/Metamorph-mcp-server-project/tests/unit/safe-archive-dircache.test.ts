import { describe, it, expect, afterEach, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { extractTarGz } from '../../src/common/safe-archive.js';

// Directory cache in extractTarGz: each directory is verified once, later files in it rely on that.
// These tests make sure the cache never lets an entry reach outside the destination or through a skipped link.

interface Entry {
  name: string;
  type?: string; // '0' file, '5' dir, '2' symlink
  data?: string;
  linkname?: string;
}

function header(e: Entry): Buffer {
  const h = Buffer.alloc(512);
  const data = Buffer.from(e.data ?? '');
  Buffer.from(e.name).copy(h, 0, 0, 100);
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
function tgz(entries: Entry[]): Buffer {
  const parts: Buffer[] = [];
  for (const e of entries) {
    const data = Buffer.from(e.data ?? '');
    parts.push(header(e), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

const made: string[] = [];
async function tmp(): Promise<string> {
  const d = await fs.mkdtemp(path.join(os.tmpdir(), 'safe-archive-cache-'));
  made.push(d);
  return d;
}
afterEach(async () => {
  vi.restoreAllMocks();
  while (made.length) await fs.rm(made.pop()!, { recursive: true, force: true });
});
const exists = (p: string) => fs.lstat(p).then(() => true, () => false);

async function sandbox(): Promise<{ dest: string; outside: string }> {
  const parent = await tmp();
  const dest = path.join(parent, 'dest');
  const outside = path.join(parent, 'outside');
  await fs.mkdir(dest);
  await fs.mkdir(outside);
  return { dest, outside };
}

describe('extractTarGz directory cache', () => {
  it('checks each directory once, not once per file', async () => {
    const { dest } = await sandbox();
    const entries: Entry[] = [{ name: 'r/', type: '5' }, { name: 'r/a/', type: '5' }, { name: 'r/a/b/', type: '5' }];
    for (let i = 0; i < 200; i++) entries.push({ name: `r/a/b/f${i}.txt`, data: String(i) });
    const realpath = vi.spyOn(fs, 'realpath');
    const lstat = vi.spyOn(fs, 'lstat');
    const mkdir = vi.spyOn(fs, 'mkdir');
    const r = await extractTarGz(tgz(entries), dest);
    expect(r.files).toBe(200);
    expect(realpath.mock.calls.length).toBeLessThanOrEqual(1); // the destination root only
    expect(lstat.mock.calls.length).toBeLessThanOrEqual(6); // two lookups per new directory at most
    expect(mkdir.mock.calls.length).toBe(2);
    expect(await fs.readFile(path.join(dest, 'a/b/f199.txt'), 'utf8')).toBe('199');
  });

  it('a link entry for an already verified directory still blocks later entries under it', async () => {
    const { dest, outside } = await sandbox();
    const data = tgz([
      { name: 'r/', type: '5' },
      { name: 'r/d/', type: '5' },
      { name: 'r/d/a.txt', data: 'one' },
      { name: 'r/d', type: '2', linkname: outside },
      { name: 'r/d/b.txt', data: 'two' }
    ]);
    await expect(extractTarGz(data, dest)).rejects.toThrow(/skipped link/);
    expect(await fs.readdir(outside)).toEqual([]);
    expect(await exists(path.join(dest, 'd/b.txt'))).toBe(false);
  });

  it('a link entry followed by a directory entry of the same name is not followed', async () => {
    const { dest, outside } = await sandbox();
    const data = tgz([
      { name: 'r/', type: '5' },
      { name: 'r/sub', type: '2', linkname: outside },
      { name: 'r/sub/', type: '5' },
      { name: 'r/sub/pwn.txt', data: 'pwn' }
    ]);
    await expect(extractTarGz(data, dest)).rejects.toThrow(/skipped link/);
    expect(await fs.readdir(outside)).toEqual([]);
    expect(await exists(path.join(dest, 'sub'))).toBe(false);
  });

  it('a path that traverses a skipped link deeper down is refused', async () => {
    const { dest, outside } = await sandbox();
    const data = tgz([
      { name: 'r/x/', type: '5' },
      { name: 'r/x/y', type: '2', linkname: outside },
      { name: 'r/x/y/z/w.txt', data: 'pwn' }
    ]);
    await expect(extractTarGz(data, dest)).rejects.toThrow(/skipped link/);
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it('a directory that already exists as a link in the destination is not followed, even through a nested path', async () => {
    const { dest, outside } = await sandbox();
    await fs.mkdir(path.join(dest, 'a'));
    await fs.symlink(outside, path.join(dest, 'a', 'b'));
    const nested = tgz([{ name: 'r/a/b/c/pwn.txt', data: 'pwn' }]);
    await expect(extractTarGz(nested, dest)).rejects.toThrow(/escapes/);
    const dirEntry = tgz([{ name: 'r/a/b/', type: '5' }]);
    await expect(extractTarGz(dirEntry, dest)).rejects.toThrow(/escapes/);
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it('a dangling link already in the destination is refused, not treated as a missing path', async () => {
    const { dest, outside } = await sandbox();
    await fs.symlink(path.join(outside, 'missing'), path.join(dest, 'dangling'));
    await expect(extractTarGz(tgz([{ name: 'r/dangling/pwn.txt', data: 'pwn' }]), dest)).rejects.toThrow(/escapes/);
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it('a file entry after a directory entry of the same name fails and keeps the directory', async () => {
    const { dest } = await sandbox();
    const data = tgz([
      { name: 'r/a/', type: '5' },
      { name: 'r/a/keep.txt', data: 'keep' },
      { name: 'r/a', data: 'now a file' }
    ]);
    await expect(extractTarGz(data, dest)).rejects.toThrow();
    expect((await fs.lstat(path.join(dest, 'a'))).isDirectory()).toBe(true);
    expect(await fs.readFile(path.join(dest, 'a/keep.txt'), 'utf8')).toBe('keep');
  });

  it('a directory entry or file under a path that is already a file fails', async () => {
    const { dest } = await sandbox();
    await expect(extractTarGz(tgz([{ name: 'r/a', data: 'file' }, { name: 'r/a/', type: '5' }]), dest)).rejects.toThrow();
    const dest2 = path.join(path.dirname(dest), 'dest2');
    await fs.mkdir(dest2);
    await expect(extractTarGz(tgz([{ name: 'r/a', data: 'file' }, { name: 'r/a/b.txt', data: 'x' }]), dest2)).rejects.toThrow();
    expect(await fs.readFile(path.join(dest2, 'a'), 'utf8')).toBe('file');
  });

  it('refuses a second file at the same path (wx) and keeps the first', async () => {
    const { dest } = await sandbox();
    const data = tgz([{ name: 'r/x.txt', data: 'first' }, { name: 'r/x.txt', data: 'second' }]);
    await expect(extractTarGz(data, dest)).rejects.toThrow();
    expect(await fs.readFile(path.join(dest, 'x.txt'), 'utf8')).toBe('first');
  });

  it('refuses a file entry whose final component is a link already in the destination', async () => {
    const { dest, outside } = await sandbox();
    await fs.symlink(path.join(outside, 'target.txt'), path.join(dest, 'f.txt'));
    await expect(extractTarGz(tgz([{ name: 'r/f.txt', data: 'pwn' }]), dest)).rejects.toThrow();
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it('writes in parallel but still reports the first failure and writes nothing after it', async () => {
    const { dest } = await sandbox();
    const entries: Entry[] = [{ name: 'r/dup.txt', data: 'a' }, { name: 'r/dup.txt', data: 'b' }];
    for (let i = 0; i < 100; i++) entries.push({ name: `r/n${i}.txt`, data: 'x' });
    await expect(extractTarGz(tgz(entries), dest)).rejects.toThrow();
    // two parallel 'wx' writes of the same path: exactly one wins, which one is a race
    expect(['a', 'b']).toContain(await fs.readFile(path.join(dest, 'dup.txt'), 'utf8'));
  });

  it('still honours the file and byte limits with parallel writes', async () => {
    const { dest } = await sandbox();
    const many: Entry[] = [];
    for (let i = 0; i < 30; i++) many.push({ name: `r/f${i}`, data: 'x' });
    await expect(extractTarGz(tgz(many), dest, { maxFiles: 10 })).rejects.toThrow(/too many files/);
    const dest2 = path.join(path.dirname(dest), 'dest2');
    await fs.mkdir(dest2);
    await expect(extractTarGz(tgz(many), dest2, { maxExtractedBytes: 20 })).rejects.toThrow(/limit/);
  });
});
