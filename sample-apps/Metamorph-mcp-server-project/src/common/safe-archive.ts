// Safe repository archive fetch and extraction for the sandbox (OWASP MCP05, SSRF, zip-slip, zip bombs).
// Pure Node: fetch a GitHub tar.gz over HTTPS, gunzip with an output cap, parse tar by hand, write inside one directory.
// ponytail: pax records other than `path` (and the global `comment` commit sha) and GNU records other than long name are ignored.
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const gunzipAsync = promisify(gunzip) as (buf: Buffer, opts: { maxOutputLength: number }) => Promise<Buffer>;

export interface Limits {
  maxDownloadBytes: number;
  maxExtractedBytes: number;
  maxFiles: number;
  maxDepth: number;
  maxPathLength: number;
  timeoutMs: number;
}

export const DEFAULT_LIMITS: Limits = {
  maxDownloadBytes: 25 * 1024 * 1024,
  maxExtractedBytes: 80 * 1024 * 1024,
  maxFiles: 5000,
  maxDepth: 12,
  maxPathLength: 240,
  timeoutMs: 30000
};

const ALLOWED_HOST = 'codeload.github.com';
const MAX_REDIRECTS = 2;
const NAME_RE = /^[A-Za-z0-9_.-]{1,100}$/;
const REF_RE = /^[A-Za-z0-9._/-]{1,200}$/;

function mergeLimits(l?: Partial<Limits>): Limits {
  return { ...DEFAULT_LIMITS, ...(l ?? {}) };
}

function validName(s: string): boolean {
  return NAME_RE.test(s) && s !== '.' && s !== '..';
}

function validRef(s: string): boolean {
  return REF_RE.test(s) && !s.includes('..');
}

// ---------- repo URL parsing ----------

export function parseGithubRepo(input: string): { owner: string; repo: string; ref?: string } {
  const bad = () => new Error('invalid GitHub repository URL');
  if (typeof input !== 'string' || input.length > 500 || /[\\\u0000- \u007f]/.test(input)) throw bad();
  if (input.split(/[/?#]/).some((s) => s === '.' || s === '..')) throw bad(); // URL parsing would silently normalize these
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw bad();
  }
  if (u.protocol !== 'https:' || u.hostname !== 'github.com') throw bad();
  if (u.username || u.password || u.port || u.search || u.hash) throw bad();
  const parts = u.pathname.split('/');
  parts.shift(); // leading empty
  if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop(); // one trailing slash
  if (parts.length < 2 || parts.some((p) => p === '')) throw bad();
  const owner = parts[0];
  let repo = parts[1];
  if (repo.endsWith('.git')) repo = repo.slice(0, -4);
  if (!validName(owner) || !validName(repo)) throw bad();
  if (parts.length === 2) return { owner, repo };
  if (parts[2] !== 'tree' || parts.length < 4) throw bad();
  const ref = parts.slice(3).join('/');
  if (!validRef(ref)) throw bad();
  return { owner, repo, ref };
}

export function archiveUrl(owner: string, repo: string, ref?: string): string {
  if (!validName(owner) || !validName(repo)) throw new Error('invalid owner or repo');
  const r = ref ?? 'HEAD';
  if (!validRef(r)) throw new Error('invalid ref');
  return `https://${ALLOWED_HOST}/${owner}/${repo}/tar.gz/${r}`;
}

// ---------- path containment ----------

function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

// Resolves `relative` under `root` following symlinks of every existing ancestor; throws if the result leaves root.
export async function resolveInside(root: string, relative: string): Promise<string> {
  const outside = () => new Error('path escapes the allowed directory');
  if (relative.includes('\0')) throw outside();
  const realRoot = await fs.realpath(root);
  const target = path.resolve(realRoot, relative);
  if (!isInside(realRoot, target)) throw outside();
  const tail: string[] = [];
  let cur = target;
  for (;;) {
    let real: string | undefined;
    try {
      real = await fs.realpath(cur);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw e;
    }
    if (real !== undefined) {
      const resolved = path.join(real, ...tail.reverse());
      if (!isInside(realRoot, resolved)) throw outside();
      return resolved;
    }
    // realpath also fails for a dangling symlink: refuse it rather than treat it as a missing path
    let exists = true;
    try {
      await fs.lstat(cur);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw e;
      exists = false;
    }
    if (exists) throw outside();
    const parent = path.dirname(cur);
    if (parent === cur) throw outside();
    tail.push(path.basename(cur));
    cur = parent;
  }
}

export async function createWorkdir(rootDir?: string): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const base = rootDir ?? path.join(os.tmpdir(), 'metamorph-runs');
  await fs.mkdir(base, { recursive: true, mode: 0o700 });
  const dir = await fs.mkdtemp(path.join(base, 'run-'));
  await fs.chmod(dir, 0o700);
  return { dir, cleanup: () => fs.rm(dir, { recursive: true, force: true }) };
}

// ---------- fetch ----------

function checkArchiveHost(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('invalid archive URL');
  }
  if (u.protocol !== 'https:' || u.hostname !== ALLOWED_HOST || u.username || u.password || u.port) {
    throw new Error('archive host not allowed');
  }
  return u;
}

