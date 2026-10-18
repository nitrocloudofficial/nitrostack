import { Injectable } from '@nitrostack/core';
import { gunzipSync } from 'node:zlib';
import type { FileMap } from '../analysis/signal.js';
import { fetchSameOrigin } from './http.js';

const MB = 1024 * 1024;
const MAX_COMPRESSED = 25 * MB;
const MAX_EXTRACTED = 60 * MB;
const MAX_FILES = 5_000;
// Shared across service instances and tools; the slot covers download and parsing.
let active = 0;
const waiters: (() => void)[] = [];

async function withDownloadSlot<T>(load: () => Promise<T>): Promise<T> {
  if (active >= 4) await new Promise<void>(resolve => waiters.push(resolve));
  else active++;
  try {
    return await load();
  } finally {
    const next = waiters.shift();
    if (next) next();
    else active--;
  }
}

function field(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('utf8').split('\0', 1)[0];
}

function octal(bytes: Uint8Array): number {
  const value = field(bytes).trim();
  if (!/^[0-7]*$/.test(value)) throw new Error('Invalid tar numeric field');
  const result = value ? parseInt(value, 8) : 0;
  if (!Number.isSafeInteger(result)) throw new Error('Invalid tar size');
  return result;
}

function packagePath(name: string): string {
  const normalized = name.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[a-z]:/i.test(normalized)
    || normalized.split('/').includes('..')) throw new Error('Unsafe tar path');
  const stripped = normalized.split('/').slice(1).filter(part => part && part !== '.').join('/');
  if (/^[a-z]:/i.test(stripped)) throw new Error('Unsafe tar path');
  return stripped;
}

function paxPath(data: Uint8Array): string | undefined {
  let offset = 0;
  let path: string | undefined;
  while (offset < data.length) {
    const space = data.indexOf(32, offset);
    if (space < 0) throw new Error('Invalid PAX header');
    const digits = Buffer.from(data.subarray(offset, space)).toString('ascii');
    const length = Number(digits);
    if (!/^\d+$/.test(digits) || !Number.isSafeInteger(length)
      || length <= space - offset + 1 || offset + length > data.length
      || data[offset + length - 1] !== 10) throw new Error('Invalid PAX record');
    const record = Buffer.from(data.subarray(space + 1, offset + length - 1)).toString('utf8');
    if (record.startsWith('path=')) path = record.slice(5);
    offset += length;
  }
  return path;
}

/** Parse entirely in memory. Links and special entries are never materialized. */
export function parseTarGz(buf: Uint8Array): FileMap {
  if (buf.byteLength > MAX_COMPRESSED) throw new Error('Compressed tarball exceeds 25 MB');
  // Bound decompression itself, including padding and extension records, against gzip bombs.
  const tar = gunzipSync(buf, { maxOutputLength: 70 * MB });
  const files: FileMap = new Map();
  let offset = 0;
  let count = 0;
  let total = 0;
  let longName: string | undefined;
  let paxName: string | undefined;
  while (offset < tar.length) {
    if (offset + 512 > tar.length) throw new Error('Truncated tar header');
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const checksum = octal(header.subarray(148, 156));
    let actual = 0;
    for (let i = 0; i < 512; i++) actual += i >= 148 && i < 156 ? 32 : header[i];
    if (checksum !== actual) throw new Error('Invalid tar checksum');
    const size = octal(header.subarray(124, 136));
    const end = offset + 512 + size;
    const next = offset + 512 + Math.ceil(size / 512) * 512;
    if (next > tar.length) throw new Error('Truncated tar entry');
    const data = tar.subarray(offset + 512, end);
    const type = header[156];
    const prefix = field(header.subarray(345, 500));
    const name = (prefix ? `${prefix}/` : '') + field(header.subarray(0, 100));
    packagePath(name);
    if (type === 120) {
      paxName = paxPath(data);
      if (paxName !== undefined) packagePath(paxName);
    } else if (type === 76) {
      longName = field(data).replace(/\n$/, '');
      packagePath(longName);
    } else {
      const path = packagePath(paxName ?? longName ?? name);
      paxName = longName = undefined;
      if (type === 0 || type === 48) {
        if (++count > MAX_FILES) throw new Error('Tarball exceeds 5000 files');
        total += size;
        if (total > MAX_EXTRACTED) throw new Error('Extracted tarball exceeds 60 MB');
        if (path) files.set(path, Uint8Array.from(data));
      }
    }
    offset = next;
  }
  return files;
}

@Injectable()
export class TarballService {
  async fetchFiles(tarballUrl: string): Promise<FileMap> {
    // Only ever download from the public registry (no SSRF via a crafted manifest).
    if (new URL(tarballUrl).origin !== 'https://registry.npmjs.org') {
      throw new Error(`Refusing to download a tarball from ${new URL(tarballUrl).origin}`);
    }
    return withDownloadSlot(() => this.download(tarballUrl));
  }

  private async download(tarballUrl: string): Promise<FileMap> {
    const response = await fetchSameOrigin('npm tarball', tarballUrl, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`Tarball download failed: HTTP ${response.status}`);
    }
    if (Number(response.headers.get('content-length')) > MAX_COMPRESSED) {
      await response.body?.cancel();
      throw new Error('Compressed tarball exceeds 25 MB');
    }
    if (!response.body) throw new Error('Tarball response has no body');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > MAX_COMPRESSED) throw new Error('Compressed tarball exceeds 25 MB');
        chunks.push(part.value);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    } finally {
      reader.releaseLock();
    }
    return parseTarGz(Buffer.concat(chunks, size));
  }
}
