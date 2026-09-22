import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { execFile } from 'node:child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MemorySpilloverStore } from '../memory-spillover.store.js';
import { FsSpilloverStore } from '../fs-spillover.store.js';

describe('Spillover Storage Drivers (NITRO-105-M2)', () => {
  describe('MemorySpilloverStore', () => {
    let store: MemorySpilloverStore;

    beforeEach(() => {
      // 1KB max capacity for testing LRU
      store = new MemorySpilloverStore({ maxSizeBytes: 1024, sweepIntervalSeconds: 10 });
    });

    afterEach(async () => {
      await store.dispose();
    });

    it('saves and retrieves spillover records', async () => {
      const saved = await store.save('rec-1', '{"test":123}', 'application/json', 60);
      expect(saved.id).toBe('rec-1');
      expect(saved.sizeBytes).toBe(Buffer.byteLength('{"test":123}', 'utf8'));

      const retrieved = await store.get('rec-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toBe('{"test":123}');
      expect(retrieved?.mimeType).toBe('application/json');
    });

    it('evicts oldest record when memory cap is exceeded', async () => {
      const payload600Bytes = 'x'.repeat(600);
      await store.save('rec-1', payload600Bytes, 'text/plain', 60);
      await store.save('rec-2', payload600Bytes, 'text/plain', 60);

      // rec-1 should be evicted because 600 + 600 > 1024
      expect(await store.get('rec-1')).toBeUndefined();
      expect(await store.get('rec-2')).toBeDefined();
      expect(store.getCurrentSizeBytes()).toBe(600);
    });

    it('updates LRU order on get access', async () => {
      const payload400Bytes = 'a'.repeat(400);
      await store.save('rec-1', payload400Bytes, 'text/plain', 60);
      await store.save('rec-2', payload400Bytes, 'text/plain', 60);

      // Access rec-1 so it becomes more recently used than rec-2
      const got = await store.get('rec-1');
      expect(got).toBeDefined();

      // Now insert rec-3 (400 bytes). Total would be 1200 > 1024.
      // rec-2 should be evicted (as oldest), rec-1 should remain.
      await store.save('rec-3', payload400Bytes, 'text/plain', 60);

      expect(await store.get('rec-2')).toBeUndefined();
      expect(await store.get('rec-1')).toBeDefined();
      expect(await store.get('rec-3')).toBeDefined();
    });

    it('handles updating existing record id and adjusts byte tracking', async () => {
      await store.save('rec-1', 'hello', 'text/plain', 60);
      const initialSize = store.getCurrentSizeBytes();
      expect(initialSize).toBe(5);

      await store.save('rec-1', 'hello world', 'text/plain', 60);
      expect(store.getCurrentSizeBytes()).toBe(11);

      const retrieved = await store.get('rec-1');
      expect(retrieved?.data).toBe('hello world');
    });

    it('deletes records and frees memory capacity', async () => {
      await store.save('rec-1', 'data to delete', 'text/plain', 60);
      expect(store.getRecordCount()).toBe(1);

      const deleted = await store.delete('rec-1');
      expect(deleted).toBe(true);
      expect(store.getRecordCount()).toBe(0);
      expect(store.getCurrentSizeBytes()).toBe(0);
      expect(await store.get('rec-1')).toBeUndefined();
    });

    it('returns undefined and cleans up expired records', async () => {
      jest.useFakeTimers();
      try {
        await store.save('rec-ttl', 'data', 'text/plain', 5); // 5s TTL

        jest.advanceTimersByTime(6000);
        const retrieved = await store.get('rec-ttl');
        expect(retrieved).toBeUndefined();
      } finally {
        jest.useRealTimers();
      }
    });

    it('cleanup() purges expired records in batch', async () => {
      jest.useFakeTimers();
      try {
        await store.save('rec-exp-1', 'd1', 'text/plain', 2);
        await store.save('rec-exp-2', 'd2', 'text/plain', 2);
        await store.save('rec-valid', 'd3', 'text/plain', 100);

        jest.advanceTimersByTime(3000);

        const pruned = await store.cleanup();
        expect(pruned).toBe(2);
        expect(await store.get('rec-valid')).toBeDefined();
        expect(store.getRecordCount()).toBe(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('keeps overlapping saves within the memory cap', async () => {
      const payload = 'x'.repeat(800);
      const settled = await Promise.allSettled([
        store.save('a', payload, 'text/plain', 60),
        store.save('b', payload, 'text/plain', 60),
      ]);

      const stored = [await store.get('a'), await store.get('b')].filter((record) => record !== undefined);
      expect(stored).toHaveLength(1);
      expect(settled.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
      expect(store.getCurrentSizeBytes()).toBeLessThanOrEqual(store.getMaxSizeBytes());
    });
  });

  describe('FsSpilloverStore', () => {
    const testDir = path.join(os.tmpdir(), `nitro-spillover-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    let store: FsSpilloverStore;

    beforeEach(() => {
      store = new FsSpilloverStore({ storageDir: testDir, sweepIntervalSeconds: 10 });
    });

    afterEach(async () => {
      await store.dispose();
      await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
    });

    it('refuses to write when the directory cannot be made private', async () => {
      await fs.mkdir(testDir, { recursive: true });
      const lock = await new Promise<boolean>((resolve) => {
        execFile('chflags', ['uchg', testDir], (err) => resolve(!err));
      });
      if (!lock) {
        // Linux and some CI images cannot mark a directory immutable.
        return;
      }
      try {
        await expect(store.save('secret', 'customer records', 'text/plain', 60)).rejects.toThrow(
          /not private/
        );
      } finally {
        await new Promise<void>((resolve) => {
          execFile('chflags', ['nouchg', testDir], () => resolve());
        });
      }
    });

    it('persists record to disk and retrieves it', async () => {
      const record = await store.save('fs-rec-1', '{"status":"ok"}', 'application/json', 60);
      expect(record.id).toBe('fs-rec-1');

      const retrieved = await store.get('fs-rec-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toBe('{"status":"ok"}');
      expect(retrieved?.mimeType).toBe('application/json');
    });

    it('sanitizes path traversal keys to prevent directory escaping', async () => {
      await store.save('../../../malicious_key', 'safe_data', 'text/plain', 60);
      const retrieved = await store.get('../../../malicious_key');
      expect(retrieved?.data).toBe('safe_data');

      // Verify file was written inside testDir and not in any parent directory
      const files = await fs.readdir(testDir);
      expect(files.some((f) => f.includes('malicious_key'))).toBe(true);
      expect(files.every((f) => !f.includes('/'))).toBe(true);
    });

    it('deletes records from disk', async () => {
      await store.save('delete-me', 'temp content', 'text/plain', 60);
      const existsBefore = await store.get('delete-me');
      expect(existsBefore).toBeDefined();

      const deleted = await store.delete('delete-me');
      expect(deleted).toBe(true);

      const existsAfter = await store.get('delete-me');
      expect(existsAfter).toBeUndefined();
    });

    it('cleans up expired files on get and through cleanup()', async () => {
      jest.useFakeTimers();
      try {
        await store.save('exp-fs', 'expire content', 'text/plain', 2); // 2s TTL
        await store.save('valid-fs', 'valid content', 'text/plain', 100);

        jest.advanceTimersByTime(3000);

        const pruned = await store.cleanup();
        expect(pruned).toBe(1);

        const expRetrieved = await store.get('exp-fs');
        expect(expRetrieved).toBeUndefined();

        const validRetrieved = await store.get('valid-fs');
        expect(validRetrieved).toBeDefined();
      } finally {
        jest.useRealTimers();
      }
    });

    it('handles non-existent files gracefully', async () => {
      const nonExistent = await store.get('does-not-exist');
      expect(nonExistent).toBeUndefined();

      const deleteResult = await store.delete('does-not-exist');
      expect(deleteResult).toBe(false);
    });

    it('restores usage accounting when a write fails', async () => {
      await store.save('kept', 'hello', 'text/plain', 60);
      const before = store.getCurrentSizeBytes();
      await fs.chmod(testDir, 0o500);
      try {
        await expect(store.save('next', 'world', 'text/plain', 60)).rejects.toThrow();
      } finally {
        await fs.chmod(testDir, 0o700);
      }
      expect(store.getCurrentSizeBytes()).toBe(before);
      expect(await store.get('kept')).toBeDefined();
      await store.save('after', 'ok', 'text/plain', 60);
      expect(await store.get('after')).toBeDefined();
    });

    it('keeps concurrent saves within the size cap', async () => {
      const cappedDir = path.join(testDir, 'capped');
      const capped = new FsSpilloverStore({
        storageDir: cappedDir,
        maxSizeBytes: 100,
        sweepIntervalSeconds: 3600,
      });
      try {
        const payload = 'x'.repeat(80);
        await Promise.allSettled([
          capped.save('a', payload, 'text/plain', 60),
          capped.save('b', payload, 'text/plain', 60),
        ]);
        const files = (await fs.readdir(cappedDir)).filter(
          (file) => file.endsWith('.json') && !file.includes('.tmp')
        );
        expect(files.length).toBeLessThanOrEqual(1);
        let disk = 0;
        for (const file of files) {
          disk += (await fs.stat(path.join(cappedDir, file))).size;
        }
        expect(capped.getCurrentSizeBytes()).toBe(disk);
      } finally {
        await capped.dispose();
      }
    });
  });
});
