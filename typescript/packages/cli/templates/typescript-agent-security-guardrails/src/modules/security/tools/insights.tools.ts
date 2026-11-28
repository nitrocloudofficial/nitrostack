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

import { Injectable, ToolDecorator as Tool, Widget, type ExecutionContext } from '@nitrostack/core';
import { Guardrail } from '@nitrostack/core/guardrails';
import { noInput } from '../domain/schemas.js';
import { MEMBER_ACCESS } from '../guardrails/access.guardrails.js';
import { toSnapshot } from '../state/snapshot.js';
import { readTeamState } from '../state/team-state.js';
import { caller } from './caller.js';

const READ_ONLY = { readOnlyHint: true };
@Injectable()
export class InsightsTools {
  @Tool({
    name: 'get_agent_activity',
    description: 'Read recorded team activity.',
    inputSchema: noInput,
    annotations: READ_ONLY,
  })
  @Guardrail(MEMBER_ACCESS)
  activity(_args: unknown, ctx: ExecutionContext) {
    return readTeamState(caller(ctx).tenantId, (state) => ({ history: state.history }));
  }
  @Tool({
    name: 'get_workspaces',
    description: 'Inspect team workspaces and simulated operations.',
    inputSchema: noInput,
    annotations: READ_ONLY,
  })
  @Guardrail(MEMBER_ACCESS)
  inventory(_args: unknown, ctx: ExecutionContext) {
    return readTeamState(caller(ctx).tenantId, (state) => state.resources);
  }

  @Tool({
    name: 'show_security_dashboard',
    description: 'Open the Agent Security Control Room simulator dashboard.',
    inputSchema: noInput,
    annotations: READ_ONLY,
  })
  @Widget({ route: 'security-dashboard', prefersBorder: true })
  @Guardrail(MEMBER_ACCESS)
  showDashboard(_args: unknown, ctx: ExecutionContext) {
    return this.getSnapshot(_args, ctx);
  }

  @Tool({
    name: 'get_security_snapshot',
    description: 'Read current team policy, resources, approvals and audit history.',
    inputSchema: noInput,
    annotations: READ_ONLY,
  })
  @Guardrail(MEMBER_ACCESS)
  getSnapshot(_args: unknown, ctx: ExecutionContext) {
    const identity = caller(ctx);
    return readTeamState(identity.tenantId, (state) => toSnapshot(state, identity));
  }
}
