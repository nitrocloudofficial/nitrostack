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

import type { GuardrailsConfig, Policy, Rule } from '@nitrostack/core/guardrails';
import { identities, type Team } from './store.js';

export const access = { policy: 'cloudops-access', facts: ['authorized'] };
export const admin = { policy: 'cloudops-admin', facts: ['authorized'] };
export const guardrails: GuardrailsConfig = {
  mode: 'enforce',
  requireDeclaration: true,
  identityResolver: (ctx) => {
    const header = ctx.metadata?.authorization;
    return typeof header === 'string'
      ? (identities.get(/^Bearer (\S+)$/i.exec(header)?.[1] ?? '') ?? null)
      : null;
  },
  provider: {
    async getActive(tenantId, id) {
      if (id !== access.policy && id !== admin.policy) throw new Error('Unknown access policy');
      return {
        schemaVersion: 1,
        tenantId,
        id,
        version: 1,
        defaultEffect: 'deny',
        rules: [
          {
            id: 'team-member',
            effect: 'allow',
            all: [{ field: 'authorized', op: 'eq', value: true }],
          },
        ],
      };
    },
  },
  contextResolver: ({ identity, tool }) => ({
    authorized:
      !(tool.guardrail && 'policy' in tool.guardrail && tool.guardrail.policy === admin.policy) ||
      identity.scopes.includes('admin'),
  }),
};

export const fields = [
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
export function mutationPolicy(team: string, state: Team): Policy {
  const s = state.settings;
  type Condition = Rule['all'][number];
  const c = (field: string, op: Condition['op'], value: Condition['value']): Condition => ({
    field,
    op,
    value,
  });
  const rules: Rule[] = [];
  function deny(id: string, ...all: Rule['all']) {
    rules.push({ id, effect: 'deny', all });
  }
  function review(id: string, ...conditions: Rule['all']) {
    rules.push({
      id,
      effect: 'require_approval',
      all: [...conditions, c('authorizedReview', 'eq', false)],
    });
  }
  deny('resource-access', c('owned', 'eq', false));
  deny('absolute-gpu-ceiling', c('gpus', 'gt', 16));
  deny('absolute-cpu-ceiling', c('cpu', 'gt', 32));
  deny('absolute-spending-ceiling', c('spend', 'gt', 5000));
  for (const r of ['Mumbai', 'Singapore']) {
    if (!s.regions.includes(r as 'Mumbai' | 'Singapore')) deny('region-' + r, c('region', 'eq', r));
  }
  for (const m of ['general', 'accelerated'] as const) {
    if (!s.machines.includes(m)) deny('machine-' + m, c('machine', 'eq', m));
  }
  if (team === 'development') deny('development-only', c('environment', 'neq', 'development'));
  if (team === 'ml')
    deny(
      'production-deployment-restricted',
      c('deployment', 'eq', true),
      c('environment', 'eq', 'production')
    );
  review('production-deletion', c('deletion', 'eq', true), c('environment', 'eq', 'production'));
  review(
    'production-deployment',
    c('deployment', 'eq', true),
    c('environment', 'eq', 'production')
  );
  if (s.reviewDeletion) review('resource-deletion', c('deletion', 'eq', true));
  review('gpu-review', c('gpus', 'gt', s.gpu));
  review('cpu-review', c('cpu', 'gt', s.cpu));
  review('budget-review', c('spend', 'gt', s.budget));
  review('deployment-size', c('deployment', 'eq', true), c('replicas', 'gt', s.deployment));
  rules.push({ id: 'within-policy', effect: 'allow', all: [c('owned', 'eq', true)] });
  return {
    schemaVersion: 1,
    tenantId: team,
    id: 'cloud-mutation',
    version: state.revision,
    defaultEffect: 'deny',
    rules,
  };
}
