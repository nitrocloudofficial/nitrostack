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
import { ENVIRONMENTS, HARD_LIMITS, MACHINE_TYPES, REGIONS } from '../domain/limits.js';
import type { Settings } from '../domain/types.js';
import { teamBoundary } from '../state/seeds.js';

export const MUTATION_POLICY_ID = 'cloud-mutation';

/**
 * Facts computed for every infrastructure change (see `collectFacts` in
 * `guarded-operation.ts`). Policies may only reference these fields.
 */
export const MUTATION_FACTS = [
  'owned',
  'environment',
  'region',
  'machine',
  'cpu',
  'gpus',
  'spend',
  'replicas',
  'deployment',
  'deletion',
  'authorizedReview',
];

/** A non-empty list of conditions that must all hold. */
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

/**
 * Code-owned floor. Evaluated with every stored policy and cannot be removed by a policy
 * change from the dashboard, the API, a webhook or the database: tenant isolation, absolute
 * ceilings, the organization boundary from `seeds/teams.json` and review of production
 * deletions. Deny beats every other effect, so a stored `allow` cannot override it.
 */
export function floorRules(teamId: string): Rule[] {
  const boundary = teamBoundary(teamId);
  const rules: Rule[] = [
    deny('resource-access', when('owned', 'eq', false)),
    deny('absolute-gpu-ceiling', when('gpus', 'gt', HARD_LIMITS.gpusPerTeam)),
    deny('absolute-cpu-ceiling', when('cpu', 'gt', HARD_LIMITS.vcpuPerInstance)),
    deny('absolute-spending-ceiling', when('spend', 'gt', HARD_LIMITS.monthlySpendUsd)),
  ];
  for (const region of REGIONS) {
    if (!boundary.regions.includes(region)) rules.push(deny('region-' + region, when('region', 'eq', region)));
  }
  for (const environment of ENVIRONMENTS) {
    if (!boundary.environments.includes(environment)) {
      rules.push(deny('environment-' + environment, when('environment', 'eq', environment)));
    }
  }
  if (boundary.productionDeployments === 'deny') {
    rules.push(
      deny('production-deployment-restricted', when('deployment', 'eq', true), when('environment', 'eq', 'production'))
    );
  }
  rules.push(review('production-deletion', when('deletion', 'eq', true), when('environment', 'eq', 'production')));
  return rules;
}

export const FLOOR_RULE_IDS = (teamId: string) => new Set(floorRules(teamId).map((r) => r.id));

/** Floor rules first, then the stored rules. Stored rules that reuse a floor rule ID are dropped. */
export function withFloor(policy: Policy): Policy {
  const floor = floorRules(policy.tenantId);
  const reserved = new Set(floor.map((r) => r.id));
  return { ...policy, rules: [...floor, ...policy.rules.filter((r) => !reserved.has(r.id))] };
}

/**
 * Compiles a team's settings into the stored part of its mutation policy. This is the seed
 * generator and the compiler behind the settings form, `PATCH .../settings` and
 * `npm run policy -- set`. At runtime the policy is read from the store, so a policy saved
 * directly (`POST .../versions`) may contain any rules over {@link MUTATION_FACTS}.
 *
 * Evaluation: deny beats require_approval beats allow. Review rules stop matching once an
 * administrator approves the exact request (`authorizedReview`); deny rules always apply.
 */
export function buildMutationPolicy(teamId: string, settings: Settings, version = 1): Policy {
  const rules: Rule[] = [];

  // 1. Team denials ------------------------------------------------------------
  for (const region of REGIONS) {
    if (!settings.regions.includes(region)) rules.push(deny('region-' + region, when('region', 'eq', region)));
  }
  for (const machine of MACHINE_TYPES) {
    if (!settings.machines.includes(machine)) rules.push(deny('machine-' + machine, when('machine', 'eq', machine)));
  }
  for (const environment of ENVIRONMENTS) {
    if (!settings.environments.includes(environment)) {
      rules.push(deny('environment-' + environment, when('environment', 'eq', environment)));
    }
  }
  if (settings.productionDeployments === 'deny') {
    rules.push(
      deny('production-deployment-restricted', when('deployment', 'eq', true), when('environment', 'eq', 'production'))
    );
  }

  // 2. Human review ------------------------------------------------------------
  rules.push(review('production-deployment', when('deployment', 'eq', true), when('environment', 'eq', 'production')));
  if (settings.reviewDeletion) rules.push(review('resource-deletion', when('deletion', 'eq', true)));
  rules.push(review('gpu-review', when('gpus', 'gt', settings.gpu)));
  rules.push(review('cpu-review', when('cpu', 'gt', settings.cpu)));
  rules.push(review('budget-review', when('spend', 'gt', settings.budget)));
  rules.push(review('deployment-size', when('deployment', 'eq', true), when('replicas', 'gt', settings.deployment)));

  // 3. Allow -------------------------------------------------------------------
  rules.push({ id: 'within-policy', effect: 'allow', all: [when('owned', 'eq', true)] });

  const reserved = FLOOR_RULE_IDS(teamId);
  return {
    schemaVersion: 1,
    tenantId: teamId,
    id: MUTATION_POLICY_ID,
    version,
    defaultEffect: 'deny',
    rules: rules.filter((r) => !reserved.has(r.id)),
  };
}
