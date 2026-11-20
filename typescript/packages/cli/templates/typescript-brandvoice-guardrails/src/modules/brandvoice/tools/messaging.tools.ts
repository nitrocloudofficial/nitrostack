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
 * Messaging actions. Any team member may request them; each request is then judged by the
 * team's voice policy and is allowed, sent for review, or blocked.
 */
@Injectable()
export class MessagingTools {
  private request(command: Command, ctx: ExecutionContext) {
    const identity = caller(ctx);
    return updateTeamState(identity.tenantId, (state) =>
      runGuardedOperation(state, identity, command, ctx)
    );
  }

  @Tool({
    name: 'send_reply',
    description:
      "Send a simulated reply to one customer. The server scores the text's voice and slang; check get_voice_guide first.",
    inputSchema: input.send_reply,
  })
  @Guardrail(MEMBER_ACCESS)
  sendReply(args: Args<'send_reply'>, ctx: ExecutionContext) {
    return this.request({ tool: 'send_reply', args }, ctx);
  }

  @Tool({
    name: 'publish_post',
    description: 'Publish a simulated post to followers or as an official company statement.',
    inputSchema: input.publish_post,
  })
  @Guardrail(MEMBER_ACCESS)
  publishPost(args: Args<'publish_post'>, ctx: ExecutionContext) {
    return this.request({ tool: 'publish_post', args }, ctx);
  }

  @Tool({
    name: 'schedule_campaign',
    description: 'Schedule a simulated message campaign to a list of recipients.',
    inputSchema: input.schedule_campaign,
  })
  @Guardrail(MEMBER_ACCESS)
  scheduleCampaign(args: Args<'schedule_campaign'>, ctx: ExecutionContext) {
    return this.request({ tool: 'schedule_campaign', args }, ctx);
  }

  @Tool({
    name: 'boost_message',
    description: 'Change how many people an existing message reaches.',
    inputSchema: input.boost_message,
  })
  @Guardrail(MEMBER_ACCESS)
  boostMessage(args: Args<'boost_message'>, ctx: ExecutionContext) {
    return this.request({ tool: 'boost_message', args }, ctx);
  }

  @Tool({
    name: 'edit_message',
    description: 'Replace the text of an existing message. The new text is scored again.',
    inputSchema: input.edit_message,
  })
  @Guardrail(MEMBER_ACCESS)
  editMessage(args: Args<'edit_message'>, ctx: ExecutionContext) {
    return this.request({ tool: 'edit_message', args }, ctx);
  }

  @Tool({
    name: 'retract_message',
    description: 'Retract an owned message after policy evaluation.',
    inputSchema: input.retract_message,
  })
  @Guardrail(MEMBER_ACCESS)
  retractMessage(args: Args<'retract_message'>, ctx: ExecutionContext) {
    return this.request({ tool: 'retract_message', args }, ctx);
  }
}
