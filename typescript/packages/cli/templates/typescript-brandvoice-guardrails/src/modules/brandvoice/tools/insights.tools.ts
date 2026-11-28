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
import { Guardrail } from '@nitrostack/core/guardrails';
import {
  HARD_LIMITS,
  loudestVoice,
  SLANG_TERMS,
  VOICE_RANGES,
  VOICE_STYLE,
} from '../domain/limits.js';
import { noInput, scoreDraftInput } from '../domain/schemas.js';
import { scoreText, totalReach } from '../domain/simulation.js';
import { MEMBER_ACCESS } from '../guardrails/access.guardrails.js';
import { toSnapshot } from '../state/snapshot.js';
import { readTeamState } from '../state/team-state.js';
import { caller } from './caller.js';

type ScoreDraft = z.infer<typeof scoreDraftInput>;

const READ_ONLY = { readOnlyHint: true };

/** Read-only views of the caller's team, including the dashboard widget. */
@Injectable()
export class InsightsTools {
  @Tool({
    name: 'get_voice_guide',
    description:
      "Read the team's current voice policy: allowed channels and voices, the slang level that needs review, and reach left. Read it again before writing, because administrators can change it at any time.",
    inputSchema: noInput,
    annotations: READ_ONLY,
  })
  @Guardrail(MEMBER_ACCESS)
  getVoiceGuide(_args: unknown, ctx: ExecutionContext) {
    return readTeamState(caller(ctx).tenantId, (state) => {
      const { settings } = state;
      return {
        revision: state.revision,
        channels: settings.channels,
        voices: settings.voices.map((voice) => ({
          voice,
          ...VOICE_STYLE[voice],
          slang: VOICE_RANGES[voice],
        })),
        scoring:
          'Slang = the number of distinct slangTerms in the text (0-10); the voice follows from the slang range. Use score_draft to check a draft.',
        slangTerms: SLANG_TERMS,
        slangWithoutReview: settings.slang,
        loudestVoiceWithoutReview: loudestVoice(settings.slang, settings.voices),
        reachRemaining: Math.max(0, settings.reach - totalReach(state.resources)),
        campaignWithoutReview: settings.campaign,
        officialPosts: settings.officialPosts,
        neverAllowed: ['profanity', 'refund, compensation or legal promises'],
        hardLimits: HARD_LIMITS,
      };
    });
  }

  @Tool({
    name: 'score_draft',
    description:
      'Score a draft before sending it: the voice, slang (0-10), profanity and binding promises the guardrail will measure.',
    inputSchema: scoreDraftInput,
    annotations: READ_ONLY,
  })
  @Guardrail(MEMBER_ACCESS)
  scoreDraft(args: ScoreDraft, ctx: ExecutionContext) {
    return readTeamState(caller(ctx).tenantId, (state) => {
      const score = scoreText(args.text);
      const { settings } = state;
      // A hint only: the stored policy decides when the message is actually sent.
      const hint =
        score.profanity > 0 || score.promise || !settings.voices.includes(score.voice)
          ? 'blocked'
          : score.slang > settings.slang
            ? 'needs review'
            : 'within policy';
      return { ...score, hint };
    });
  }

  @Tool({
    name: 'show_brandvoice_dashboard',
    description: 'Open the Brand Voice Guardian simulator dashboard.',
    inputSchema: noInput,
    annotations: READ_ONLY,
  })
  @Widget({ route: 'brandvoice-dashboard', prefersBorder: true })
  @Guardrail(MEMBER_ACCESS)
  showDashboard(_args: unknown, ctx: ExecutionContext) {
    return this.getSnapshot(_args, ctx);
  }

  @Tool({
    name: 'get_brandvoice_snapshot',
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
