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

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertValidPolicy } from '@nitrostack/core/guardrails';
import { operationInputs as inputs, settingsSchema } from '../domain/schemas.js';
import { scoreText, simulate, totalReach } from '../domain/simulation.js';
import {
  buildMutationPolicy,
  floorRules,
  MUTATION_FACTS as fields,
  withFloor,
} from '../guardrails/mutation.policy.js';
import { policyImpact } from '../guardrails/policy-impact.js';
import { assertWithinBoundary, compileTeamPolicy } from '../guardrails/policy-settings.js';
import { seedTeamState as seed, type TeamState } from '../state/team-state.js';

/** Effective policy: code-owned floor + rules compiled from the team's settings. */
const mutationPolicy = (team: string, state: TeamState) =>
  withFloor(buildMutationPolicy(team, state.settings));

/** The hero reply used by the walkthrough and the MCP tests. */
const STREET = 'Yo fam, your sneakers are fire and the drip is legit, no cap. Real talk, they ship Friday. Bet!';

test('fixtures compile to valid tenant-scoped policies', () => {
  for (const team of ['support', 'marketing', 'social']) {
    const state = seed(team);
    assertValidPolicy(mutationPolicy(team, state), team, 'brandvoice-mutation', fields);
    assert.equal(settingsSchema.safeParse({ ...state.settings, slang: 11 }).success, false);
    assert.equal(settingsSchema.safeParse({ ...state.settings, campaign: 50_001 }).success, false);
  }
});

test('the scorer measures the text, not what the agent claims about it', () => {
  assert.deepEqual(scoreText(STREET), {
    voice: 'street',
    slang: 8,
    profanity: 0,
    promise: false,
    terms: ['legit', 'yo', 'fam', 'fire', 'no cap', 'drip', 'bet', 'real talk'],
  });
  const formal = scoreText('Thank you for your order. It will ship on Friday.');
  assert.equal(formal.voice, 'professional');
  assert.equal(formal.slang, 0);
  assert.equal(scoreText('Hey, awesome choice! Total vibes.').voice, 'playful');
  // Whole words only: "hello" and "Friday" are not "hell" and "fr".
  assert.equal(scoreText('Hello! See you Friday, Cassandra.').profanity, 0);
  assert.equal(scoreText('Hello! See you Friday.').slang, 0);
  assert.equal(scoreText('What the hell, fam').profanity, 1);
  assert.equal(scoreText('We promise a full refund, fam.').promise, true);
  assert.equal(scoreText('Y’all ain’t ready').slang, 2, 'curly apostrophes are normalized');
});

test('simulation projects reach without mutating the current snapshot', () => {
  const initial = seed('social').resources;
  const command = {
    tool: 'publish_post' as const,
    args: inputs.publish_post.parse({
      channel: 'social',
      audience: 'public',
      title: 'Drop day',
      followers: 60_000,
      text: STREET,
    }),
  };
  const planned = simulate(initial, command, () => 'msg-2');
  assert.equal(totalReach(planned.rows), 70_000);
  assert.equal(totalReach(initial), 10_000);
  assert.deepEqual(planned.affected, ['msg-2']);
  assert.equal(planned.rows[1]!.voice, 'street');

  const edit = simulate(
    initial,
    { tool: 'edit_message', args: { messageId: 'social-statement', text: STREET } },
    () => 'unused'
  );
  assert.equal(edit.rows[0]!.slang, 8);
  assert.equal(edit.rows[0]!.previous.length, 1);
  assert.equal(initial[0]!.slang, 0);
  assert.throws(
    () =>
      simulate(
        initial,
        {
          tool: 'retract_message',
          args: { messageId: 'social-statement', messageType: 'reply', audience: 'official', reason: 'x' },
        },
        () => 'unused'
      ),
    /Message unavailable/
  );
  assert.equal(inputs.send_reply.safeParse({ channel: 'chat', customer: 'a', text: 'b', voice: 'professional' }).success, false);
});