export async function fetchArchive(
  url: string,
  opts: { fetchFn?: typeof fetch; limits?: Partial<Limits> } = {}
): Promise<Buffer> {
  const limits = mergeLimits(opts.limits);
  const fetchFn = opts.fetchFn ?? fetch;
  let current = checkArchiveHost(url);
  const signal = AbortSignal.timeout(limits.timeoutMs);
  const aborted = new Promise<never>((_, reject) => {
    const fail = () => reject(new Error('archive fetch timed out'));
    if (signal.aborted) fail();
    else signal.addEventListener('abort', fail, { once: true });
  });
  aborted.catch(() => undefined); // avoid an unhandled rejection when nothing is racing it

  const guarded = async <T>(p: Promise<T>): Promise<T> => {
    try {
      return await Promise.race([p, aborted]);
    } catch (e) {
      if (signal.aborted) throw new Error('archive fetch timed out');
      throw e;
    }
  };

  let res: Response | undefined;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    res = await guarded(fetchFn(current.href, { redirect: 'manual', signal }));
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      await res.body?.cancel().catch(() => undefined);
      if (!loc || hop === MAX_REDIRECTS) throw new Error('too many redirects or missing location');
      let next: URL;
      try {
        next = new URL(loc, current);
      } catch {
        throw new Error('invalid redirect location');
      }
      current = checkArchiveHost(next.href);
      continue;
    }
    break;
  }
  if (!res || res.status < 200 || res.status >= 300) throw new Error(`archive fetch failed with status ${res?.status ?? 0}`);

  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limits.maxDownloadBytes) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error('archive exceeds download limit');
  }
  if (!res.body) throw new Error('archive response has no body');
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await guarded(reader.read());
      if (done) break;
      total += value.byteLength;
      if (total > limits.maxDownloadBytes) throw new Error('archive exceeds download limit'); // Content-Length may lie
      chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
    }
  } catch (e) {
    await reader.cancel().catch(() => undefined);
    throw e;
  }
  return Buffer.concat(chunks, total);
}

// ---------- tar extraction ----------

const BLOCK = 512;
const MAX_META = 16 * 1024; // pax / GNU long-name record size cap

function cstring(buf: Buffer, start: number, len: number): string {
  const field = buf.subarray(start, start + len);
  const nul = field.indexOf(0);
  if (nul === -1) return field.toString('utf8');
  // bytes hiding after the first NUL would be read differently by other tools
  for (let i = nul; i < field.length; i++) if (field[i] !== 0) throw new Error('NUL byte in archive entry name');
  return field.subarray(0, nul).toString('utf8');
}

function octal(buf: Buffer, start: number, len: number): number {
  if (buf[start] & 0x80) throw new Error('unsupported tar numeric encoding');
  const s = buf.subarray(start, start + len).toString('latin1').replace(/\0[\s\S]*$/, '').trim();
  if (s === '') return 0;
  if (!/^[0-7]+$/.test(s)) throw new Error('corrupt tar header');
  return parseInt(s, 8);
}

function checksumOk(h: Buffer): boolean {
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 32 : h[i];
  return sum === octal(h, 148, 8);
}

