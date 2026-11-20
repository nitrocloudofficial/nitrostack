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
import { operationInputs } from '../domain/schemas.js';
import { allocatedGpus, monthlyCost, simulate, type Projection } from '../domain/simulation.js';
import type { Command, Resource } from '../domain/types.js';
import { appendAudit } from '../state/audit.js';
import type { Approval, TeamState } from '../state/team-state.js';
import { buildMutationPolicy, MUTATION_FACTS, MUTATION_POLICY_ID } from './mutation.policy.js';

/**
 * How an infrastructure change flows:
 *
 *   resolveTarget → project the change → collectFacts → evaluate against the team policy
 *   → commit (allow) / queue for review (require_approval) / reject (deny) → audit
 *
 * The outer MCP call has already verified the caller. Each attempt below runs its own SDK
 * tool invocation, so its decision, audit entries and any approval refer to exactly one set
 * of parsed arguments.
 */

export type Outcome = 'ALLOW' | 'REQUIRE_APPROVAL' | 'BLOCK';

export interface OperationResult {
  decision: Outcome;
  executionError?: string;
  executed: boolean;
  /** Matching policy rule ID. */
  reason: string;
  revision: number;
  attempt: string;
  approvalId?: string;
  resourceIds: string[];
  projectedMonthlyCost: number;
}

type MutationFacts = ReturnType<typeof collectFacts>;

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

/**
 * Finds the existing resource a command refers to. A resource the caller cannot see — wrong
 * team, wrong type or wrong environment — is reported as not owned, never as "not found",
 * so IDs from other teams cannot be probed.
 */
function resolveTarget(state: TeamState, command: Command) {
  const args = command.args;
  if (!('resourceId' in args)) return { target: undefined, owned: true };

  const target = state.resources.find((r) => r.id === args.resourceId);
  const matches =
    !!target &&
    (!('environment' in args) ||
      (target.environment === args.environment && target.type === args.resourceType));
  return { target, owned: matches };
}

/** Facts the mutation policy evaluates, computed from the projected team state. */
function collectFacts(
  command: Command,
  owned: boolean,
  target: Resource | undefined,
  projection: Projection
) {
  const { tool, args } = command;
  const shape = target ?? projection.rows.find((r) => projection.affected.includes(r.id));

  return {
    owned,
    environment: shape?.environment ?? '',
    region: shape?.region ?? '',
    machine: shape?.machine ?? '',
    cpu: shape?.cpu ?? 0,
    gpus: allocatedGpus(projection.rows),
    spend: monthlyCost(projection.rows),
    replicas: 'count' in args ? args.count : 1,
    deployment:
      tool === 'deploy_application' ||
      (tool === 'scale_infrastructure' && target?.type === 'deployment'),
    deletion: tool === 'delete_resource',
  };
}

/**
 * A replay is authorized only if the approval was granted for the same policy revision
 * and the request still produces exactly the same facts.
 */
function isAuthorizedReplay(state: TeamState, factsKey: string, approval?: Approval) {
  return !!approval && approval.version === state.revision && approval.factsKey === factsKey;
}

/** Returns an error code if the change cannot be applied even though policy allows it. */
function preconditionError(state: TeamState, command: Command) {
  if (command.tool !== 'create_database') return undefined;
  const { name, region, environment } = command.args;
  const taken = state.resources.some(
    (r) =>
      r.type === 'database' && r.name === name && r.region === region && r.environment === environment
  );
  return taken ? 'database-name-in-use' : undefined;
}

const toOutcome = (decision?: Decision): Outcome =>
  decision?.effect === 'allow'
    ? 'ALLOW'
    : decision?.effect === 'require_approval'
      ? 'REQUIRE_APPROVAL'
      : 'BLOCK';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Evaluates a requested change against the team's mutation policy and, if allowed,
 * applies it to `state`. Must run inside `updateTeamState` so the change, the audit
 * entries and any new approval commit together.
 *
 * @param approval Set when an administrator replays a pending request.
 */
export async function runGuardedOperation(
  state: TeamState,
  identity: VerifiedIdentity,
  command: Command,
  ctx: ExecutionContext,
  approval?: Approval
): Promise<OperationResult> {
  const attempt = randomUUID();
  const { tool, args } = command;

  // 1. Resolve and project -----------------------------------------------------
  const { target, owned } = resolveTarget(state, command);
  let nextId = state.next;
  const projection: Projection = owned
    ? simulate(state.resources, command, () => identity.tenantId + '-' + nextId++)
    : { rows: state.resources, affected: [] };

  // 2. Collect facts -----------------------------------------------------------
  const facts: MutationFacts = collectFacts(command, owned, target, projection);
  const factsKey = JSON.stringify(facts);
  const authorizedReview = isAuthorizedReplay(state, factsKey, approval);

  // 3. Evaluate and, if allowed, commit -----------------------------------------
  let decision: Decision | undefined;
  let executionError: string | undefined;

  const mutation = new Tool({
    name: tool,
    description: 'Guarded simulator operation',
    inputSchema: operationInputs[tool],
    guardrail: { policy: MUTATION_POLICY_ID, facts: MUTATION_FACTS },
    handler: async () => {
      executionError = preconditionError(state, command);
      if (executionError) return [];
      state.resources = projection.rows;
      state.next = nextId;
      return projection.affected;
    },
  });

  mutation.attachGuardrails({
    mode: 'enforce',
    requireDeclaration: true,
    provider: {
      async getActive(teamId, policyId) {
        if (teamId !== identity.tenantId || policyId !== MUTATION_POLICY_ID) {
          throw new Error('Invalid policy scope');
        }
        return buildMutationPolicy(teamId, state);
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

  const outcome = toOutcome(decision);
  const reason = decision?.reasonCode ?? 'evaluation-unavailable';

  // 4. Audit -------------------------------------------------------------------
  const actor = identity.principalId;
  const correlation = {
    attempt,
    resource: target?.id ?? (executed ? projection.affected[0] : undefined),
  };

  appendAudit(state, { actor, tool, event: outcome, reason, ...correlation, details: args });
  if (executed) {
    appendAudit(state, { actor, tool, event: 'EXECUTED', reason, ...correlation, details: projection.affected });
  }
  if (executionError) {
    appendAudit(state, { actor, tool, event: 'FAILED', reason: executionError, ...correlation });
  }

  // 5. Approvals ---------------------------------------------------------------
  if (approval) approval.status = executed ? 'executed' : executionError ? 'failed' : 'blocked';

  if (outcome === 'REQUIRE_APPROVAL') {
    state.approvals.push({
      id: attempt,
      actor,
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