test('team restrictions come from settings, not team IDs', () => {
  const ids = (team: string, state = seed(team)) => mutationPolicy(team, state).rules.map((r) => r.id);
  const marketing = seed('marketing');
  const support = seed('support');
  assert.ok(ids('support').includes('official-post-restricted'));
  assert.ok(ids('support').includes('voice-street'));
  assert.ok(ids('marketing').includes('voice-street'));
  assert.ok(!ids('social').some((id) => id.startsWith('voice-')));
  assert.ok(
    ids('marketing', { ...marketing, settings: { ...marketing.settings, officialPosts: 'deny' } }).includes(
      'official-post-restricted'
    )
  );
  assert.ok(!ids('marketing').includes('official-post-restricted'));
  // The organization boundary lives in the floor, so support cannot lift it through settings.
  assert.ok(floorRules('support').some((r) => r.id === 'official-post-restricted'));
  assert.ok(
    !buildMutationPolicy('support', { ...support.settings, officialPosts: 'review' }).rules.some(
      (r) => r.id === 'official-post-restricted'
    )
  );
  assert.ok(ids('social').includes('channel-press'));
  assert.ok(!ids('marketing').some((id) => id.startsWith('channel-')));
  // Profanity, promises and official retractions are floor rules for every team.
  for (const team of ['support', 'marketing', 'social']) {
    for (const id of ['no-profanity', 'no-binding-promises', 'official-retraction']) {
      assert.ok(floorRules(team).some((r) => r.id === id), team + ' ' + id);
    }
  }
});

test('administrators can tighten settings inside the team boundary but never widen it', () => {
  const settingsOf = (team: string) => seed(team).settings;
  const social = settingsOf('social');
  const support = settingsOf('support');
  const marketing = settingsOf('marketing');
  assert.throws(
    () => assertWithinBoundary('social', { ...social, channels: ['chat', 'social', 'press'] }),
    /Channel outside team boundary/
  );
  assert.throws(
    () => assertWithinBoundary('support', { ...support, officialPosts: 'review' }),
    /Official posts outside team boundary/
  );
  assert.doesNotThrow(() =>
    assertWithinBoundary('marketing', {
      ...marketing,
      channels: ['email'],
      audiences: ['direct'],
      officialPosts: 'deny',
    })
  );
  // Voices are a team setting, not a boundary: social may enable or drop any voice.
  assert.doesNotThrow(() => assertWithinBoundary('support', { ...support, voices: ['street'] }));
});

test('impact preview reports only requests whose outcome changes', () => {
  const state = seed('social');
  const facts = {
    owned: true,
    channel: 'chat',
    audience: 'direct',
    profanity: 0,
    promise: false,
    reach: 10_001,
    recipients: 1,
    campaign: false,
    retraction: false,
  };
  const request = (attempt: string, slang: number, voice: string) => ({
    attempt,
    time: '2026-01-01T00:00:00.000Z',
    actor: 'social-agent',
    tool: 'send_reply',
    facts: { ...facts, slang, voice },
  });
  const decisions = [request('calm', 1, 'friendly'), request('street', 8, 'street')];
  const current = mutationPolicy('social', state);
  const draft = (settings: Partial<typeof state.settings>) =>
    compileTeamPolicy('social', { ...state.settings, ...settings });

  const raised = policyImpact(current, draft({ slang: 8 }), decisions, 1);
  assert.equal(raised.sampled, 2);
  assert.deepEqual(raised.summary, { 'REQUIRE_APPROVAL→ALLOW': 1 });
  assert.deepEqual(raised.changed.map((c) => [c.attempt, c.current.reason, c.draft.reason]), [
    ['street', 'slang-review', 'within-policy'],
  ]);
  assert.equal(raised.pendingApprovals, 1);

  // A deny rule wins over review, and the newest change is listed first.
  const restricted = policyImpact(current, draft({ channels: ['social'] }), decisions, 0);
  assert.deepEqual(restricted.summary, { 'ALLOW→BLOCK': 1, 'REQUIRE_APPROVAL→BLOCK': 1 });
  assert.deepEqual(
    restricted.changed.map((c) => [c.attempt, c.draft.reason]),
    [
      ['street', 'channel-chat'],
      ['calm', 'channel-chat'],
    ]
  );
  assert.equal(policyImpact(current, current, decisions, 0).changed.length, 0);
});
