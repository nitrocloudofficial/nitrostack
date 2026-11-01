// Minimal, defensive zip reader for the runner's result artifact (GitHub wraps every artifact in a zip).
// It never writes to disk: it returns the bytes of exactly one expected entry, or throws. Zip-slip is moot because
// nothing is extracted, but suspicious names are still rejected so a tampered archive is not silently accepted.
// Supported: stored and deflate entries, no zip64, no encryption, no multi-disk.
import { inflateRawSync } from 'node:zlib';

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

export interface ZipLimits {
  maxZipBytes: number;
  maxEntryBytes: number;
  maxEntries: number;
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = { maxZipBytes: 4 * 1024 * 1024, maxEntryBytes: 2_000_000, maxEntries: 8 };

export class ZipError extends Error {}

function badName(name: string): boolean {
  return (
    name === '' ||
    name.length > 200 ||
    name.startsWith('/') ||
    name.includes('\\') ||
    name.includes('\0') ||
    /^[A-Za-z]:/.test(name) ||
    name.split('/').some((seg) => seg === '..')
  );
}

/** Returns the contents of `expected`. The archive must contain only that entry. */
export function readSingleZipEntry(zip: Buffer, expected: string, limits: Partial<ZipLimits> = {}): Buffer {
  const lim = { ...DEFAULT_ZIP_LIMITS, ...limits };
  if (zip.length > lim.maxZipBytes) throw new ZipError(`artifact zip is larger than ${lim.maxZipBytes} bytes`);
  if (zip.length < 22) throw new ZipError('artifact is not a zip file');

  // End of central directory: scan back over the (at most 64 KiB) comment.
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 65_535); i--) {
    if (zip.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipError('artifact is not a zip file (no end record)');
  const disk = zip.readUInt16LE(eocd + 4);
  const total = zip.readUInt16LE(eocd + 10);
  const cdSize = zip.readUInt32LE(eocd + 12);
  const cdOffset = zip.readUInt32LE(eocd + 16);
  if (disk !== 0 || total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) throw new ZipError('unsupported zip variant (multi-disk or zip64)');
  if (total > lim.maxEntries) throw new ZipError(`artifact zip has ${total} entries, expected 1`);
  if (cdOffset + cdSize > eocd) throw new ZipError('corrupt zip central directory');

  let pos = cdOffset;
  let found: { method: number; csize: number; usize: number; local: number } | undefined;
  for (let n = 0; n < total; n++) {
    if (pos + 46 > zip.length || zip.readUInt32LE(pos) !== CEN_SIG) throw new ZipError('corrupt zip central directory entry');
    const flags = zip.readUInt16LE(pos + 8);
    const method = zip.readUInt16LE(pos + 10);
    const csize = zip.readUInt32LE(pos + 20);
    const usize = zip.readUInt32LE(pos + 24);
    const nameLen = zip.readUInt16LE(pos + 28);
    const extraLen = zip.readUInt16LE(pos + 30);
    const commentLen = zip.readUInt16LE(pos + 32);
    const local = zip.readUInt32LE(pos + 42);
    if (pos + 46 + nameLen > zip.length) throw new ZipError('corrupt zip entry name');
    const name = zip.toString('utf8', pos + 46, pos + 46 + nameLen);
    pos += 46 + nameLen + extraLen + commentLen;
    if (badName(name)) throw new ZipError('artifact zip contains an unsafe entry name');
    if (name !== expected) throw new ZipError(`artifact zip contains an unexpected entry (expected only ${expected})`);
    if (found) throw new ZipError('artifact zip contains a duplicate entry');
    if (flags & 1) throw new ZipError('encrypted zip entries are not supported');
    if (method !== 0 && method !== 8) throw new ZipError('unsupported zip compression method');
    if (csize === 0xffffffff || usize === 0xffffffff) throw new ZipError('zip64 entries are not supported');
    if (usize > lim.maxEntryBytes) throw new ZipError(`${expected} is larger than ${lim.maxEntryBytes} bytes`);
    found = { method, csize, usize, local };
  }
  if (!found) throw new ZipError(`artifact zip does not contain ${expected}`);

  const { local } = found;
  if (local + 30 > zip.length || zip.readUInt32LE(local) !== LOC_SIG) throw new ZipError('corrupt zip local header');
  const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
  if (dataStart + found.csize > cdOffset) throw new ZipError('corrupt zip entry data range');
  const raw = zip.subarray(dataStart, dataStart + found.csize);
  let out: Buffer;
  if (found.method === 0) out = Buffer.from(raw);
  else {
    try {
      out = inflateRawSync(raw, { maxOutputLength: lim.maxEntryBytes });
    } catch {
      throw new ZipError(`${expected} could not be decompressed or is larger than ${lim.maxEntryBytes} bytes`);
    }
  }
  if (out.length !== found.usize) throw new ZipError('zip entry size does not match its header');
  return out;
}
