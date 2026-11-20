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
import { HARD_LIMITS, MACHINE_TYPES, REGIONS } from '../domain/limits.js';
import type { TeamState } from '../state/team-state.js';

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

/**
 * Compiles a team's settings into its mutation policy. The policy version is the team's
 * revision, so every audit entry and approval names the exact rules it was judged by.
 *
 * Rules are evaluated in order and the first match wins:
 *   1. deny     — ownership, hard limits, disabled regions/machines, team restrictions
 *   2. review   — production changes and anything over the team's immediate limits
 *   3. allow    — everything else the team owns
 *
 * Review rules stop matching once an administrator approves the exact request
 * (`authorizedReview`), but deny rules always apply.
 */
export function buildMutationPolicy(teamId: string, state: TeamState): Policy {
  const settings = state.settings;
  const rules: Rule[] = [];

  const deny = (id: string, ...all: Conditions) => rules.push({ id, effect: 'deny', all });
  const review = (id: string, ...all: Conditions) =>
    rules.push({
      id,
      effect: 'require_approval',
      all: [...all, when('authorizedReview', 'eq', false)] as Conditions,
    });
  const allow = (id: string, ...all: Conditions) => rules.push({ id, effect: 'allow', all });

  // 1. Hard denials ----------------------------------------------------------
  deny('resource-access', when('owned', 'eq', false));
  deny('absolute-gpu-ceiling', when('gpus', 'gt', HARD_LIMITS.gpusPerTeam));
  deny('absolute-cpu-ceiling', when('cpu', 'gt', HARD_LIMITS.vcpuPerInstance));
  deny('absolute-spending-ceiling', when('spend', 'gt', HARD_LIMITS.monthlySpendUsd));

  for (const region of REGIONS) {
    if (!settings.regions.includes(region)) deny('region-' + region, when('region', 'eq', region));
  }
  for (const machine of MACHINE_TYPES) {
    if (!settings.machines.includes(machine)) deny('machine-' + machine, when('machine', 'eq', machine));
  }

  // Team-specific restrictions.
  if (teamId === 'development') {
    deny('development-only', when('environment', 'neq', 'development'));
  }
  if (teamId === 'ml') {
    deny(
      'production-deployment-restricted',
      when('deployment', 'eq', true),
      when('environment', 'eq', 'production')
    );
  }

  // 2. Human review ----------------------------------------------------------
  review('production-deletion', when('deletion', 'eq', true), when('environment', 'eq', 'production'));
  review('production-deployment', when('deployment', 'eq', true), when('environment', 'eq', 'production'));
  if (settings.reviewDeletion) review('resource-deletion', when('deletion', 'eq', true));
  review('gpu-review', when('gpus', 'gt', settings.gpu));
  review('cpu-review', when('cpu', 'gt', settings.cpu));
  review('budget-review', when('spend', 'gt', settings.budget));
  review('deployment-size', when('deployment', 'eq', true), when('replicas', 'gt', settings.deployment));

  // 3. Allow -----------------------------------------------------------------
  allow('within-policy', when('owned', 'eq', true));

  return {
    schemaVersion: 1,
    tenantId: teamId,
    id: MUTATION_POLICY_ID,
    version: state.revision,
    defaultEffect: 'deny',
    rules,
  };
}
