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

import { Injectable, ToolDecorator as Tool, type ExecutionContext } from '@nitrostack/core';
import { Guardrail } from '@nitrostack/core/guardrails';
import { operationInputs as input } from '../domain/schemas.js';
import type { Command } from '../domain/types.js';
import { MEMBER_ACCESS } from '../guardrails/access.guardrails.js';
import { runGuardedOperation } from '../guardrails/guarded-operation.js';
import { updateTeamState } from '../state/team-state.js';
import { caller } from './caller.js';

type Args<K extends Command['tool']> = Extract<Command, { tool: K }>['args'];

/**
 * Infrastructure changes. Any team member may request them; each request is then judged
 * by the team's mutation policy and is allowed, sent for review, or blocked.
 */
@Injectable()
export class InfrastructureTools {
  private request(command: Command, ctx: ExecutionContext) {
    const identity = caller(ctx);
    return updateTeamState(identity.tenantId, (state) =>
      runGuardedOperation(state, identity, command, ctx)
    );
  }

  @Tool({
    name: 'provision_instance',
    description: 'Provision simulated compute or GPU instances.',
    inputSchema: input.provision_instance,
  })
  @Guardrail(MEMBER_ACCESS)
  provisionInstance(args: Args<'provision_instance'>, ctx: ExecutionContext) {
    return this.request({ tool: 'provision_instance', args }, ctx);
  }

  @Tool({
    name: 'deploy_application',
    description: 'Create a simulated application deployment.',
    inputSchema: input.deploy_application,
  })
  @Guardrail(MEMBER_ACCESS)
  deployApplication(args: Args<'deploy_application'>, ctx: ExecutionContext) {
    return this.request({ tool: 'deploy_application', args }, ctx);
  }

  @Tool({
    name: 'scale_infrastructure',
    description: 'Change the capacity of an existing resource.',
    inputSchema: input.scale_infrastructure,
  })
  @Guardrail(MEMBER_ACCESS)
  scaleInfrastructure(args: Args<'scale_infrastructure'>, ctx: ExecutionContext) {
    return this.request({ tool: 'scale_infrastructure', args }, ctx);
  }

  @Tool({
    name: 'create_database',
    description: 'Create a simulated managed database.',
    inputSchema: input.create_database,
  })
  @Guardrail(MEMBER_ACCESS)
  createDatabase(args: Args<'create_database'>, ctx: ExecutionContext) {
    return this.request({ tool: 'create_database', args }, ctx);
  }

  @Tool({
    name: 'modify_firewall_rules',
    description: 'Update an access rule in the simulated network.',
    inputSchema: input.modify_firewall_rules,
  })
  @Guardrail(MEMBER_ACCESS)
  modifyFirewallRules(args: Args<'modify_firewall_rules'>, ctx: ExecutionContext) {
    return this.request({ tool: 'modify_firewall_rules', args }, ctx);
  }

  @Tool({
    name: 'delete_resource',
    description: 'Delete an owned simulated resource after policy evaluation.',
    inputSchema: input.delete_resource,
  })
  @Guardrail(MEMBER_ACCESS)
  deleteResource(args: Args<'delete_resource'>, ctx: ExecutionContext) {
    return this.request({ tool: 'delete_resource', args }, ctx);
  }
}
