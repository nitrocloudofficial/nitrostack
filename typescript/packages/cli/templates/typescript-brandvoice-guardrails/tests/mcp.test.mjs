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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHmac } from 'node:crypto';
import { startDemo, call, street } from './mcp-fixture.mjs';

test('Brand Voice Guardian over HTTP MCP', async (t) => {
  const { connect, directory, admin, adminUrl, webhookSecret } = await startDemo(t);
  const owner = await connect('social-admin'),
    agent = await connect('social-agent'),
    marketing = await connect('marketing-admin'),
    support = await connect('support-agent');
  const snapshot = (client = owner) => call(client, 'get_brandvoice_snapshot');
  const edit = async (changes) => {
    const { revision, settings } = await snapshot();
    return call(owner, 'update_policy', { revision, settings: { ...settings, ...changes } });
  };
  const reset = () => call(owner, 'reset_demo');
  const execute = (client, name, args) =>
    call(client, 'execute', {
      code: `return await callTool(${JSON.stringify(name)}, ${JSON.stringify(args)});`,
    });
  const reply = (args) => execute(agent, 'send_reply', args);
  const guide = (client = agent) => call(client, 'get_voice_guide');
  const post = {
    channel: 'social',
    audience: 'public',
    title: 'Drop day',
    followers: 60_000,
    text: 'New colors drop Friday.',
  };
  const retraction = {
    messageId: 'social-statement',
    messageType: 'post',
    audience: 'official',
    reason: 'Dates changed',
  };
  const retract = () => execute(agent, 'retract_message', retraction);
  const review = (id, action = 'approve') => call(owner, 'review_approval', { id, action });

  await t.test('exposes the catalog and opens the widget', async () => {
    const names = (await agent.listTools()).tools.map((tool) => tool.name);
    assert.deepEqual(names.sort(), ['execute', 'get_schema', 'search', 'show_brandvoice_dashboard']);
    for (const name of [
      'send_reply',
      'publish_post',
      'schedule_campaign',
      'boost_message',
      'edit_message',
      'retract_message',
      'get_voice_guide',
      'score_draft',
    ]) {
      const found = await agent.callTool({ name: 'search', arguments: { query: name } });
      assert.ok(found.content[0].text.includes(name), name);
    }
    const schema = await agent.callTool({
      name: 'get_schema', arguments: { tools: ['send_reply'] },
    });
    assert.match(schema.content[0].text, /customer/);
    await assert.rejects(execute(agent, 'reset_demo', {}));
    const open = await owner.callTool({ name: 'show_brandvoice_dashboard', arguments: {} });
    assert.equal(open.structuredContent.name, 'Gen-Z Social');
    assert.ok(open._meta['openai/outputTemplate']);
  });
  await t.test(
    'same process, exact reply, live slang limit and independent channel restriction',
    async () => {
      const initial = await snapshot();
      const draft = await call(agent, 'score_draft', { text: street.text });
      assert.deepEqual([draft.voice, draft.slang, draft.hint], ['street', 8, 'needs review']);
      assert.equal((await guide()).loudestVoiceWithoutReview, 'playful');
      const pending = await reply(street);
      assert.equal(pending.decision, 'REQUIRE_APPROVAL');
      assert.equal(pending.reason, 'slang-review');
      assert.equal(pending.executed, false);
      assert.deepEqual((await snapshot()).resources, initial.resources);
      await edit({ slang: 8 });
      // The agent reads the new guide mid-conversation and may now answer in the street voice.
      const loud = await guide();
      assert.equal(loud.loudestVoiceWithoutReview, 'street');
      // The guide tells the agent how much slang street takes, so it can actually write it.
      assert.deepEqual(loud.voices.find((v) => v.voice === 'street').slang, { min: 6, max: 10 });
      assert.ok(loud.slangTerms.includes('no cap'));
      const allowed = await reply(street);
      assert.equal(allowed.executed, true);
      assert.deepEqual([allowed.voice, allowed.slang], ['street', 8]);
      assert.equal(allowed.resourceIds.length, 1);
      assert.equal(allowed.revision, pending.revision + 1);
      assert.equal((await snapshot()).resources.length, 2);
      const blocked = await reply({ ...street, channel: 'press' });
      assert.equal(blocked.decision, 'BLOCK');
      assert.equal(blocked.reason, 'channel-press');
      assert.equal((await snapshot()).resources.length, 2);
      const history = (await snapshot()).history;
      assert.deepEqual(
        history.filter((e) => e.attempt === allowed.attempt).map((e) => e.event),
        ['ALLOW', 'EXECUTED']
      );
      assert.equal((await snapshot(marketing)).revision, 1);
    }
  );
  await t.test('reach and campaign thresholds, and the code-owned floor', async () => {
    await reset();
    const publish = (args = post) => call(agent, 'publish_post', args);
    assert.equal((await publish()).reason, 'reach-review');
    await edit({ reach: 100_000 });
    assert.equal((await publish()).executed, true);
    assert.equal((await guide()).reachRemaining, 30_000);
    await reset();
    const campaign = {
      name: 'Winter drop',
      channel: 'social',
      audience: 'public',
      recipients: 5_000,
      text: 'New colors drop Friday.',
    };
    const schedule = (args = campaign) => call(agent, 'schedule_campaign', args);
    assert.equal((await schedule()).reason, 'campaign-size');
    await edit({ campaign: 5_000 });
    assert.equal((await schedule()).executed, true);
    // No setting lifts the floor: hard ceilings, profanity and binding promises.
    await edit({ slang: 10, reach: 1_000_000, campaign: 50_000 });
    assert.equal(
      (await schedule({ ...campaign, name: 'Huge', recipients: 50_001 })).reason,
      'absolute-campaign-ceiling'
    );
    assert.equal((await publish({ ...post, followers: 1_000_000 })).reason, 'absolute-reach-ceiling');
    assert.equal((await reply({ ...street, text: 'What the hell, fam' })).reason, 'no-profanity');
    assert.equal(
      (await reply({ ...street, text: 'No worries, we promise a full refund.' })).reason,
      'no-binding-promises'
    );
  });
  await t.test(
    'concurrent requests respect hard ceilings and failed execution is audited',
    async () => {
      await reset();
      await edit({ reach: 1_000_000 });
      const pair = await Promise.all([
        call(agent, 'publish_post', { ...post, followers: 600_000 }),
        call(agent, 'publish_post', { ...post, followers: 600_000 }),
      ]);
      assert.deepEqual(pair.map((r) => r.decision).sort(), ['ALLOW', 'BLOCK']);
      const args = {
        name: 'Newsletter',
        channel: 'social',
        audience: 'public',
        recipients: 100,
        text: 'Thanks for following us.',
      };
      assert.equal((await call(agent, 'schedule_campaign', args)).executed, true);
      const duplicate = await call(agent, 'schedule_campaign', args);
      assert.equal(duplicate.decision, 'ALLOW');
      assert.equal(duplicate.executed, false);
      assert.equal(duplicate.executionError, 'campaign-name-in-use');
      assert.deepEqual(
        (await snapshot()).history
          .filter((e) => e.attempt === duplicate.attempt)
          .map((e) => e.event),
        ['ALLOW', 'FAILED']
      );
    }
  );

  await t.test(
    'approval rejection, stale replay and at-most-once official retraction',
    async () => {
      await reset();
      const first = await retract();
      assert.equal(first.reason, 'official-retraction');
      await review(first.approvalId, 'reject');
      assert.equal((await snapshot()).resources.length, 1);
      const second = await retract();
      await edit({ slang: 5 });
      const stale = await review(second.approvalId);
      assert.equal(stale.executed, false);
      assert.equal(stale.decision, 'REQUIRE_APPROVAL');
      const results = await Promise.all([review(stale.approvalId), review(stale.approvalId)]);
      assert.equal(results.filter((r) => r.executed).length, 1);
      assert.equal((await snapshot()).resources.length, 0);
      const official = {
        channel: 'email',
        audience: 'official',
        title: 'Notice',
        followers: 100,
        text: 'Our office is closed on Monday.',
      };
      assert.equal((await call(support, 'publish_post', official)).reason, 'official-post-restricted');
    }
  );
  await t.test('tenant isolation, admin access, stale writes and fail closed state', async () => {
    await reset();
    const { revision, settings } = await snapshot();
    await assert.rejects(call(agent, 'update_policy', { revision, settings }));
    await assert.rejects(
      call(owner, 'update_policy', { revision, settings: { ...settings, channels: ['press'] } })
    );
    await edit({ reach: 60_000 });
    await assert.rejects(call(owner, 'update_policy', { revision, settings }));
    assert.equal((await call(marketing, 'retract_message', retraction)).reason, 'resource-access');
    const file = join(directory, 'social.json'),
      saved = await readFile(file, 'utf8');
    await writeFile(file, '{');
    await assert.rejects(reply(street));
    assert.equal(await readFile(file, 'utf8'), '{');
    await writeFile(file, saved);
    assert.equal((await snapshot()).resources.length, 1);
  });
  await t.test(
    'boost, edit, re-scoring and recheck under a stricter audience policy',
    async () => {
      await reset();
      const published = await call(marketing, 'publish_post', {
        ...post,
        followers: 1_000,
        text: 'Our winter range is here.',
      });
      assert.equal(published.executed, true);
      const target = { messageId: published.resourceIds[0], messageType: 'post', audience: 'public' };
      assert.equal(
        (await call(marketing, 'boost_message', { ...target, reach: 5_000 })).executed,
        true
      );
      const edited = await call(marketing, 'edit_message', {
        messageId: target.messageId,
        text: 'Hey, our winter range is here and it is awesome.',
      });
      assert.deepEqual([edited.executed, edited.voice, edited.slang], [true, 'friendly', 2]);
      // Marketing allows slang 3, so an edit to street slang is held like a new message.
      const louder = await call(marketing, 'edit_message', {
        messageId: target.messageId,
        text: street.text,
      });
      assert.equal(louder.reason, 'voice-street');
      const row = (await snapshot(marketing)).resources.find((r) => r.id === target.messageId);
      assert.deepEqual([row.reach, row.slang, row.previous.length], [5_000, 2, 1]);
      const pending = await call(marketing, 'publish_post', {
        ...post,
        audience: 'official',
        title: 'Store hours',
        followers: 2_000,
        text: 'Our stores open at 9 on Saturday.',
      });
      assert.equal(pending.reason, 'official-post');
      const { revision, settings } = await snapshot(marketing);
      await call(marketing, 'update_policy', {
        revision,
        settings: { ...settings, audiences: ['direct', 'public'] },
      });
      const blocked = await call(marketing, 'review_approval', {
        id: pending.approvalId,
        action: 'approve',
      });
      assert.equal(blocked.decision, 'BLOCK');
      assert.equal(blocked.reason, 'audience-official');
      assert.equal(blocked.executed, false);
    }
  );
  await t.test(
    'other teams’ IDs are indistinguishable from unknown IDs, and strict inputs',
    async () => {
      await reset();
      // Strip per-attempt identifiers so only the observable outcome is compared.
      const outcome = ({ attempt: _a, revision: _r, ...rest }) => rest;
      const existing = (messageId) => ({ messageId, messageType: 'post', audience: 'official' });
      const probe = async (messageId) => ({
        boost: outcome(await call(agent, 'boost_message', { ...existing(messageId), reach: 2 })),
        edit: outcome(await call(agent, 'edit_message', { messageId, text: 'Hello.' })),
        retract: outcome(
          await call(agent, 'retract_message', { ...existing(messageId), reason: 'probe' })
        ),
      });
      const foreign = await probe('marketing-statement');
      assert.deepEqual(foreign, await probe('missing-statement'));
      assert.equal(foreign.retract.reason, 'resource-access');

      // A pending approval in another team reads exactly like an unknown approval ID.
      const pending = await call(marketing, 'schedule_campaign', {
        name: 'Spring launch',
        channel: 'email',
        audience: 'public',
        recipients: 25_000,
        text: 'Our spring range arrives in March.',
      });
      assert.equal(pending.reason, 'campaign-size');
      const reviewError = async (id) => {
        const result = await owner.callTool({
          name: 'review_approval',
          arguments: { id, action: 'approve' },
        });
        assert.equal(result.isError, true);
        return result.content[0].text;
      };
      assert.equal(
        await reviewError(pending.approvalId),
        await reviewError('00000000-0000-4000-8000-000000000000')
      );

      // Unknown or misspelled arguments are rejected rather than silently dropped. There is
      // no `voice` argument at all: the server measures the voice from the text.
      await assert.rejects(call(agent, 'get_voice_guide', { team: 'marketing' }));
      await assert.rejects(call(agent, 'send_reply', { ...street, voice: 'professional' }));
      await assert.rejects(execute(agent, 'score_draft', { draft: street.text }));

      // A credential outside the fixture set gets no data from any guarded tool.
      const stranger = await connect('unknown-team-agent');
      const denied = await stranger.callTool({ name: 'show_brandvoice_dashboard', arguments: {} });
      assert.equal(denied.isError, true);
      assert.equal(denied.structuredContent, undefined);
    }
  );
  await t.test('team boundaries, impact preview and policy rollback', async () => {
    await reset();
    const supportAdmin = await connect('support-admin');

    // Settings replace team-specific code, inside the boundary set in seeds/teams.json.
    assert.equal((await call(support, 'send_reply', street)).reason, 'voice-street');
    assert.equal((await reply({ ...street, channel: 'press' })).reason, 'channel-press');
    const supportPolicy = await snapshot(supportAdmin);
    await assert.rejects(
      call(supportAdmin, 'update_policy', {
        revision: supportPolicy.revision,
        settings: { ...supportPolicy.settings, officialPosts: 'review' },
      }),
      /Official posts outside team boundary/
    );
    const before = await snapshot();
    const loosened = { ...before.settings, channels: ['chat', 'social', 'press'] };
    await assert.rejects(
      call(owner, 'update_policy', { revision: before.revision, settings: loosened }),
      /Channel outside team boundary/
    );
    await assert.rejects(
      call(owner, 'simulate_policy', { settings: loosened }),
      /Channel outside team boundary/
    );

    // Preview is read-only and only lists requests whose outcome would change.
    const pending = await reply(street);
    assert.equal(pending.reason, 'slang-review');
    assert.equal(
      (await reply({ ...street, text: 'Thanks Jordan, your order ships on Friday.' })).decision,
      'ALLOW'
    );
    const recorded = await snapshot();
    await assert.rejects(call(agent, 'simulate_policy', { settings: recorded.settings }));
    const impact = await call(owner, 'simulate_policy', {
      settings: { ...recorded.settings, slang: 8 },
    });
    assert.equal(impact.sampled, 3);
    assert.deepEqual(impact.summary, { 'REQUIRE_APPROVAL→ALLOW': 1 });
    assert.equal(impact.changed[0].attempt, pending.attempt);
    assert.equal(impact.pendingApprovals, 1);
    const unchanged = await snapshot();
    assert.equal(unchanged.revision, recorded.revision);
    assert.deepEqual(unchanged.history, recorded.history);
    assert.equal(unchanged.decisions, undefined);

    // Rollback restores earlier settings as a new revision.
    await edit({ slang: 8 });
    const saved = await snapshot();
    // Versions are immutable and kept across resets; the last two are the reset and the edit.
    assert.deepEqual(
      saved.versions.slice(-2).map((v) => [v.revision, v.kind]),
      [
        [recorded.revision, 'reset'],
        [saved.revision, 'update'],
      ]
    );
    const rollback = (client, revision, target) =>
      call(client, 'rollback_policy', { revision, target });
    await assert.rejects(rollback(agent, saved.revision, recorded.revision));
    await assert.rejects(rollback(owner, recorded.revision, recorded.revision), /Policy changed/);
    await assert.rejects(rollback(owner, saved.revision, saved.revision), /Unknown policy revision/);
    await assert.rejects(rollback(owner, saved.revision, 999), /Unknown policy revision/);
    const restored = await rollback(owner, saved.revision, recorded.revision);
    assert.equal(restored.revision, saved.revision + 1);
    const after = await snapshot();
    assert.deepEqual(after.settings, recorded.settings);
    assert.equal(after.versions.at(-1).kind, 'rollback');
    assert.equal(after.versions.at(-1).restoredFrom, recorded.revision);
    assert.equal(after.history.at(-1).event, 'ROLLBACK');
    assert.equal((await reply(street)).reason, 'slang-review');
    assert.equal((await review(pending.approvalId)).executed, false);
  });

  await t.test('runtime changes through the control plane, webhook and raw policies', async () => {
    await reset();
    const path = '/guardrails/v1/policies/social/brandvoice-mutation';
    assert.equal((await reply(street)).reason, 'slang-review');

    // Change one threshold from outside MCP: the next tool call sees it.
    const current = await admin('GET', path);
    assert.equal(current.status, 200);
    assert.equal(current.headers.get('etag'), `"${current.body.head.revision}"`);
    const patched = await admin('PATCH', path + '/settings', { slang: 8 });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.revision, current.body.head.revision + 1);
    const allowed = await reply(street);
    assert.equal(allowed.decision, 'ALLOW');
    assert.equal(allowed.revision, patched.body.revision);
    const view = await snapshot();
    assert.equal(view.settings.slang, 8);
    assert.deepEqual([view.externalChange.source, view.externalChange.by], ['api', 'admin-key']);
    assert.ok(view.history.some((h) => h.event === 'UPDATED' && h.tool === 'api' && h.actor === 'admin-key'));

    // Optimistic concurrency, validation, boundary and the floor.
    const stale = { headers: { 'if-match': String(current.body.head.revision) } };
    assert.equal((await admin('PATCH', path + '/settings', { slang: 4 }, stale)).status, 412);
    assert.equal((await admin('PATCH', path + '/settings', { slang: 99 })).status, 422);
    assert.equal((await admin('PATCH', path + '/settings', { channels: ['press'] })).status, 422);
    assert.equal((await admin('PATCH', path + '/settings', { nope: 1 })).status, 422);

    // Admin access: demo admin tokens for their own team only; agents never.
    assert.equal((await admin('GET', path, undefined, { token: 'demo-social-admin' })).status, 200);
    assert.equal((await admin('GET', path, undefined, { token: 'demo-social-agent' })).status, 403);
    assert.equal((await admin('GET', '/guardrails/v1/policies/marketing/brandvoice-mutation', undefined, { token: 'demo-social-admin' })).status, 403);
    assert.equal((await admin('GET', path, undefined, { token: 'wrong' })).status, 401);
    assert.equal((await admin('GET', '/guardrails/v1/policies/nope/brandvoice-mutation')).status, 404);

    // Raw policies: unknown facts are rejected; floor rules cannot be removed by a stored policy.
    const allowAll = { schemaVersion: 1, tenantId: 'social', id: 'brandvoice-mutation', version: 1, defaultEffect: 'deny',
      rules: [
        { id: 'no-profanity', effect: 'allow', all: [{ field: 'profanity', op: 'gte', value: 0 }] },
        { id: 'anything', effect: 'allow', all: [{ field: 'slang', op: 'gte', value: 0 }] },
      ] };
    assert.equal((await admin('POST', path + '/versions', { policy: { ...allowAll, defaultEffect: 'allow' } })).status, 422);
    const bad = { ...allowAll, rules: [{ id: 'x', effect: 'deny', all: [{ field: 'secret', op: 'eq', value: 1 }] }] };
    assert.equal((await admin('POST', path + '/versions', { policy: bad })).status, 422);
    const draft = await admin('POST', path + '/versions', { policy: allowAll, comment: 'try to lift the floor' });
    assert.equal(draft.status, 201);
    assert.equal(draft.body.status, 'draft');
    const preview = await admin('POST', path + '/simulate', { settings: { slang: 1 } });
    assert.equal(preview.status, 200);
    const revision = (await admin('GET', path)).body.head.revision;
    const activated = await admin('POST', path + '/activate', { version: draft.body.version }, { headers: { 'if-match': String(revision) } });
    assert.equal(activated.status, 200);
    assert.equal((await reply({ ...street, text: 'What the hell, fam' })).reason, 'no-profanity');
    const outsider = await connect('marketing-agent');
    assert.equal((await call(outsider, 'retract_message', retraction)).reason, 'resource-access');

    // Rollback copies an earlier version forward.
    const back = await admin('POST', path + '/rollback', { toVersion: patched.body.activeVersion });
    assert.equal(back.status, 200);
    assert.equal(back.body.revision, revision + 2);
    assert.equal((await snapshot()).settings.slang, 8);
    const versions = await admin('GET', path + '/versions?limit=3');
    assert.deepEqual(versions.body.versions.map((v) => v.kind), ['rollback', 'policy', 'update']);

    // Signed webhook: refresh by default, replay-protected.
    const body = JSON.stringify({ type: 'policy.changed', tenantId: 'social' });
    const sign = (secret, ts) => 'sha256=' + createHmac('sha256', secret).update(ts + '.' + body).digest('hex');
    const ts = String(Math.floor(Date.now() / 1000));
    const hook = (signature, timestamp = ts, delivery = 'd-1') =>
      admin('POST', '/guardrails/webhook', body, { headers: { 'x-nitro-signature': signature, 'x-nitro-timestamp': timestamp, 'x-nitro-delivery': delivery } });
    assert.equal((await hook(sign('wrong', ts))).status, 401);
    assert.equal((await hook(sign(webhookSecret, '1000'), '1000')).status, 401);
    assert.equal((await hook(sign(webhookSecret, ts))).status, 202);
    assert.deepEqual((await hook(sign(webhookSecret, ts))).body, { duplicate: true });
    const activate = JSON.stringify({ type: 'policy.activate', tenantId: 'social', settings: { slang: 1 } });
    const signedActivate = 'sha256=' + createHmac('sha256', webhookSecret).update(ts + '.' + activate).digest('hex');
    const refused = await admin('POST', '/guardrails/webhook', activate, { headers: { 'x-nitro-signature': signedActivate, 'x-nitro-timestamp': ts } });
    assert.equal(refused.status, 403);

    const health = await fetch(adminUrl + '/healthz/guardrails').then((r) => r.json());
    assert.deepEqual([health.profile, health.store, health.push], ['demo', 'file', 'store']);
  });
});
