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
import { projectSecurityOperation } from '../domain/security-simulation.js';
import type { Command } from '../domain/types.js';
import { appendAudit } from '../state/audit.js';
import { recordDecision, type Approval, type TeamState } from '../state/team-state.js';
import { MUTATION_FACTS, MUTATION_POLICY_ID } from './mutation.policy.js';
import { policyService } from './policy-service.js';

/**
 * How an workspace change flows:
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
  executed: boolean;
  /** Matching policy rule ID. */
  reason: string;
  revision: number;
  attempt: string;
  approvalId?: string;
  resourceIds: string[];
  outboundMb: number;
}

/**
 * A replay is authorized only if the approval was granted for the same policy revision
 * and the request still produces exactly the same facts.
 */
function isAuthorizedReplay(revision: number, factsKey: string, approval?: Approval) {
  return !!approval && approval.version === revision && approval.factsKey === factsKey;
}

export const toOutcome = (decision?: Decision): Outcome =>
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
  let nextId = state.next;
  const projection = projectSecurityOperation(state.resources, command, () => identity.tenantId + '-' + nextId++);
  const facts = projection.facts;
  const factsKey = JSON.stringify(facts);

  // The active policy comes from the runtime cache (store + push + TTL), so a change made
  // through the dashboard, the API, a webhook or the database applies to the next call.
  // A load failure is passed to the guardrail, which then fails closed.
  const loaded = await policyService()
    .provider.getActive(identity.tenantId, MUTATION_POLICY_ID)
    .then((policy) => ({ policy }), (error: unknown) => ({ error }));
  const revision = 'policy' in loaded ? loaded.policy.version : state.revision;
  const authorizedReview = isAuthorizedReplay(revision, factsKey, approval);

  // 3. Evaluate and, if allowed, commit -----------------------------------------
  let decision: Decision | undefined;

  const mutation = new Tool({
    name: tool,
    description: 'Guarded simulator operation',
    inputSchema: operationInputs[tool],
    guardrail: { policy: MUTATION_POLICY_ID, facts: MUTATION_FACTS },
    handler: async () => {
      state.resources = projection.state;
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
        if ('error' in loaded) throw loaded.error;
        return loaded.policy;
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
    executed = true;
  } catch (error) {
    if (!(error instanceof GuardrailDecisionError)) throw error;
  }

  const outcome = toOutcome(decision);
  const reason = decision?.reasonCode ?? 'evaluation-unavailable';

  // 4. Audit -------------------------------------------------------------------
  const actor = identity.principalId;
  const correlation = {
    attempt,
    resource: 'workspaceId' in args ? args.workspaceId : projection.affected[0],
  };

  appendAudit(state, { actor, tool, event: outcome, reason, ...correlation, details: args });
  if (executed) {
    appendAudit(state, { actor, tool, event: 'EXECUTED', reason, ...correlation, details: projection.affected });
  }
  // Keep the facts of new requests (not approval replays) for policy impact previews.
  if (!approval) recordDecision(state, { attempt, actor, tool, facts });

  // 5. Approvals ---------------------------------------------------------------
  if (approval) approval.status = executed ? 'executed' : 'blocked';

  if (outcome === 'REQUIRE_APPROVAL') {
    state.approvals.push({
      id: attempt,
      actor,
      command,
      time: new Date().toISOString(),
      reason,
      version: revision,
      outboundMb: facts.outboundMb,
      factsKey,
      requester: {
        tenantId: identity.tenantId,
        principalId: identity.principalId,
        scopes: identity.scopes,
        source: identity.source,
      },
      status: 'pending',
    });
  }

  return {
    decision: outcome,
    executed,
    reason,
    revision,
    attempt,
    approvalId: outcome === 'REQUIRE_APPROVAL' ? attempt : undefined,
    resourceIds: executed ? projection.affected : [],
    outboundMb: facts.outboundMb,
  };
}
