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

import { Injectable, ToolDecorator as Tool, z, type ExecutionContext } from '@nitrostack/core';
import { assertValidPolicy, Guardrail } from '@nitrostack/core/guardrails';
import { noInput, reviewApprovalInput, updatePolicyInput } from '../domain/schemas.js';
import { ADMIN_ACCESS } from '../guardrails/access.guardrails.js';
import { runGuardedOperation } from '../guardrails/guarded-operation.js';
import {
  buildMutationPolicy,
  MUTATION_FACTS,
  MUTATION_POLICY_ID,
} from '../guardrails/mutation.policy.js';
import { appendAudit } from '../state/audit.js';
import { findTeamMember } from '../state/identities.js';
import { regionBoundary } from '../state/seeds.js';
import { seedTeamState, updateTeamState } from '../state/team-state.js';
import { caller } from './caller.js';

/** Team administration: policy edits, human review of held requests, and demo resets. */
@Injectable()
export class AdministrationTools {
  @Tool({
    name: 'update_policy',
    description: 'Save a new team policy revision.',
    inputSchema: updatePolicyInput,
  })
  @Guardrail(ADMIN_ACCESS)
  updatePolicy(args: z.infer<typeof updatePolicyInput>, ctx: ExecutionContext) {
    const identity = caller(ctx);
    const team = identity.tenantId;

    return updateTeamState(team, (state) => {
      // Optimistic concurrency: the editor must have seen the current revision.
      if (state.revision !== args.revision) {
        throw new Error('Policy changed. Reload the current revision.');
      }
      if (args.settings.regions.some((r) => !regionBoundary(team).includes(r))) {
        throw new Error('Region outside team boundary');
      }

      const previous = state.settings;
      state.settings = args.settings;
      state.revision++;
      assertValidPolicy(buildMutationPolicy(team, state), team, MUTATION_POLICY_ID, MUTATION_FACTS);

      appendAudit(state, {
        actor: identity.principalId,
        tool: 'update_policy',
        event: 'UPDATED',
        reason: 'Team policy saved',
        details: { previous, updated: state.settings },
      });
      return { revision: state.revision };
    });
  }

  @Tool({
    name: 'review_approval',
    description: 'Reject or replay a pending team request against current guardrails.',
    inputSchema: reviewApprovalInput,
  })
  @Guardrail(ADMIN_ACCESS)
  reviewApproval(args: z.infer<typeof reviewApprovalInput>, ctx: ExecutionContext) {
    const identity = caller(ctx);
    const team = identity.tenantId;

    return updateTeamState(team, async (state) => {
      const item = state.approvals.find((a) => a.id === args.id);
      if (!item) throw new Error('Approval unavailable');
      if (item.status !== 'pending') return { status: item.status };

      appendAudit(state, {
        actor: identity.principalId,
        tool: 'review_approval',
        event: args.action === 'reject' ? 'REJECTED' : 'APPROVED',
        reason: item.reason,
        attempt: item.id,
      });

      if (args.action === 'reject') {
        item.status = 'rejected';
        return { status: item.status };
      }

      // Approval does not bypass policy: the request is replayed as its original caller
      // against the current rules, and only review rules are lifted.
      const requester = findTeamMember(team, item.actor);
      if (!requester) throw new Error('Requester unavailable');

      const result = await runGuardedOperation(state, requester, item.command, ctx, item);
      appendAudit(state, {
        actor: identity.principalId,
        tool: 'review_approval',
        event: 'REPLAY',
        reason: result.reason,
        attempt: item.id,
        details: { replay: result.attempt },
      });
      return result;
    });
  }

  @Tool({
    name: 'reset_demo',
    description: 'Restore this team’s fixtures and invalidate pending requests.',
    inputSchema: noInput,
  })
  @Guardrail(ADMIN_ACCESS)
  resetDemo(_args: unknown, ctx: ExecutionContext) {
    const identity = caller(ctx);

    return updateTeamState(identity.tenantId, (state) => {
      // Bumping the revision invalidates approvals granted before the reset.
      const revision = state.revision + 1;
      Object.assign(state, seedTeamState(identity.tenantId), { revision });
      appendAudit(state, {
        actor: identity.principalId,
        tool: 'reset_demo',
        event: 'RESET',
        reason: 'Team fixtures restored',
      });
      return { revision };
    });
  }
}
