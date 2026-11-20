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
 * Workspace changes. Any team member may request them; each request is then judged
 * by the team's mutation policy and is allowed, sent for review, or blocked.
 */
@Injectable()
export class WorkspaceTools {
  private request(command: Command, ctx: ExecutionContext) {
    const identity = caller(ctx);
    return updateTeamState(identity.tenantId, (state) =>
      runGuardedOperation(state, identity, command, ctx)
    );
  }

  @Tool({
    name: 'create_workspace',
    description: 'Create a simulated workspace.',
    inputSchema: input.create_workspace,
  })
  @Guardrail(MEMBER_ACCESS)
  create_workspace(args: Args<'create_workspace'>, ctx: ExecutionContext) {
    return this.request({ tool: 'create_workspace', args }, ctx);
  }

  @Tool({
    name: 'run_outbound_job',
    description: 'Record an outbound job in a team workspace.',
    inputSchema: input.run_outbound_job,
  })
  @Guardrail(MEMBER_ACCESS)
  run_outbound_job(args: Args<'run_outbound_job'>, ctx: ExecutionContext) {
    return this.request({ tool: 'run_outbound_job', args }, ctx);
  }

  @Tool({
    name: 'publish_artifact',
    description: 'Record publication of a fictional artifact.',
    inputSchema: input.publish_artifact,
  })
  @Guardrail(MEMBER_ACCESS)
  publish_artifact(args: Args<'publish_artifact'>, ctx: ExecutionContext) {
    return this.request({ tool: 'publish_artifact', args }, ctx);
  }

  @Tool({
    name: 'export_data',
    description: 'Record a simulated export in the audit log.',
    inputSchema: input.export_data,
  })
  @Guardrail(MEMBER_ACCESS)
  export_data(args: Args<'export_data'>, ctx: ExecutionContext) {
    return this.request({ tool: 'export_data', args }, ctx);
  }

  @Tool({
    name: 'change_workspace_access',
    description: 'Change a workspace access label.',
    inputSchema: input.change_workspace_access,
  })
  @Guardrail(MEMBER_ACCESS)
  change_workspace_access(args: Args<'change_workspace_access'>, ctx: ExecutionContext) {
    return this.request({ tool: 'change_workspace_access', args }, ctx);
  }

  @Tool({
    name: 'delete_workspace',
    description: 'Remove a workspace and its simulated jobs and artifacts.',
    inputSchema: input.delete_workspace,
  })
  @Guardrail(MEMBER_ACCESS)
  delete_workspace(args: Args<'delete_workspace'>, ctx: ExecutionContext) {
    return this.request({ tool: 'delete_workspace', args }, ctx);
  }
}