function parsePaxRecords(data: Buffer): Map<string, string> {
  let pos = 0;
  const records = new Map<string, string>();
  while (pos < data.length) {
    const sp = data.indexOf(0x20, pos);
    if (sp === -1) throw new Error('corrupt pax record');
    const len = Number(data.subarray(pos, sp).toString('latin1'));
    if (!Number.isInteger(len) || len < sp - pos + 3 || pos + len > data.length) throw new Error('corrupt pax record');
    const rec = data.subarray(sp + 1, pos + len - 1).toString('utf8'); // drop trailing newline
    const eq = rec.indexOf('=');
    if (eq === -1) throw new Error('corrupt pax record');
    const key = rec.slice(0, eq);
    if (key === 'size') throw new Error('pax size override not supported');
    records.set(key, rec.slice(eq + 1));
    pos += len;
  }
  return records;
}

function parsePaxPath(data: Buffer): string | undefined {
  return parsePaxRecords(data).get('path');
}

const SHA_RE = /^[0-9a-f]{40}$/;

// GitHub tarballs start with a pax global header (typeflag 'g') whose `comment` record is the commit sha.
// Anything that is not exactly 40 lowercase hex characters is ignored; a malformed global header never fails extraction.
function commitFromGlobalHeader(body: Buffer): string | undefined {
  try {
    const c = parsePaxRecords(body).get('comment');
    return c !== undefined && SHA_RE.test(c) ? c : undefined;
  } catch {
    return undefined;
  }
}

// Validates an entry path and returns its segments with the top-level folder removed.
function stripPath(raw: string, limits: Limits): string[] {
  if (raw.includes('\0')) throw new Error('NUL byte in archive entry name');
  if (raw.includes('\\')) throw new Error('backslash in archive entry name');
  if (raw.startsWith('/')) throw new Error('absolute path in archive entry');
  const segs = raw.split('/');
  for (const s of segs) {
    if (s === '..') throw new Error('path traversal in archive entry');
    if (/^[A-Za-z]:/.test(s)) throw new Error('drive letter in archive entry');
  }
  const clean = segs.filter((s) => s !== '' && s !== '.');
  const stripped = clean.slice(1);
  if (stripped.join('/').length > limits.maxPathLength) throw new Error('archive entry path too long');
  if (stripped.length > limits.maxDepth) throw new Error('archive entry too deep');
  return stripped;
}

// Directories are verified once. `verified` holds relative paths (under the real destination root) of directories that this
// extraction created or lstat-confirmed as real directories (not links). A child of a verified directory that is itself a real
// directory is inside the root by induction, so no realpath is needed per file. Nothing but this extraction writes into the
// private workdir, and links are never created, so a cached directory cannot turn into a link while we run.
async function ensureDir(realRoot: string, rel: string, verified: Set<string>): Promise<void> {
  if (rel === '' || verified.has(rel)) return;
  const segs = rel.split('/');
  let cur = '';
  for (const seg of segs) {
    cur = cur === '' ? seg : `${cur}/${seg}`;
    if (verified.has(cur)) continue;
    const abs = path.join(realRoot, cur);
    let st = await fs.lstat(abs).catch((e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') return undefined;
      throw e;
    });
    if (!st) {
      try {
        await fs.mkdir(abs, { mode: 0o755 });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      }
      st = await fs.lstat(abs);
    }
    if (st.isSymbolicLink()) throw new Error('path escapes the allowed directory');
    if (!st.isDirectory()) throw new Error('archive entry conflicts with an existing file');
    verified.add(cur);
  }
}

const WRITE_CONCURRENCY = 16;

