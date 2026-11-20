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

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Scalar } from '@nitrostack/core/guardrails';
import { settingsSchema } from '../domain/schemas.js';
import type { Command, Resource, Settings } from '../domain/types.js';
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
  status: 'pending' | 'rejected' | 'executed' | 'blocked' | 'failed';
}

/** One saved set of team settings. Rollback restores one of these as a new revision. */
export interface PolicyVersion {
  revision: number;
  settings: Settings;
  time: string;
  actor: string;
  /** How the revision was created. `imported` marks state saved before versions existed. */
  kind: 'seed' | 'update' | 'rollback' | 'reset' | 'imported';
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
  /** Policy revision. Incremented by every policy edit, rollback and reset. */
  revision: number;
  settings: Settings;
  resources: Resource[];
  approvals: Approval[];
  history: Activity[];
  /** Saved policy revisions, oldest first. Capped at {@link MAX_POLICY_VERSIONS}. */
  versions: PolicyVersion[];
  /** Facts of recent requests, oldest first. Capped at {@link MAX_RECORDED_DECISIONS}. */
  decisions: RecordedDecision[];
  /** Counter for the next generated resource ID. */
  next: number;
}

export const MAX_POLICY_VERSIONS = 50;
export const MAX_RECORDED_DECISIONS = 200;

/** Records the current settings as the version for the current revision. */
export function recordPolicyVersion(
  state: TeamState,
  actor: string,
  kind: PolicyVersion['kind'],
  restoredFrom?: number
) {
  state.versions.push({
    revision: state.revision,
    settings: structuredClone(state.settings),
    time: new Date().toISOString(),
    actor,
    kind,
    ...(restoredFrom === undefined ? {} : { restoredFrom }),
  });
  state.versions.splice(0, state.versions.length - MAX_POLICY_VERSIONS);
}

/** Keeps the facts of a request for policy impact previews. */
export function recordDecision(state: TeamState, decision: Omit<RecordedDecision, 'time'>) {
  state.decisions.push({ time: new Date().toISOString(), ...decision });
  state.decisions.splice(0, state.decisions.length - MAX_RECORDED_DECISIONS);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Builds a team's initial state from its seed, with one prepaid production database. */
export function seedTeamState(teamId: string): TeamState {
  const { name, ...settings } = teamSeeds[teamId];
  const state: TeamState = {
    name,
    revision: 1,
    settings: settingsSchema.parse(settings),
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
  recordPolicyVersion(state, 'system', 'seed');
  return state;
}

// ---------------------------------------------------------------------------
// Transactions
//
// A single loopback process owns the state directory. Every read/modify/write is
// serialized, and each change commits one complete snapshot (resources, approvals and
// audit together) through an atomic rename.
// ---------------------------------------------------------------------------

const stateDirectory = () => resolve(process.env.CLOUDOPS_STATE_DIR || '.cloudops');

let queue: Promise<unknown> = Promise.resolve();

function loadState(file: string, teamId: string): TeamState {
  try {
    const state: TeamState = JSON.parse(readFileSync(file, 'utf8'));
    // State saved by an earlier version of this template: settings fields added since then
    // take the team's seed value, and the current settings become the first version.
    const { name: _name, ...seedSettings } = teamSeeds[teamId];
    state.settings = { ...seedSettings, ...state.settings };
    if (!state.versions) {
      state.versions = [];
      recordPolicyVersion(state, 'system', 'imported');
    }
    state.decisions ??= [];
    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return seedTeamState(teamId);
  }
}

function saveState(directory: string, file: string, state: TeamState) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
  renameSync(temporary, file);
}

function runTransaction<T>(
  teamId: string,
  work: (state: TeamState) => Promise<T> | T,
  persist: boolean
): Promise<T> {
  if (!isKnownTeam(teamId)) return Promise.reject(new Error('Unknown team'));

  const run = queue.then(async () => {
    const directory = stateDirectory();
    const file = join(directory, teamId + '.json');
    const state = loadState(file, teamId);
    const result = await work(state);
    if (persist) saveState(directory, file, state);
    return result;
  });

  // Keep the queue alive after a failed transaction; the caller still sees the error.
  queue = run.catch(() => undefined);
  return run;
}

/** Reads a team's state. Changes made by `read` are discarded. */
export const readTeamState = <T>(teamId: string, read: (state: TeamState) => Promise<T> | T) =>
  runTransaction(teamId, read, false);

/** Applies `change` to a team's state and commits it once `change` returns. */
export const updateTeamState = <T>(teamId: string, change: (state: TeamState) => Promise<T> | T) =>
  runTransaction(teamId, change, true);
