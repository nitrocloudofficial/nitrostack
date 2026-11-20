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

import type { Scalar, VerifiedIdentity } from '@nitrostack/core/guardrails';
import type { ChangeSource } from '../../../runtime/store/types.js';
import type { Command, Resource, Settings } from '../domain/types.js';
import { policyService, seedSettings } from '../guardrails/policy-service.js';
import { isKnownTeam, teamSeeds } from './seeds.js';

// ---------------------------------------------------------------------------
// Persisted shapes
// ---------------------------------------------------------------------------

/** One line of the team's audit log. */
export interface Activity {
  time: string;
  actor: string;
  tool: string;
  /**
   * ALLOW, BLOCK, REQUIRE_APPROVAL, EXECUTED, FAILED, UPDATED, ROLLBACK, APPROVED, REJECTED,
   * REPLAY or RESET.
   */
  event: string;
  /** Matching policy rule ID or another short reason code. */
  reason: string;
  /** Policy revision in force when the event was recorded. */
  version: number;
  /** Groups the events of one request, and links an approval to its decisions. */
  attempt?: string;
  resource?: string;
  details?: unknown;
}

/** A request that a policy rule sent to human review. */
export interface Approval {
  /** Equal to the attempt ID of the request that opened it. */
  id: string;
  command: Command;
  actor: string;
  time: string;
  reason: string;
  /** Policy revision the request was evaluated against. */
  version: number;
  projectedCost: number;
  /**
   * Serialized guardrail facts at request time. An approval only authorizes a replay
   * whose facts and policy revision are unchanged.
   */
  factsKey: string;
  /** Who asked, so an approved replay runs as that caller (demo or real identity). */
  requester?: Pick<VerifiedIdentity, 'tenantId' | 'principalId' | 'scopes' | 'source'>;
  status: 'pending' | 'rejected' | 'executed' | 'blocked' | 'failed';
}

/** One saved set of team settings. Rollback restores one of these as a new revision. */
export interface PolicyVersion {
  /** Stored version number (immutable). */
  revision: number;
  settings: Settings;
  time: string;
  actor: string;
  /** How the revision was created. `imported` marks state saved before versions existed. */
  kind: 'seed' | 'update' | 'rollback' | 'reset' | 'policy';
  source: ChangeSource;
  status: 'draft' | 'published';
  /** For a rollback, the revision whose settings were restored. */
  restoredFrom?: number;
}

/**
 * The guardrail facts of a recent request. Kept so a draft policy can be previewed against
 * real traffic before it is saved. Server-only: not part of the caller-facing snapshot.
 */
export interface RecordedDecision {
  attempt: string;
  time: string;
  actor: string;
  tool: string;
  facts: Record<string, Scalar>;
}

export interface TeamState {
  name: string;
  /**
   * Active policy revision, read from the policy store at the start of each transaction
   * (never saved with team state). Incremented by every activation, from any source.
   */
  revision: number;
  /** Stored version the head points at. */
  activeVersion: number;
  /** Who activated the current revision, and through which channel. */
  policyUpdate: { by: string; source: ChangeSource; at: string };
  settings: Settings;
  resources: Resource[];
  approvals: Approval[];
  history: Activity[];
  /** Stored policy versions, oldest first (last {@link MAX_POLICY_VERSIONS}). */
  versions: PolicyVersion[];
  /** Facts of recent requests, oldest first. Capped at {@link MAX_RECORDED_DECISIONS}. */
  decisions: RecordedDecision[];
  /** Counter for the next generated resource ID. */
  next: number;
}

export const MAX_POLICY_VERSIONS = 50;
export const MAX_RECORDED_DECISIONS = 200;

