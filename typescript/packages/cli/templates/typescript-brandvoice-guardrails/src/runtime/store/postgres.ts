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

const UNIQUE_VIOLATION = '23505';
const CHANNEL = 'guardrails_policy_heads';

const MIGRATION = `
CREATE TABLE IF NOT EXISTS policy_versions (
  tenant_id text NOT NULL,
  policy_id text NOT NULL,
  version integer NOT NULL,
  record jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, policy_id, version)
);
CREATE TABLE IF NOT EXISTS policy_heads (
  tenant_id text NOT NULL,
  policy_id text NOT NULL,
  active_version integer NOT NULL,
  revision integer NOT NULL,
  updated_by text NOT NULL,
  source text NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, policy_id)
);
CREATE TABLE IF NOT EXISTS team_state (
  tenant_id text PRIMARY KEY,
  etag integer NOT NULL,
  state jsonb NOT NULL
);
CREATE OR REPLACE FUNCTION guardrails_notify_head() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('${CHANNEL}', NEW.tenant_id || ':' || NEW.policy_id);
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS guardrails_policy_heads_notify ON policy_heads;
CREATE TRIGGER guardrails_policy_heads_notify AFTER INSERT OR UPDATE ON policy_heads
  FOR EACH ROW EXECUTE FUNCTION guardrails_notify_head();
`;

const toHead = (row: any): PolicyHead => ({
  tenantId: row.tenant_id,
  policyId: row.policy_id,
  activeVersion: row.active_version,
  revision: row.revision,
  updatedBy: row.updated_by,
  source: row.source,
  updatedAt: new Date(row.updated_at).toISOString(),
});

/**
 * Postgres store (Neon, RDS, Supabase, local). Migrations run on start. A trigger on
 * `policy_heads` sends NOTIFY, so every replica hears about an activation in well under
 * a second; the runtime's head poll covers a dropped listener.
 */
export class PostgresPolicyStore implements PolicyStore {
  readonly kind = 'postgres';
  private pool: any;
  private listener: any;
  private readonly listeners = new Set<ChangeListener>();

  constructor(private readonly url: string, private readonly log: (message: string) => void = () => {}) {}

  async init() {
    const pg = await importDriver('pg');
    this.pool = new pg.Pool({ connectionString: this.url, max: 5 });
    await this.pool.query('SELECT pg_advisory_lock(424242)');
    try {
      await this.pool.query(MIGRATION);
    } finally {
      await this.pool.query('SELECT pg_advisory_unlock(424242)');
    }
    await this.listen(pg);
  }

  private async listen(pg: any) {
    try {
      this.listener = new pg.Client({ connectionString: this.url });
      await this.listener.connect();
      await this.listener.query(`LISTEN ${CHANNEL}`);
      this.listener.on('notification', (message: any) => {
        const [tenantId, policyId] = String(message.payload ?? '').split(':');
        for (const listener of this.listeners) listener({ tenantId, policyId });
      });
      this.listener.on('error', (error: Error) => {
        this.log(`postgres LISTEN lost (${error.message}); relying on polling`);
      });
    } catch (error) {
      this.log(`postgres LISTEN unavailable (${(error as Error).message}); relying on polling`);
    }
  }

  async close() {
    this.listeners.clear();
    await this.listener?.end().catch(() => {});
    await this.pool?.end();
  }

  async head(tenantId: string, policyId: string) {
    const { rows } = await this.pool.query(
      'SELECT * FROM policy_heads WHERE tenant_id = $1 AND policy_id = $2',
      [tenantId, policyId]
    );
    return rows[0] ? toHead(rows[0]) : null;
  }

  async heads() {
    return (await this.pool.query('SELECT * FROM policy_heads')).rows.map(toHead);
  }

  async getVersion(tenantId: string, policyId: string, version: number) {
    const { rows } = await this.pool.query(
      'SELECT record FROM policy_versions WHERE tenant_id = $1 AND policy_id = $2 AND version = $3',
      [tenantId, policyId, version]
    );
    return (rows[0]?.record as PolicyVersionRecord) ?? null;
  }

  async listVersions(tenantId: string, policyId: string, limit: number) {
    const { rows } = await this.pool.query(
      'SELECT record FROM policy_versions WHERE tenant_id = $1 AND policy_id = $2 ORDER BY version DESC LIMIT $3',
      [tenantId, policyId, limit]
    );
    return rows.map((r: any) => r.record as PolicyVersionRecord);
  }

  async createVersion(tenantId: string, policyId: string, draft: NewVersion, exact?: number) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { rows } = await this.pool.query(
        'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM policy_versions WHERE tenant_id = $1 AND policy_id = $2',
        [tenantId, policyId]
      );
      const record: PolicyVersionRecord = {
        ...draft,
        tenantId,
        policyId,
        version: exact ?? Number(rows[0].next),
        createdAt: new Date().toISOString(),
      };
      try {
        await this.pool.query(
          'INSERT INTO policy_versions (tenant_id, policy_id, version, record) VALUES ($1, $2, $3, $4)',
          [tenantId, policyId, record.version, record]
        );
        return record;
      } catch (error: any) {
        if (error?.code !== UNIQUE_VIOLATION) throw error;
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
    const values = [tenantId, policyId, version, expectedRevision + 1, by.actor, by.source, new Date()];
    const { rows } =
      expectedRevision === 0
        ? await this.pool.query(
            `INSERT INTO policy_heads VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (tenant_id, policy_id) DO NOTHING RETURNING *`,
            values
          )
        : await this.pool.query(
            `UPDATE policy_heads SET active_version = $3, revision = $4, updated_by = $5, source = $6, updated_at = $7
             WHERE tenant_id = $1 AND policy_id = $2 AND revision = $8 RETURNING *`,
            [...values, expectedRevision]
          );
    if (rows[0]) return toHead(rows[0]);
    throw new RevisionConflictError((await this.head(tenantId, policyId))?.revision ?? 0);
  }

  async readTeam(tenantId: string) {
    const { rows } = await this.pool.query('SELECT state, etag FROM team_state WHERE tenant_id = $1', [tenantId]);
    return rows[0] ? { state: rows[0].state, etag: rows[0].etag } : null;
  }

  async writeTeam(tenantId: string, state: unknown, etag: number | null) {
    const { rowCount } =
      etag === null
        ? await this.pool.query(
            'INSERT INTO team_state VALUES ($1, 1, $2) ON CONFLICT (tenant_id) DO NOTHING',
            [tenantId, JSON.stringify(state)]
          )
        : await this.pool.query(
            'UPDATE team_state SET state = $2, etag = etag + 1 WHERE tenant_id = $1 AND etag = $3',
            [tenantId, JSON.stringify(state), etag]
          );
    return rowCount === 1;
  }

  watch(onChange: ChangeListener) {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }
}
