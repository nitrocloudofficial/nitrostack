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

import type { Policy, Rule } from '@nitrostack/core/guardrails';
import type { Destination, Environment, WorkspaceType } from './security-simulation.js';

export const SECURITY_POLICY_ID = 'security-mutation';
export const DESTINATIONS: Destination[] = ['internal', 'approved_external', 'unapproved_external'];
export const ENVIRONMENTS: Environment[] = ['development', 'staging', 'production'];
export const WORKSPACE_TYPES: WorkspaceType[] = ['research', 'development', 'response'];
export const SECURITY_HARD_LIMITS = {
  outboundMb: 100,
  durationMinutes: 480,
  concurrentJobs: 50,
  publicationCount: 100,
} as const;

import type { Settings as SecuritySettings } from './types.js';

export type SecurityBoundary = Pick<
  SecuritySettings,
  'destinations' | 'environments' | 'workspaceTypes' | 'externalPublishing'
>;

export const SECURITY_FACTS = [
  'owned',
  'authorizedReview',
  'destination',
  'environment',
  'workspaceType',
  'outboundMb',
  'durationMinutes',
  'concurrentJobs',
  'publicationCount',
  'externalPublication',
  'deletion',
  'protectedWorkspace',
];

type Conditions = Rule['all'];
type Condition = Conditions[number];
const when = (field: string, op: Condition['op'], value: Condition['value']): Condition => ({
  field,
  op,
  value,
});
const deny = (id: string, ...all: Conditions): Rule => ({ id, effect: 'deny', all });
const review = (id: string, ...all: Conditions): Rule => ({
  id,
  effect: 'require_approval',
  all: [...all, when('authorizedReview', 'eq', false)] as Conditions,
});

/** Reject attempts to widen a team administrator's organization-granted boundary. */
export function assertSecurityBoundary(
  settings: SecuritySettings,
  boundary: SecurityBoundary
): void {
  for (const key of ['destinations', 'environments', 'workspaceTypes'] as const) {
    if (settings[key].some((value) => !(boundary[key] as string[]).includes(value))) {
      throw new Error(`${key} outside team boundary`);
    }
  }
  if (boundary.externalPublishing === 'deny' && settings.externalPublishing !== 'deny') {
    throw new Error('External publishing outside team boundary');
  }
}

/** Immutable controls are appended to every stored policy, including raw policy updates. */
export function securityFloorRules(boundary: SecurityBoundary): Rule[] {
  const rules: Rule[] = [
    deny('resource-access', when('owned', 'eq', false)),
    ...Object.entries(SECURITY_HARD_LIMITS).map(([field, limit]) =>
      deny(`absolute-${field}`, when(field, 'gt', limit))
    ),
    review(
      'protected-production-deletion',
      when('deletion', 'eq', true),
      when('protectedWorkspace', 'eq', true),
      when('environment', 'eq', 'production')
    ),
  ];
  for (const [field, values, allowed] of [
    ['destination', DESTINATIONS, boundary.destinations],
    ['environment', ENVIRONMENTS, boundary.environments],
    ['workspaceType', WORKSPACE_TYPES, boundary.workspaceTypes],
  ] as const) {
    for (const value of values) {
      if (!(allowed as string[]).includes(value))
        rules.push(deny(`boundary-${field}-${value}`, when(field, 'eq', value)));
    }
  }
  if (boundary.externalPublishing === 'deny') {
    rules.push(deny('boundary-external-publishing', when('externalPublication', 'eq', true)));
  }
  return rules;
}

export function withSecurityFloor(policy: Policy, boundary: SecurityBoundary): Policy {
  const floor = securityFloorRules(boundary);
  const reserved = new Set(floor.map((rule) => rule.id));
  return { ...policy, rules: [...floor, ...policy.rules.filter((rule) => !reserved.has(rule.id))] };
}

/** Compile configurable rules. The runtime must call withSecurityFloor when loading them. */
export function buildSecurityPolicy(
  teamId: string,
  settings: SecuritySettings,
  version = 1
): Policy {
  const rules: Rule[] = [];
  for (const [field, values, allowed] of [
    ['destination', DESTINATIONS, settings.destinations],
    ['environment', ENVIRONMENTS, settings.environments],
    ['workspaceType', WORKSPACE_TYPES, settings.workspaceTypes],
  ] as const) {
    for (const value of values) {
      if (!(allowed as string[]).includes(value))
        rules.push(deny(`team-${field}-${value}`, when(field, 'eq', value)));
    }
  }
  if (settings.externalPublishing === 'deny') {
    rules.push(deny('external-publishing-denied', when('externalPublication', 'eq', true)));
  } else {
    rules.push(review('external-publishing-review', when('externalPublication', 'eq', true)));
  }
  if (settings.reviewDeletion) rules.push(review('deletion-review', when('deletion', 'eq', true)));
  for (const field of [
    'outboundMb',
    'durationMinutes',
    'concurrentJobs',
    'publicationCount',
  ] as const) {
    rules.push(review(`${field}-review`, when(field, 'gt', settings[field])));
  }
  rules.push({ id: 'within-policy', effect: 'allow', all: [when('owned', 'eq', true)] });
  return {
    schemaVersion: 1,
    tenantId: teamId,
    id: SECURITY_POLICY_ID,
    version,
    defaultEffect: 'deny',
    rules,
  };
}