/** Records the current settings as the version for the current revision. */
export function recordDecision(state: TeamState, decision: Omit<RecordedDecision, 'time'>) {
  state.decisions.push({ time: new Date().toISOString(), ...decision });
  state.decisions.splice(0, state.decisions.length - MAX_RECORDED_DECISIONS);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Builds a team's initial state from its seed, with one prepaid production database. */
/** Policy fields are filled from the policy store; the rest is the simulator's own data. */
const POLICY_FIELDS = ['revision', 'activeVersion', 'policyUpdate', 'settings', 'versions'] as const;
type OperationalState = Omit<TeamState, (typeof POLICY_FIELDS)[number]>;

export function seedTeamState(teamId: string): TeamState {
  return {
    name: teamSeeds[teamId].name,
    revision: 1,
    activeVersion: 1,
    policyUpdate: { by: 'system', source: 'seed', at: new Date(0).toISOString() },
    settings: seedSettings(teamId),
    resources: [
      {
        id: teamId + '-db',
        name: 'Operations ledger',
        type: 'database',
        region: 'Mumbai',
        environment: 'production',
        machine: 'general',
        cpu: 1,
        gpu: 0,
        memory: 2,
        count: 1,
        unitCost: 0,
        status: 'running',
        detail: 'Postgres · prepaid fixture',
        firewall: [],
      },
    ],
    approvals: [],
    history: [],
    versions: [],
    decisions: [],
    next: 1,
  };
}

// ---------------------------------------------------------------------------
// Transactions
//
// Team state lives in the policy store (a JSON file, MongoDB document or Postgres row).
// Within one process every read/modify/write is serialized; across replicas each write is
// a compare-and-set on the document's etag, and a conflicting change is re-run on fresh
// state. Work functions only change `state`, so re-running them is safe.
// ---------------------------------------------------------------------------

let queue: Promise<unknown> = Promise.resolve();

async function hydrate(teamId: string): Promise<{ state: TeamState; etag: number | null }> {
  const service = policyService();
  const [stored, active, versions, settings] = await Promise.all([
    service.store.readTeam(teamId),
    service.active(teamId),
    service.versions(teamId, MAX_POLICY_VERSIONS),
    service.activeSettings(teamId),
  ]);
  const base = stored ? (stored.state as Partial<OperationalState>) : seedTeamState(teamId);
  const state: TeamState = {
    ...seedTeamState(teamId),
    ...base,
    decisions: base.decisions ?? [],
    revision: active.head.revision,
    activeVersion: active.head.activeVersion,
    policyUpdate: { by: active.head.updatedBy, source: active.head.source, at: active.head.updatedAt },
    settings,
    versions: versions.reverse().map((v) => ({
      revision: v.version,
      settings: { ...settings, ...(v.settings as Partial<Settings>) },
      time: v.createdAt,
      actor: v.createdBy,
      kind: v.kind,
      source: v.source,
      status: v.status,
      ...(v.restoredFrom === undefined ? {} : { restoredFrom: v.restoredFrom }),
    })),
  };
  return { state, etag: stored ? stored.etag : null };
}

function operational(state: TeamState): OperationalState {
  const copy: Partial<TeamState> = { ...state };
  for (const field of POLICY_FIELDS) delete copy[field];
  return copy as OperationalState;
}

function runTransaction<T>(
  teamId: string,
  work: (state: TeamState) => Promise<T> | T,
  persist: boolean
): Promise<T> {
  if (!isKnownTeam(teamId)) return Promise.reject(new Error('Unknown team'));

  const run = queue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      const { state, etag } = await hydrate(teamId);
      const result = await work(state);
      if (!persist && etag !== null) return result;
      if (await policyService().store.writeTeam(teamId, operational(state), etag)) return result;
      if (attempt >= 4) throw new Error('Team state is busy. Retry.');
    }
  });

  // Keep the queue alive after a failed transaction; the caller still sees the error.
  queue = run.catch(() => undefined);
  return run;
}

export const readTeamState = <T>(teamId: string, read: (state: TeamState) => Promise<T> | T) =>
  runTransaction(teamId, read, false);

export const updateTeamState = <T>(teamId: string, change: (state: TeamState) => Promise<T> | T) =>
  runTransaction(teamId, change, true);
