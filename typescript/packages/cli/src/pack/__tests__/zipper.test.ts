import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { describe, it, expect } from '@jest/globals';
import {
  createOptimizedZipBuffer,
  buildIgnoreMatcher,
  packProject,
} from '../index.js';

const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50;

function listZipEntriesFromBuffer(buffer: Buffer): string[] {
  const minEocdSize = 22;
  const maxComment = 0xffff;
  const searchStart = Math.max(0, buffer.length - (minEocdSize + maxComment));

  let eocdOffset = -1;
  for (let i = buffer.length - minEocdSize; i >= searchStart; i--) {
    if (buffer.readUInt32LE(i) === ZIP_EOCD_SIGNATURE) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid zip: end of central directory signature not found');
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const entries: string[] = [];

  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== ZIP_CENTRAL_FILE_HEADER_SIGNATURE) {
      throw new Error(`Invalid zip: bad central directory header at offset ${offset}`);
    }

    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    entries.push(buffer.toString('utf8', nameStart, nameEnd));
    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

async function createProject(structure: Record<string, string | null>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nitro-pack-buffer-test-'));

  for (const [rel, content] of Object.entries(structure)) {
    const abs = path.join(root, rel);
    if (content === null) {
      await fs.mkdirp(abs);
    } else {
      await fs.mkdirp(path.dirname(abs));
      await fs.writeFile(abs, content, 'utf-8');
    }
  }

  return root;
}

describe('In-Memory Pack Engine (createOptimizedZipBuffer & packProject)', () => {
  it('creates an optimized in-memory zip buffer without writing files to disk', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'buffer-test-app',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      'src/index.ts': 'console.log("hello mcp");',
      'src/tools/weather.ts': 'export const weather = {};',
      'node_modules/dummy/index.js': 'should be excluded',
      '.git/HEAD': 'ref: refs/heads/main',
      '.env': 'SECRET=123',
    });

    try {
      const matcher = buildIgnoreMatcher('');
      const result = await createOptimizedZipBuffer(projectDir, matcher);

      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.sizeBytes).toBe(result.buffer.length);
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.filesIncluded).toBe(3);

      const entries = listZipEntriesFromBuffer(result.buffer);
      expect(entries).toContain('package.json');
      expect(entries).toContain('src/index.ts');
      expect(entries).toContain('src/tools/weather.ts');
      expect(entries).not.toContain('node_modules/dummy/index.js');
      expect(entries).not.toContain('.git/HEAD');
      expect(entries).not.toContain('.env');

      // Verify no zip file exists in the directory
      const dirFiles = await fs.readdir(projectDir);
      const zipFiles = dirFiles.filter((f) => f.endsWith('.zip'));
      expect(zipFiles.length).toBe(0);
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('packProject with inMemory: true returns buffer and leaves project directory clean', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'clean-deploy-app',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      'src/server.ts': 'export const server = 1;',
      'README.md': '# Clean Deploy MCP',
    });

    try {
      const result = await packProject({
        cwd: projectDir,
        inMemory: true,
      });

      expect(result.outputPath).toBeNull();
      expect(result.projectName).toBe('clean-deploy-app');
      expect(result.filesIncluded).toBe(4);
      expect(Buffer.isBuffer(result.zipBuffer)).toBe(true);
      expect(result.zipSizeBytes).toBe(result.zipBuffer!.length);

      const entries = listZipEntriesFromBuffer(result.zipBuffer!);
      expect(entries).toContain('package.json');
      expect(entries).toContain('src/server.ts');
      expect(entries).toContain('README.md');
      expect(entries).toContain('.gitignore');

      // Zero zip files created on disk
      const dirFiles = await fs.readdir(projectDir);
      expect(dirFiles.some((f) => f.endsWith('.zip'))).toBe(false);
    } finally {
      await fs.remove(projectDir);
    }
  });

  it('packProject with inMemory: false preserves standard disk output behavior', async () => {
    const projectDir = await createProject({
      'package.json': JSON.stringify({
        name: 'disk-pack-app',
        dependencies: { '@nitrostack/core': '^1.0.0' },
      }),
      'src/index.ts': 'export {};',
    });

    try {
      const result = await packProject({
        cwd: projectDir,
        inMemory: false,
      });

      expect(result.outputPath).toBe(path.join(projectDir, 'disk-pack-app.zip'));
      expect(result.zipBuffer).toBeUndefined();
      expect(await fs.pathExists(result.outputPath!)).toBe(true);
      expect(result.zipSizeBytes).toBeGreaterThan(0);
    } finally {
      await fs.remove(projectDir);
    }
  });
});
