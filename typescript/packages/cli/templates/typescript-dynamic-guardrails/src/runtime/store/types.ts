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

import type { Policy } from '@nitrostack/core/guardrails';

/**
 * Storage contract for runtime policies. Every store (file, memory, MongoDB, Postgres)
 * implements it, so the rest of the server does not know where policies live.
 *
 *   policy_versions  immutable saved versions
 *   policy_heads     one active pointer per policy, guarded by `revision`
 *   team_state       the simulator's resources, approvals and audit (one document per team)
 *
 * Activation never needs a multi-document transaction: insert the version, then
 * compare-and-set the head on `revision`. A crash in between leaves an unused version.
 */

/** Where a change came from. Shown in logs, the audit trail and the dashboard. */
export type ChangeSource = 'seed' | 'mcp' | 'api' | 'webhook' | 'cli';

export interface PolicyVersionRecord {
  tenantId: string;
  policyId: string;
  /** Immutable, increasing per policy. */
  version: number;
  status: 'draft' | 'published';
  policy: Policy;
  /** Team settings the policy was compiled from, when it was. */
  settings?: Record<string, unknown>;
  kind: 'seed' | 'update' | 'rollback' | 'reset' | 'policy';
  restoredFrom?: number;
  comment?: string;
  createdBy: string;
  source: ChangeSource;
  createdAt: string;
}

export interface PolicyHead {
  tenantId: string;
  policyId: string;
  activeVersion: number;
  /** Increments on every activation. Served as `Policy.version`, so it only moves forward. */
  revision: number;
  updatedBy: string;
  source: ChangeSource;
  updatedAt: string;
}

export type NewVersion = Omit<PolicyVersionRecord, 'tenantId' | 'policyId' | 'version' | 'createdAt'>;

export class RevisionConflictError extends Error {
  constructor(readonly current: number) {
    super(`Policy changed (current revision ${current}). Reload and retry.`);
  }
}

export type ChangeListener = (key: { tenantId: string; policyId?: string }) => void;

export interface PolicyStore {
  readonly kind: string;
  /** Connects and creates collections or tables. Idempotent. */
  init(): Promise<void>;
  close(): Promise<void>;

  head(tenantId: string, policyId: string): Promise<PolicyHead | null>;
  heads(): Promise<PolicyHead[]>;
  getVersion(tenantId: string, policyId: string, version: number): Promise<PolicyVersionRecord | null>;
  /** Newest first. */
  listVersions(tenantId: string, policyId: string, limit: number): Promise<PolicyVersionRecord[]>;
  /**
   * Stores the next version number. With `exact`, stores that number or throws
   * {@link RevisionConflictError} if it already exists (used so only one replica seeds).
   */
  createVersion(tenantId: string, policyId: string, draft: NewVersion, exact?: number): Promise<PolicyVersionRecord>;
  /**
   * Points the head at `version`. `expectedRevision` is the revision the caller last saw
   * (0 creates the head); a mismatch throws {@link RevisionConflictError}.
   */
  activate(
    tenantId: string,
    policyId: string,
    version: number,
    expectedRevision: number,
    by: { actor: string; source: ChangeSource }
  ): Promise<PolicyHead>;

  /** Opaque per-team document. `etag` guards concurrent writers (null = create). */
  readTeam(tenantId: string): Promise<{ state: unknown; etag: number } | null>;
  /** Returns false when `etag` no longer matches. */
  writeTeam(tenantId: string, state: unknown, etag: number | null): Promise<boolean>;

  /** Push channel for head changes, if the store has one. Returns an unsubscribe function. */
  watch?(onChange: ChangeListener): () => void;
}