export async function extractTarGz(
  data: Buffer,
  destDir: string,
  limitsIn?: Partial<Limits>
): Promise<{ files: number; bytes: number; commit?: string }> {
  const limits = mergeLimits(limitsIn);
  let tar: Buffer;
  try {
    tar = await gunzipAsync(data, { maxOutputLength: limits.maxExtractedBytes });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ERR_BUFFER_TOO_LARGE' || e instanceof RangeError) throw new Error('archive expands beyond the extraction limit');
    throw new Error('archive is not valid gzip');
  }

  const realRoot = await fs.realpath(destDir);
  const verified = new Set<string>();
  const inflight = new Set<Promise<void>>();
  let writeError: unknown;
  let failed = false;

  let files = 0;
  let dirs = 0;
  let bytes = 0;
  let pendingName: string | undefined;
  let commit: string | undefined;
  const skippedLinks = new Set<string>(); // stripped paths of skipped links; nothing may be written beneath them
  let off = 0;

  try {
    while (off + BLOCK <= tar.length) {
      if (failed) break;
      const h = tar.subarray(off, off + BLOCK);
      if (h.every((b) => b === 0)) break;
      if (!checksumOk(h)) throw new Error('corrupt tar header');
      const size = octal(h, 124, 12);
      const type = String.fromCharCode(h[156]);
      const bodyStart = off + BLOCK;
      if (bodyStart + size > tar.length) throw new Error('truncated tar archive');
      const body = tar.subarray(bodyStart, bodyStart + size);
      off = bodyStart + Math.ceil(size / BLOCK) * BLOCK;

      if (type === 'g') {
        // pax_global_header: only the first one counts, and only if it comes before any file entry
        if (commit === undefined && files === 0 && dirs === 0 && size <= MAX_META) commit = commitFromGlobalHeader(body);
        continue;
      }
      if (type === 'x' || type === 'L') {
        if (size > MAX_META) throw new Error('archive metadata record too large');
        if (type === 'x') {
          const p = parsePaxPath(body);
          if (p !== undefined) pendingName = p;
        } else {
          const end = body.indexOf(0);
          if (end !== -1 && body.subarray(end).some((b) => b !== 0)) throw new Error('NUL byte in archive entry name');
          pendingName = body.subarray(0, end === -1 ? body.length : end).toString('utf8');
        }
        continue;
      }
      if (type === 'K') continue; // GNU long link name: links are skipped anyway

      let name = cstring(h, 0, 100);
      if (h.subarray(257, 263).toString('latin1') === 'ustar\0') {
        const prefix = cstring(h, 345, 155);
        if (prefix) name = `${prefix}/${name}`;
      }
      if (pendingName !== undefined) {
        name = pendingName;
        pendingName = undefined;
      }

      const segs = stripPath(name, limits); // every entry is validated, even ones we skip

      const isFile = type === '0' || type === '\0';
      const isDir = type === '5';
      if (!isFile && !isDir) {
        // symlink, hard link, device, FIFO, anything else: skipped, never created
        if (segs.length > 0) skippedLinks.add(segs.join('/'));
        continue;
      }
      if (segs.length === 0) {
        if (isFile) throw new Error('unexpected file at archive top level');
        continue; // the stripped top-level folder itself
      }
      const rel = segs.join('/');
      if (skippedLinks.size > 0) {
        let prefix = '';
        for (const s of segs) {
          prefix = prefix === '' ? s : `${prefix}/${s}`;
          if (skippedLinks.has(prefix)) throw new Error('archive entry written through a skipped link');
        }
      }

      if (isDir) {
        if (++dirs > limits.maxFiles) throw new Error('archive has too many entries');
        await ensureDir(realRoot, rel, verified);
        continue;
      }

      if (++files > limits.maxFiles) throw new Error('archive has too many files');
      bytes += size;
      if (bytes > limits.maxExtractedBytes) throw new Error('archive expands beyond the extraction limit');
      await ensureDir(realRoot, segs.slice(0, -1).join('/'), verified);
      // The parent is a verified real directory and every segment is free of '..', NUL and separators, so the final containment
      // check is plain path arithmetic; 'wx' (O_EXCL) refuses an existing file or link at the final component.
      const target = path.join(realRoot, rel);
      if (!isInside(realRoot, target) || target === realRoot) throw new Error('path escapes the allowed directory');
      if (inflight.size >= WRITE_CONCURRENCY) await Promise.race(inflight);
      if (failed) break;
      const w: Promise<void> = fs.writeFile(target, body, { flag: 'wx', mode: 0o644 }).then(
        () => {
          inflight.delete(w);
        },
        (e) => {
          inflight.delete(w);
          if (!failed) {
            failed = true;
            writeError = e;
          }
        }
      );
      inflight.add(w);
    }
  } finally {
    await Promise.all(inflight); // never leave writes running after returning or throwing
  }
  if (failed) throw writeError;
  return { files, bytes, ...(commit ? { commit } : {}) };
}
