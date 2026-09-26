export interface ZipFileEntry {
  path: string;
  data: Buffer;
}

interface PreparedZipEntry extends ZipFileEntry {
  name: Buffer;
  crc32: number;
  localHeaderOffset: number;
}

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;

export function buildStoredZip(files: readonly ZipFileEntry[]): Buffer {
  const prepared: PreparedZipEntry[] = [];
  const localParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const normalizedPath = normalizeZipPath(file.path);
    const name = Buffer.from(normalizedPath, 'utf8');
    const entry: PreparedZipEntry = {
      path: normalizedPath,
      data: file.data,
      name,
      crc32: crc32(file.data),
      localHeaderOffset: offset,
    };
    const localHeader = createLocalHeader(entry);
    localParts.push(localHeader, file.data);
    offset += localHeader.byteLength + file.data.byteLength;
    prepared.push(entry);
  }

  const centralDirectoryOffset = offset;
  const centralParts = prepared.map(createCentralDirectoryHeader);
  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const end = createEndOfCentralDirectory(
    prepared.length,
    centralDirectorySize,
    centralDirectoryOffset,
  );

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function normalizeZipPath(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/^\/+/u, '');
  if (
    normalized.length === 0 ||
    normalized.includes('../') ||
    normalized.startsWith('../') ||
    normalized.endsWith('/')
  ) {
    throw new Error(`Unsafe zip path: ${path}`);
  }
  return normalized;
}

function createLocalHeader(entry: PreparedZipEntry): Buffer {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL_FILE_HEADER, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(entry.crc32, 14);
  header.writeUInt32LE(entry.data.byteLength, 18);
  header.writeUInt32LE(entry.data.byteLength, 22);
  header.writeUInt16LE(entry.name.byteLength, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, entry.name]);
}

function createCentralDirectoryHeader(entry: PreparedZipEntry): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(CENTRAL_DIRECTORY_HEADER, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(entry.crc32, 16);
  header.writeUInt32LE(entry.data.byteLength, 20);
  header.writeUInt32LE(entry.data.byteLength, 24);
  header.writeUInt16LE(entry.name.byteLength, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.localHeaderOffset, 42);
  return Buffer.concat([header, entry.name]);
}

function createEndOfCentralDirectory(
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt32LE(END_OF_CENTRAL_DIRECTORY, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);
  return header;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});
