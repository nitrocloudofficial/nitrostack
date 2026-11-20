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

import { importDriver } from './driver.js';
import {
  RevisionConflictError,
  type ChangeListener,
  type ChangeSource,
  type NewVersion,
  type PolicyHead,
  type PolicyStore,
  type PolicyVersionRecord,
} from './types.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- the driver is optional, so it is untyped here. */

const DUPLICATE_KEY = 11000;
const headId = (tenantId: string, policyId: string) => `${tenantId}:${policyId}`;
const strip = <T>(doc: any): T | null => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as T;
};

/**
 * MongoDB store. Works on a standalone server: activation is a compare-and-set on one
 * document. Change streams (replica set or Atlas) push changes; otherwise the runtime's
 * head poll picks them up.
 */
export class MongoPolicyStore implements PolicyStore {
  readonly kind = 'mongodb';
  private client: any;
  private db: any;
  private streams: any[] = [];

  constructor(private readonly uri: string, private readonly log: (message: string) => void = () => {}) {}

  async init() {
    const { MongoClient } = await importDriver('mongodb');
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    this.db = this.client.db();
    await this.db.collection('policy_versions').createIndex({ tenantId: 1, policyId: 1, version: 1 }, { unique: true });
  }

  async close() {
    await Promise.allSettled(this.streams.map((s) => s.close()));
    await this.client?.close();
  }

  private get versions() {
    return this.db.collection('policy_versions');
  }
  private get headsCollection() {
    return this.db.collection('policy_heads');
  }

  async head(tenantId: string, policyId: string) {
    return strip<PolicyHead>(await this.headsCollection.findOne({ _id: headId(tenantId, policyId) }));
  }

  async heads() {
    return (await this.headsCollection.find({}).toArray()).map((d: any) => strip<PolicyHead>(d)!);
  }

  async getVersion(tenantId: string, policyId: string, version: number) {
    return strip<PolicyVersionRecord>(await this.versions.findOne({ tenantId, policyId, version }));
  }

  async listVersions(tenantId: string, policyId: string, limit: number) {
    const docs = await this.versions.find({ tenantId, policyId }).sort({ version: -1 }).limit(limit).toArray();
    return docs.map((d: any) => strip<PolicyVersionRecord>(d)!);
  }

  async createVersion(tenantId: string, policyId: string, draft: NewVersion, exact?: number) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const [last] = await this.versions.find({ tenantId, policyId }).sort({ version: -1 }).limit(1).toArray();
      const record: PolicyVersionRecord = {
        ...draft,
        tenantId,
        policyId,
        version: exact ?? (last?.version ?? 0) + 1,
        createdAt: new Date().toISOString(),
      };
      try {
        await this.versions.insertOne({ ...record });
        return record;
      } catch (error: any) {
        if (error?.code !== DUPLICATE_KEY) throw error;
        if (exact) throw new RevisionConflictError(exact);
      }
    }
    throw new Error('Could not allocate a policy version');
  }

  async activate(
    tenantId: string,
    policyId: string,
    version: number,
    expectedRevision: number,
    by: { actor: string; source: ChangeSource }
  ) {
    if (!(await this.getVersion(tenantId, policyId, version))) throw new Error('Unknown policy version');
    const _id = headId(tenantId, policyId);
    const head: PolicyHead = {
      tenantId,
      policyId,
      activeVersion: version,
      revision: expectedRevision + 1,
      updatedBy: by.actor,
      source: by.source,
      updatedAt: new Date().toISOString(),
    };
    if (expectedRevision === 0) {
      try {
        await this.headsCollection.insertOne({ _id, ...head });
        return head;
      } catch (error: any) {
        if (error?.code !== DUPLICATE_KEY) throw error;
      }
    } else {
      const result = await this.headsCollection.updateOne({ _id, revision: expectedRevision }, { $set: head });
      if (result.modifiedCount === 1) return head;
    }
    throw new RevisionConflictError((await this.head(tenantId, policyId))?.revision ?? 0);
  }

  async readTeam(tenantId: string) {
    const doc = await this.db.collection('team_state').findOne({ _id: tenantId });
    return doc ? { state: doc.state, etag: doc.etag } : null;
  }

  async writeTeam(tenantId: string, state: unknown, etag: number | null) {
    const teams = this.db.collection('team_state');
    if (etag === null) {
      try {
        await teams.insertOne({ _id: tenantId, state, etag: 1 });
        return true;
      } catch (error: any) {
        if (error?.code === DUPLICATE_KEY) return false;
        throw error;
      }
    }
    const result = await teams.updateOne({ _id: tenantId, etag }, { $set: { state, etag: etag + 1 } });
    return result.modifiedCount === 1;
  }

  watch(onChange: ChangeListener) {
    let stream: any;
    try {
      stream = this.headsCollection.watch([], { fullDocument: 'updateLookup' });
      this.streams.push(stream);
      stream.on('change', (change: any) => {
        const [tenantId, policyId] = String(change.documentKey?._id ?? '').split(':');
        if (tenantId) onChange({ tenantId, policyId });
      });
      stream.on('error', (error: Error) => {
        // Standalone servers have no change streams; the head poll covers them.
        this.log(`mongodb change stream unavailable (${error.message}); relying on polling`);
      });
    } catch (error) {
      this.log(`mongodb change stream unavailable (${(error as Error).message}); relying on polling`);
    }
    return () => void stream?.close().catch(() => {});
  }
}
