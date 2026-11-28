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
import { JsonPolicyEvaluator, assertValidPolicy } from '@nitrostack/core/guardrails';
import {
  SECURITY_FACTS,
  SECURITY_POLICY_ID,
  assertSecurityBoundary,
  buildSecurityPolicy,
  securityFloorRules,
  withSecurityFloor,
} from '../dist/modules/security/domain/security-policy.js';

const settings = {
  outboundMb: 2,
  durationMinutes: 30,
  concurrentJobs: 10,
  publicationCount: 10,
  destinations: ['internal', 'approved_external'],
  environments: ['development', 'production'],
  workspaceTypes: ['research'],
  externalPublishing: 'review',
  reviewDeletion: false,
};
const facts = {
  owned: true,
  authorizedReview: false,
  destination: 'approved_external',
  environment: 'development',
  workspaceType: 'research',
  outboundMb: 8,
  durationMinutes: 5,
  concurrentJobs: 1,
  publicationCount: 0,
  externalPublication: false,
  deletion: false,
  protectedWorkspace: false,
};
const decision = (policy, f) => new JsonPolicyEvaluator().evaluate(policy, f).effect;
const policy = (s = settings) => withSecurityFloor(buildSecurityPolicy('research', s), settings);

test('the real guardrail evaluator changes the outbound decision after a settings update', () => {
  const original = policy();
  assertValidPolicy(original, 'research', SECURITY_POLICY_ID, SECURITY_FACTS);
  assert.equal(decision(original, facts), 'require_approval');
  assert.equal(decision(policy({ ...settings, outboundMb: 8 }), facts), 'allow');
});

test('team boundaries and hard ceilings remain denied after loosening settings', () => {
  const raised = policy({ ...settings, outboundMb: 100 });
  assert.equal(decision(raised, { ...facts, destination: 'unapproved_external' }), 'deny');
  assert.equal(decision(raised, { ...facts, outboundMb: 101 }), 'deny');
  assert.throws(() =>
    assertSecurityBoundary(
      { ...settings, destinations: [...settings.destinations, 'unapproved_external'] },
      settings
    )
  );
});

test('raw allow policies cannot remove or impersonate floor rules', () => {
  const raw = {
    schemaVersion: 1,
    tenantId: 'research',
    id: SECURITY_POLICY_ID,
    version: 1,
    defaultEffect: 'deny',
    rules: securityFloorRules(settings).map(({ id }) => ({
      id,
      effect: 'allow',
      all: [{ field: 'owned', op: 'eq', value: true }],
    })),
  };
  const protectedPolicy = withSecurityFloor(raw, settings);
  assertValidPolicy(protectedPolicy, 'research', SECURITY_POLICY_ID, SECURITY_FACTS);
  assert.equal(decision(protectedPolicy, { ...facts, outboundMb: 101 }), 'deny');
  assert.equal(
    decision(protectedPolicy, {
      ...facts,
      environment: 'production',
      deletion: true,
      protectedWorkspace: true,
    }),
    'require_approval'
  );
});

test('publishing can be tightened from review to deny', () => {
  const publication = { ...facts, outboundMb: 0, externalPublication: true };
  assert.equal(decision(policy(), publication), 'require_approval');
  assert.equal(decision(policy({ ...settings, externalPublishing: 'deny' }), publication), 'deny');
});
