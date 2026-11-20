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

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { operationInputs as inputs, settingsSchema } from '../domain/schemas.js';
import { monthlyCost as cost, simulate } from '../domain/simulation.js';
import { seedTeamState as seed } from '../state/team-state.js';
import { assertValidPolicy } from '@nitrostack/core/guardrails';
import {
  buildMutationPolicy as mutationPolicy,
  MUTATION_FACTS as fields,
} from '../guardrails/mutation.policy.js';
import { policyImpact } from '../guardrails/policy-impact.js';
import { assertWithinBoundary, compileTeamPolicy } from '../guardrails/policy-settings.js';

test('fixtures compile to valid tenant-scoped policies', () => {
  for (const team of ['ml', 'platform', 'development']) {
    const state = seed(team);
    assertValidPolicy(mutationPolicy(team, state), team, 'cloud-mutation', fields);
    assert.equal(settingsSchema.safeParse({ ...state.settings, gpu: 17 }).success, false);
  }
});
test('simulation estimates cost without mutating the current snapshot', () => {
  const initial = seed('ml').resources;
  const command = {
    tool: 'create_database' as const,
    args: inputs.create_database.parse({
      name: 'analytics',
      engine: 'postgres',
      storage: 600,
      region: 'Mumbai',
      environment: 'development',
    }),
  };
  const planned = simulate(initial, command, () => 'db-2');
  assert.equal(cost(planned.rows), 1200);
  assert.equal(cost(initial), 0);
  assert.deepEqual(planned.affected, ['db-2']);
});

test('team restrictions come from settings, not team IDs', () => {
  const ml = seed('ml');
  const ids = (team: string, state = seed(team)) => mutationPolicy(team, state).rules.map((r) => r.id);
  assert.ok(ids('ml').includes('production-deployment-restricted'));
  assert.ok(!ids('ml', { ...ml, settings: { ...ml.settings, productionDeployments: 'review' } })
    .includes('production-deployment-restricted'));
  assert.ok(ids('development').includes('environment-production'));
  assert.ok(!ids('platform').some((id) => id.startsWith('environment-')));
});

test('administrators can tighten settings inside the team boundary but never widen it', () => {
  const settingsOf = (team: string) => seed(team).settings;
  const dev = settingsOf('development');
  const ml = settingsOf('ml');
  const platform = settingsOf('platform');
  assert.throws(
    () => assertWithinBoundary('development', { ...dev, environments: ['development', 'staging'] }),
    /Environment outside team boundary/
  );
  assert.throws(
    () => assertWithinBoundary('ml', { ...ml, regions: ['Mumbai', 'Singapore'] }),
    /Region outside team boundary/
  );
  assert.throws(
    () => assertWithinBoundary('ml', { ...ml, productionDeployments: 'review' }),
    /Production deployments outside team boundary/
  );
  assert.doesNotThrow(() =>
    assertWithinBoundary('platform', {
      ...platform,
      environments: ['development'],
      productionDeployments: 'deny',
    })
  );
});

test('impact preview reports only requests whose outcome changes', () => {
  const state = seed('ml');
  const facts = {
    owned: true,
    environment: 'development',
    region: 'Mumbai',
    machine: 'accelerated',
    cpu: 1,
    spend: 100,
    replicas: 1,
    deployment: false,
    deletion: false,
  };
  const request = (attempt: string, gpus: number) => ({
    attempt,
    time: '2026-01-01T00:00:00.000Z',
    actor: 'ml-agent',
    tool: 'provision_instance',
    facts: { ...facts, gpus },
  });
  const decisions = [request('small', 1), request('large', 8)];
  const current = mutationPolicy('ml', state);
  const draft = (settings: Partial<typeof state.settings>) =>
    compileTeamPolicy('ml', state, { ...state.settings, ...settings });

  const raised = policyImpact(current, draft({ gpu: 8 }), decisions, 1);
  assert.equal(raised.sampled, 2);
  assert.deepEqual(raised.summary, { 'REQUIRE_APPROVAL→ALLOW': 1 });
  assert.deepEqual(raised.changed.map((c) => [c.attempt, c.current.reason, c.draft.reason]), [
    ['large', 'gpu-review', 'within-policy'],
  ]);
  assert.equal(raised.pendingApprovals, 1);

  // A deny rule wins over review, and the newest change is listed first.
  const restricted = policyImpact(current, draft({ environments: ['production'] }), decisions, 0);
  assert.deepEqual(restricted.summary, { 'ALLOW→BLOCK': 1, 'REQUIRE_APPROVAL→BLOCK': 1 });
  assert.deepEqual(
    restricted.changed.map((c) => [c.attempt, c.draft.reason]),
    [
      ['large', 'environment-development'],
      ['small', 'environment-development'],
    ]
  );
  assert.equal(policyImpact(current, current, decisions, 0).changed.length, 0);
});
