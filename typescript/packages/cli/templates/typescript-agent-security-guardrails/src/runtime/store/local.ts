/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  RevisionConflictError,
  type ChangeListener,
  type ChangeSource,
  type NewVersion,
  type PolicyHead,
  type PolicyStore,
  type PolicyVersionRecord,
} from './types.js';

type Data = { versions: PolicyVersionRecord[]; heads: PolicyHead[] };
const key = (tenantId: string, policyId: string) => `${tenantId}\0${policyId}`;

/**
 * Zero-dependency store for demos and tests.
 *   file    JSON files under a directory (atomic rename), survives restarts
 *   memory  nothing written to disk
 * One process owns the data. Changes are pushed to watchers in-process.
 */
export class LocalPolicyStore implements PolicyStore {
  private data: Data = { versions: [], heads: [] };
  private teams = new Map<string, { state: unknown; etag: number }>();
  private readonly listeners = new Set<ChangeListener>();
  private lock?: string;

  constructor(
    readonly kind: 'file' | 'memory',
    private readonly directory?: string,
    private readonly log: (message: string) => void = () => {}
  ) {}

  async init() {
    if (this.kind !== 'file') return;
    const dir = this.directory!;
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.data = this.readJson<Data>('policies.json') ?? { versions: [], heads: [] };
    this.lock = join(dir, 'server.lock');
    const other = Number(this.readJson<{ pid: number }>('server.lock')?.pid);
    if (other && other !== process.pid && alive(other)) {
      this.log(`warning: another process (pid ${other}) uses ${dir}. The file store supports one process; use mongodb or postgres for replicas.`);
    }
    writeFileSync(this.lock, JSON.stringify({ pid: process.pid }), { mode: 0o600 });
  }

  async close() {
    if (this.lock) rmSync(this.lock, { force: true });
    this.listeners.clear();
  }

  async head(tenantId: string, policyId: string) {
    return clone(this.data.heads.find((h) => key(h.tenantId, h.policyId) === key(tenantId, policyId)) ?? null);
  }

  async heads() {
    return clone(this.data.heads);
  }

  async getVersion(tenantId: string, policyId: string, version: number) {
    return clone(this.versionsOf(tenantId, policyId).find((v) => v.version === version) ?? null);
  }

  async listVersions(tenantId: string, policyId: string, limit: number) {
    return clone(this.versionsOf(tenantId, policyId).slice(-limit).reverse());
  }

  async createVersion(tenantId: string, policyId: string, draft: NewVersion, exact?: number) {
    const existing = this.versionsOf(tenantId, policyId);
    if (exact && existing.some((v) => v.version === exact)) throw new RevisionConflictError(exact);
    const record: PolicyVersionRecord = {
      ...clone(draft),
      tenantId,
      policyId,
      version: exact ?? (existing.at(-1)?.version ?? 0) + 1,
      createdAt: new Date().toISOString(),
    };
    this.data.versions.push(record);
    this.save();
    return clone(record);
  }

  async activate(
    tenantId: string,
    policyId: string,
    version: number,
    expectedRevision: number,
    by: { actor: string; source: ChangeSource }
  ) {
    if (!(await this.getVersion(tenantId, policyId, version))) throw new Error('Unknown policy version');
    const index = this.data.heads.findIndex((h) => key(h.tenantId, h.policyId) === key(tenantId, policyId));
    const current = this.data.heads[index];
    if ((current?.revision ?? 0) !== expectedRevision) throw new RevisionConflictError(current?.revision ?? 0);
    const head: PolicyHead = {
      tenantId,
      policyId,
      activeVersion: version,
      revision: expectedRevision + 1,
      updatedBy: by.actor,
      source: by.source,
      updatedAt: new Date().toISOString(),
    };
    if (index < 0) this.data.heads.push(head);
    else this.data.heads[index] = head;
    this.save();
    for (const listener of this.listeners) listener({ tenantId, policyId });
    return clone(head);
  }

  async readTeam(tenantId: string) {
    if (this.kind === 'file') {
      const state = this.readJson<unknown>(tenantId + '.json');
      if (state === undefined) return null;
      return { state, etag: this.teams.get(tenantId)?.etag ?? 0 };
    }
    return clone(this.teams.get(tenantId) ?? null);
  }

  async writeTeam(tenantId: string, state: unknown, etag: number | null) {
    const current = this.teams.get(tenantId)?.etag ?? 0;
    if (etag !== null && etag !== current) return false;
    this.teams.set(tenantId, { state: this.kind === 'file' ? undefined : clone(state), etag: current + 1 });
    if (this.kind === 'file') this.writeJson(tenantId + '.json', state);
    return true;
  }

  watch(onChange: ChangeListener) {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }

  private versionsOf(tenantId: string, policyId: string) {
    return this.data.versions.filter((v) => v.tenantId === tenantId && v.policyId === policyId);
  }

  private save() {
    if (this.kind === 'file') this.writeJson('policies.json', this.data);
  }

  private readJson<T>(file: string): T | undefined {
    try {
      return JSON.parse(readFileSync(join(this.directory!, file), 'utf8')) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  private writeJson(file: string, value: unknown) {
    const path = join(this.directory!, file);
    const temporary = `${path}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
    renameSync(temporary, path);
  }
}

const clone = <T>(value: T): T => (value === null || value === undefined ? value : structuredClone(value));

function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
