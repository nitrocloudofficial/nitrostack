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
import { projectSecurityOperation } from '../dist/modules/security/domain/security-simulation.js';

const seed = () => ({
  workspaces: [
    {
      id: 'research-workspace',
      name: 'Protected workspace',
      environment: 'production',
      workspaceType: 'research',
      protected: true,
      access: 'restricted',
    },
  ],
  jobs: [],
  artifacts: [],
});

test('an outbound projection keeps operation and projected totals distinct', () => {
  const state = seed();
  const command = {
    tool: 'run_outbound_job',
    args: {
      workspaceId: 'research-workspace',
      destination: 'approved_external',
      outboundMb: 8,
      durationMinutes: 5,
    },
  };
  const result = projectSecurityOperation(state, command, () => 'job-1');
  assert.equal(result.facts.outboundMb, 8);
  assert.equal(result.facts.concurrentJobs, 1);
  assert.deepEqual(result.affected, ['job-1']);
  assert.equal(state.jobs.length, 0);
});

test('unknown workspaces do not change state or allocate an id', () => {
  const state = seed();
  const result = projectSecurityOperation(
    state,
    {
      tool: 'publish_artifact',
      args: { workspaceId: 'other-team-id', destination: 'approved_external', name: 'report' },
    },
    () => {
      throw new Error('must not allocate an id');
    }
  );
  assert.equal(result.facts.owned, false);
  assert.deepEqual(result.state, state);
  assert.deepEqual(result.affected, []);
});

test('protected deletion facts survive projection and children are removed only in the projection', () => {
  const state = seed();
  state.jobs.push({
    id: 'job-1',
    workspaceId: 'research-workspace',
    destination: 'internal',
    outboundMb: 0,
    durationMinutes: 5,
  });
  const result = projectSecurityOperation(
    state,
    {
      tool: 'delete_workspace',
      args: { workspaceId: 'research-workspace' },
    },
    () => 'unused'
  );
  assert.equal(result.facts.protectedWorkspace, true);
  assert.equal(result.facts.deletion, true);
  assert.equal(result.state.jobs.length, 0);
  assert.equal(state.jobs.length, 1);
});
