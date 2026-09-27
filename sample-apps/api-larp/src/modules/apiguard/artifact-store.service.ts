import { Injectable } from '@nitrostack/core';
import type { ArtifactStore } from '../../domain/types.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class LocalArtifactStore implements ArtifactStore {
  private readonly rootPath = join(process.cwd(), 'artifacts');

  async createOnce<T>(namespace: string, id: string, value: T): Promise<T> {
    const dir = join(this.rootPath, namespace);
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${id}.json`);
    await writeFile(file, JSON.stringify(value, null, 2), { flag: 'wx' });
    return value;
  }

  async get<T>(namespace: string, id: string): Promise<T | null> {
    const file = join(this.rootPath, namespace, `${id}.json`);
    try {
      const content = await readFile(file, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
