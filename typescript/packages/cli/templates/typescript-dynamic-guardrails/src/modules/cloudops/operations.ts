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

import { randomUUID } from 'node:crypto';
import { Tool, type ExecutionContext } from '@nitrostack/core';
import {
  GuardrailDecisionError,
  type Decision,
  type VerifiedIdentity,
} from '@nitrostack/core/guardrails';
import { cost, gpus, inputs, simulate, type Command } from './domain.js';
import { fields, mutationPolicy } from './policy.js';
import { record, type Approval, type Team } from './store.js';

// The outer MCP call verifies identity. Each attempt below gets its own SDK invocation,
// so its audit callback and approval refer to exactly one set of parsed arguments.
export async function execute(
  state: Team,
  identity: VerifiedIdentity,
  command: Command,
  ctx: ExecutionContext,
  approval?: Approval
) {
  const attempt = randomUUID();
  const { tool, args } = command;
  const target =
    'resourceId' in args ? state.resources.find((r) => r.id === args.resourceId) : undefined;
  const owned =
    !('resourceId' in args) ||
    !!(
      target &&
      (!('environment' in args) ||
        (target.environment === args.environment && target.type === args.resourceType))
    );
  let next = state.next;
  const projection = owned
    ? simulate(state.resources, command, () => identity.tenantId + '-' + next++)
    : { rows: state.resources, affected: [] };
  const shape = target ?? projection.rows.find((r) => projection.affected.includes(r.id));
  const facts = {
    owned,
    environment: shape?.environment ?? '',
    region: shape?.region ?? '',
    machine: shape?.machine ?? '',
    cpu: shape?.cpu ?? 0,
    gpus: gpus(projection.rows),
    spend: cost(projection.rows),
    replicas: 'count' in args ? args.count : 1,
    deployment:
      tool === 'deploy_application' ||
      (tool === 'scale_infrastructure' && target?.type === 'deployment'),
    deletion: tool === 'delete_resource',
  };
  const factsKey = JSON.stringify(facts);
  const authorizedReview =
    !!approval && approval.version === state.revision && approval.factsKey === factsKey;
  let decision: Decision | undefined;
  let executionError: string | undefined;
  const mutation = new Tool({
    name: tool,
    description: 'Guarded simulator operation',
    inputSchema: inputs[tool],
    guardrail: { policy: 'cloud-mutation', facts: fields },
    handler: async () => {
      if (command.tool === 'create_database') {
        const { name, region, environment } = command.args;
        if (
          state.resources.some(
            (r) =>
              r.type === 'database' &&
              r.name === name &&
              r.region === region &&
              r.environment === environment
          )
        ) {
          executionError = 'database-name-in-use';
          return [];
        }
      }
      state.resources = projection.rows;
      state.next = next;
      return projection.affected;
    },
  });
  mutation.attachGuardrails({
    mode: 'enforce',
    requireDeclaration: true,
    provider: {
      async getActive(team, id) {
        if (team !== identity.tenantId || id !== 'cloud-mutation')
          throw new Error('Invalid policy scope');
        return mutationPolicy(team, state);
      },
    },
    identityResolver: () => identity,
    contextResolver: () => ({ ...facts, authorizedReview }),
    audit: (event) => {
      decision = event.decision;
    },
  });
  let executed = false;
  try {
    await mutation.execute(args, { ...ctx, guardrail: undefined });
    executed = !executionError;
  } catch (error) {
    if (!(error instanceof GuardrailDecisionError)) throw error;
  }
  const outcome =
    decision?.effect === 'allow'
      ? 'ALLOW'
      : decision?.effect === 'require_approval'
        ? 'REQUIRE_APPROVAL'
        : 'BLOCK';
  const reason = decision?.reasonCode ?? 'evaluation-unavailable';
  const extra = {
    attempt,
    resource: target?.id ?? (executed ? projection.affected[0] : undefined),
  };
  record(state, identity.principalId, tool, outcome, reason, { ...extra, details: args });
  if (executed)
    record(state, identity.principalId, tool, 'EXECUTED', reason, {
      ...extra,
      details: projection.affected,
    });
  if (executionError) record(state, identity.principalId, tool, 'FAILED', executionError, extra);
  if (approval) approval.status = executed ? 'executed' : executionError ? 'failed' : 'blocked';
  if (outcome === 'REQUIRE_APPROVAL') {
    state.approvals.push({
      id: attempt,
      actor: identity.principalId,
      command,
      time: new Date().toISOString(),
      reason,
      version: state.revision,
      projectedCost: facts.spend,
      factsKey,
      status: 'pending',
    });
  }
  return {
    decision: outcome,
    executionError,
    executed,
    reason,
    revision: state.revision,
    attempt,
    approvalId: outcome === 'REQUIRE_APPROVAL' ? attempt : undefined,
    resourceIds: executed ? projection.affected : [],
    projectedMonthlyCost: facts.spend,
  };
}
