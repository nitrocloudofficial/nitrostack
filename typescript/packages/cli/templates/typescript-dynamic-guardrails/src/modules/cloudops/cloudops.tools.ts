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

import {
  Injectable,
  ToolDecorator as Tool,
  Widget,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { assertValidPolicy } from '@nitrostack/core/guardrails';
import { cost, inputs, settingsSchema, type Command } from './domain.js';
import { access, admin, mutationPolicy, fields } from './policy.js';
import { Guardrail } from '@nitrostack/core/guardrails';
import { execute } from './operations.js';
import { identities, limits, record, seed, transaction } from './store.js';

const empty = z.object({});
const filter = z.object({ resourceId: z.string().optional() });
const policyEdit = z.object({ revision: z.number().int().positive(), settings: settingsSchema });
const review = z.object({ id: z.string().uuid(), action: z.enum(['approve', 'reject']) });
const read = { readOnlyHint: true };
@Injectable()
export class CloudOpsTools {
  private run(command: Command, ctx: ExecutionContext) {
    const { identity } = ctx.guardrail!;
    return transaction(identity.tenantId, (s) => execute(s, identity, command, ctx));
  }

  @Tool({
    name: 'provision_instance',
    description: 'Provision simulated compute or GPU instances.',
    inputSchema: inputs.provision_instance,
  })
  @Guardrail(access)
  provision_instance(args: z.infer<typeof inputs.provision_instance>, ctx: ExecutionContext) {
    return this.run({ tool: 'provision_instance', args }, ctx);
  }

  @Tool({
    name: 'deploy_application',
    description: 'Create a simulated application deployment.',
    inputSchema: inputs.deploy_application,
  })
  @Guardrail(access)
  deploy_application(args: z.infer<typeof inputs.deploy_application>, ctx: ExecutionContext) {
    return this.run({ tool: 'deploy_application', args }, ctx);
  }

  @Tool({
    name: 'scale_infrastructure',
    description: 'Change the capacity of an existing resource.',
    inputSchema: inputs.scale_infrastructure,
  })
  @Guardrail(access)
  scale_infrastructure(args: z.infer<typeof inputs.scale_infrastructure>, ctx: ExecutionContext) {
    return this.run({ tool: 'scale_infrastructure', args }, ctx);
  }

  @Tool({
    name: 'create_database',
    description: 'Create a simulated managed database.',
    inputSchema: inputs.create_database,
  })
  @Guardrail(access)
  create_database(args: z.infer<typeof inputs.create_database>, ctx: ExecutionContext) {
    return this.run({ tool: 'create_database', args }, ctx);
  }

  @Tool({
    name: 'modify_firewall_rules',
    description: 'Update an access rule in the simulated network.',
    inputSchema: inputs.modify_firewall_rules,
  })
  @Guardrail(access)
  modify_firewall_rules(args: z.infer<typeof inputs.modify_firewall_rules>, ctx: ExecutionContext) {
    return this.run({ tool: 'modify_firewall_rules', args }, ctx);
  }

  @Tool({
    name: 'delete_resource',
    description: 'Delete an owned simulated resource after policy evaluation.',
    inputSchema: inputs.delete_resource,
  })
  @Guardrail(access)
  delete_resource(args: z.infer<typeof inputs.delete_resource>, ctx: ExecutionContext) {
    return this.run({ tool: 'delete_resource', args }, ctx);
  }
  @Tool({
    name: 'get_cloud_cost',
    description: 'Read monthly simulated USD costs and remaining team budget.',
    inputSchema: filter,
    annotations: read,
  })
  @Guardrail(access)
  costs(args: z.infer<typeof filter>, ctx: ExecutionContext) {
    return transaction(
      ctx.guardrail!.identity.tenantId,
      (s) => {
        const resources = s.resources.filter((r) => !args.resourceId || r.id === args.resourceId);
        return {
          items: resources.map((r) => ({ id: r.id, monthly: r.count * r.unitCost })),
          total: cost(resources),
          remaining: s.settings.budget - cost(s.resources),
        };
      },
      false
    );
  }
  @Tool({
    name: 'get_resource_usage',
    description: 'Inspect the allocation and utilization of your resources.',
    inputSchema: filter,
    annotations: read,
  })
  @Guardrail(access)
  usage(args: z.infer<typeof filter>, ctx: ExecutionContext) {
    return transaction(
      ctx.guardrail!.identity.tenantId,
      (s) => ({
        resources: s.resources
          .filter((r) => !args.resourceId || r.id === args.resourceId)
          .map((r) => ({ ...r, gpuUtilization: r.gpu ? 65 : 0 })),
      }),
      false
    );
  }
  @Tool({
    name: 'show_cloudops_dashboard',
    description: 'Open the CloudOps Guardian simulator dashboard.',
    inputSchema: empty,
    annotations: read,
  })
  @Widget({ route: 'cloudops-dashboard', prefersBorder: true })
  @Guardrail(access)
  dashboard(_args: unknown, ctx: ExecutionContext) {
    return this.snapshot(_args, ctx);
  }
  @Tool({
    name: 'get_cloudops_snapshot',
    description: 'Read current team policy, resources, approvals and audit history.',
    inputSchema: empty,
    annotations: read,
  })
  @Guardrail(access)
  snapshot(_args: unknown, ctx: ExecutionContext) {
    const { identity } = ctx.guardrail!;
    return transaction(
      identity.tenantId,
      (s) => ({
        ...s,
        team: identity.tenantId,
        actor: identity.principalId,
        canEdit: identity.scopes.includes('admin'),
        permittedRegions: limits(identity.tenantId),
        monthly: cost(s.resources),
        approvals: s.approvals.map(({ factsKey: _key, ...rest }) => rest),
      }),
      false
    );
  }
  @Tool({
    name: 'update_policy',
    description: 'Save a new team policy revision.',
    inputSchema: policyEdit,
  })
  @Guardrail(admin)
  update(args: z.infer<typeof policyEdit>, ctx: ExecutionContext) {
    const { identity } = ctx.guardrail!;
    return transaction(identity.tenantId, (s) => {
      if (s.revision !== args.revision)
        throw new Error('Policy changed. Reload the current revision.');
      if (args.settings.regions.some((r) => !limits(identity.tenantId).includes(r)))
        throw new Error('Region outside team boundary');
      const previous = s.settings;
      s.settings = args.settings;
      s.revision++;
      assertValidPolicy(
        mutationPolicy(identity.tenantId, s),
        identity.tenantId,
        'cloud-mutation',
        fields
      );
      record(s, identity.principalId, 'update_policy', 'UPDATED', 'Team policy saved', {
        details: { previous, updated: s.settings },
      });
      return { revision: s.revision };
    });
  }
  @Tool({
    name: 'review_approval',
    description: 'Reject or replay a pending team request against current guardrails.',
    inputSchema: review,
  })
  @Guardrail(admin)
  review(args: z.infer<typeof review>, ctx: ExecutionContext) {
    const { identity } = ctx.guardrail!;
    return transaction(identity.tenantId, async (s) => {
      const item = s.approvals.find((a) => a.id === args.id);
      if (!item) throw new Error('Approval unavailable');
      if (item.status !== 'pending') return { status: item.status };
      record(
        s,
        identity.principalId,
        'review_approval',
        args.action === 'reject' ? 'REJECTED' : 'APPROVED',
        item.reason,
        { attempt: item.id }
      );
      if (args.action === 'reject') {
        item.status = 'rejected';
        return { status: item.status };
      }
      const requester = [...identities.values()].find(
        (i) => i.tenantId === identity.tenantId && i.principalId === item.actor
      );
      if (!requester) throw new Error('Requester unavailable');
      const result = await execute(s, requester, item.command, ctx, item);
      record(s, identity.principalId, 'review_approval', 'REPLAY', result.reason, {
        attempt: item.id,
        details: { replay: result.attempt },
      });
      return result;
    });
  }
  @Tool({
    name: 'reset_demo',
    description: 'Restore this team’s fixtures and invalidate pending requests.',
    inputSchema: empty,
  })
  @Guardrail(admin)
  reset(_args: unknown, ctx: ExecutionContext) {
    const { identity } = ctx.guardrail!;
    return transaction(identity.tenantId, (s) => {
      const revision = s.revision + 1;
      Object.assign(s, seed(identity.tenantId), { revision });
      record(s, identity.principalId, 'reset_demo', 'RESET', 'Team fixtures restored');
      return { revision };
    });
  }
}
