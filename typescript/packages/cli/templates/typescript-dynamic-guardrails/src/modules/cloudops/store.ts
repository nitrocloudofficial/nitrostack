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
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { VerifiedIdentity } from '@nitrostack/core/guardrails';
import { settingsSchema, type Settings, type Resource, type Command } from './domain.js';

const seeds = JSON.parse(
  readFileSync(new URL('../../../seeds/teams.json', import.meta.url), 'utf8')
) as Record<string, Settings & { name: string }>;

export const identities = new Map<string, VerifiedIdentity>();
for (const team of Object.keys(seeds)) {
  for (const role of ['agent', 'admin']) {
    identities.set('demo-' + team + '-' + role, {
      tenantId: team,
      principalId: team + '-' + role,
      scopes: [role],
      source: 'loopback-demo',
    });
  }
}
export function limits(team: string) {
  return seeds[team].regions;
}

export interface Activity {
  time: string;
  actor: string;
  tool: string;
  event: string;
  reason: string;
  version: number;
  attempt?: string;
  resource?: string;
  details?: unknown;
}
export interface Approval {
  id: string;
  command: Command;
  actor: string;
  time: string;
  reason: string;
  version: number;
  projectedCost: number;
  factsKey: string;
  status: 'pending' | 'rejected' | 'executed' | 'blocked' | 'failed';
}
export interface Team {
  name: string;
  revision: number;
  settings: Settings;
  resources: Resource[];
  approvals: Approval[];
  history: Activity[];
  next: number;
}
export function seed(team: string): Team {
  const { name, ...settings } = seeds[team];
  const resources: Resource[] = [
    {
      id: team + '-db',
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
  ];
  return {
    name,
    revision: 1,
    settings: settingsSchema.parse(settings),
    resources,
    approvals: [],
    history: [],
    next: 1,
  };
}

// A single loopback process owns the demo directory. Serialize read/modify/write and
// commit one complete snapshot per transaction, including its audit and approval changes.
let queue = Promise.resolve();
export function transaction<T>(
  team: string,
  change: (state: Team) => Promise<T> | T,
  write = true
): Promise<T> {
  if (!Object.hasOwn(seeds, team)) return Promise.reject(new Error('Unknown team'));
  const run = queue.then(async () => {
    const dir = resolve(process.env.CLOUDOPS_STATE_DIR || '.cloudops');
    const file = join(dir, team + '.json');
    let state: Team;
    try {
      state = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      state = seed(team);
    }
    const result = await change(state);
    if (write) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const tmp = file + '.' + randomUUID() + '.tmp';
      writeFileSync(tmp, JSON.stringify(state), { mode: 0o600 });
      renameSync(tmp, file);
    }
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
export function record(
  s: Team,
  actor: string,
  tool: string,
  event: string,
  reason: string,
  extra: Partial<Activity> = {}
) {
  s.history.push({
    time: new Date().toISOString(),
    actor,
    tool,
    event,
    reason,
    version: s.revision,
    ...extra,
  });
}
