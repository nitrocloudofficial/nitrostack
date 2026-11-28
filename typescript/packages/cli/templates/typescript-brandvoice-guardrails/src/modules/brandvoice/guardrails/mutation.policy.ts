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

import type { Policy, Rule } from '@nitrostack/core/guardrails';
import { AUDIENCES, CHANNELS, HARD_LIMITS, VOICES } from '../domain/limits.js';
import type { Settings } from '../domain/types.js';
import { teamBoundary } from '../state/seeds.js';

export const MUTATION_POLICY_ID = 'brandvoice-mutation';

/**
 * Facts computed for every messaging action (see `collectFacts` in
 * `guarded-operation.ts`). Policies may only reference these fields. Tone facts
 * (`voice`, `slang`, `profanity`, `promise`) are measured from the text by the server.
 */
export const MUTATION_FACTS = [
  'owned',
  'channel',
  'audience',
  'voice',
  'slang',
  'profanity',
  'promise',
  'reach',
  'recipients',
  'campaign',
  'retraction',
  'authorizedReview',
];

/** A non-empty list of conditions that must all hold. */
type Conditions = Rule['all'];
type Condition = Conditions[number];

const when = (field: string, op: Condition['op'], value: Condition['value']): Condition => ({
  field,
  op,
  value,
});

const deny = (id: string, ...all: Conditions): Rule => ({ id, effect: 'deny', all });
const review = (id: string, ...all: Conditions): Rule => ({
  id,
  effect: 'require_approval',
  all: [...all, when('authorizedReview', 'eq', false)] as Conditions,
});

/**
 * Code-owned floor. Evaluated with every stored policy and cannot be removed by a policy
 * change from the dashboard, the API, a webhook or the database: tenant isolation, no
 * profanity, no binding promises, absolute reach ceilings, the organization boundary from
 * `seeds/teams.json` and review of official retractions. Deny beats every other effect, so
 * a stored `allow` cannot override it.
 */
export function floorRules(teamId: string): Rule[] {
  const boundary = teamBoundary(teamId);
  const rules: Rule[] = [
    deny('resource-access', when('owned', 'eq', false)),
    deny('no-profanity', when('profanity', 'gt', 0)),
    deny('no-binding-promises', when('promise', 'eq', true)),
    deny('absolute-reach-ceiling', when('reach', 'gt', HARD_LIMITS.totalReach)),
    deny(
      'absolute-campaign-ceiling',
      when('campaign', 'eq', true),
      when('recipients', 'gt', HARD_LIMITS.campaignRecipients)
    ),
  ];
  for (const channel of CHANNELS) {
    if (!boundary.channels.includes(channel)) rules.push(deny('channel-' + channel, when('channel', 'eq', channel)));
  }
  for (const audience of AUDIENCES) {
    if (!boundary.audiences.includes(audience)) {
      rules.push(deny('audience-' + audience, when('audience', 'eq', audience)));
    }
  }
  if (boundary.officialPosts === 'deny') {
    rules.push(
      deny('official-post-restricted', when('audience', 'eq', 'official'), when('retraction', 'eq', false))
    );
  }
  rules.push(review('official-retraction', when('retraction', 'eq', true), when('audience', 'eq', 'official')));
  return rules;
}

export const FLOOR_RULE_IDS = (teamId: string) => new Set(floorRules(teamId).map((r) => r.id));

/** Floor rules first, then the stored rules. Stored rules that reuse a floor rule ID are dropped. */
export function withFloor(policy: Policy): Policy {
  const floor = floorRules(policy.tenantId);
  const reserved = new Set(floor.map((r) => r.id));
  return { ...policy, rules: [...floor, ...policy.rules.filter((r) => !reserved.has(r.id))] };
}

/**
 * Compiles a team's settings into the stored part of its mutation policy. This is the seed
 * generator and the compiler behind the settings form, `PATCH .../settings` and
 * `npm run policy -- set`. At runtime the policy is read from the store, so a policy saved
 * directly (`POST .../versions`) may contain any rules over {@link MUTATION_FACTS}.
 *
 * Evaluation: deny beats require_approval beats allow. Review rules stop matching once an
 * administrator approves the exact request (`authorizedReview`); deny rules always apply.
 */
export function buildMutationPolicy(teamId: string, settings: Settings, version = 1): Policy {
  const rules: Rule[] = [];

  // 1. Team denials ------------------------------------------------------------
  for (const channel of CHANNELS) {
    if (!settings.channels.includes(channel)) rules.push(deny('channel-' + channel, when('channel', 'eq', channel)));
  }
  for (const voice of VOICES) {
    if (!settings.voices.includes(voice)) rules.push(deny('voice-' + voice, when('voice', 'eq', voice)));
  }
  for (const audience of AUDIENCES) {
    if (!settings.audiences.includes(audience)) {
      rules.push(deny('audience-' + audience, when('audience', 'eq', audience)));
    }
  }
  if (settings.officialPosts === 'deny') {
    rules.push(
      deny('official-post-restricted', when('audience', 'eq', 'official'), when('retraction', 'eq', false))
    );
  }

  // 2. Human review ------------------------------------------------------------
  rules.push(review('official-post', when('audience', 'eq', 'official'), when('retraction', 'eq', false)));
  if (settings.reviewRetraction) rules.push(review('message-retraction', when('retraction', 'eq', true)));
  rules.push(review('slang-review', when('slang', 'gt', settings.slang)));
  rules.push(review('reach-review', when('reach', 'gt', settings.reach), when('retraction', 'eq', false)));
  rules.push(review('campaign-size', when('campaign', 'eq', true), when('recipients', 'gt', settings.campaign)));

  // 3. Allow -------------------------------------------------------------------
  rules.push({ id: 'within-policy', effect: 'allow', all: [when('owned', 'eq', true)] });

  const reserved = FLOOR_RULE_IDS(teamId);
  return {
    schemaVersion: 1,
    tenantId: teamId,
    id: MUTATION_POLICY_ID,
    version,
    defaultEffect: 'deny',
    rules: rules.filter((r) => !reserved.has(r.id)),
  };
}
