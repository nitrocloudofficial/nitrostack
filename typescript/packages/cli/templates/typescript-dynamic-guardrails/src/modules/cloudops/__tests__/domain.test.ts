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
import { cost, inputs, settingsSchema, simulate } from '../domain.js';
import { seed } from '../store.js';
import { assertValidPolicy } from '@nitrostack/core/guardrails';
import { mutationPolicy, fields } from '../policy.js';

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
