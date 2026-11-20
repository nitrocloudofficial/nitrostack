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
import { createHmac } from 'node:crypto';
import { startDemo, call, job } from './mcp-fixture.mjs';

test('Agent Security Control Room over HTTP MCP', async (t) => {
  const { connect, admin, adminUrl, webhookSecret } = await startDemo(t);
  const owner = await connect('research-admin');
  const agent = await connect('research-agent');
  const snapshot = () => call(owner, 'get_security_snapshot');
  const reset = () => call(owner, 'reset_demo');
  const edit = async (patch) => {
    const { revision, settings } = await snapshot();
    return call(owner, 'update_policy', { revision, settings: { ...settings, ...patch } });
  };
  const provision = (args) => call(agent, 'run_outbound_job', args);
  const deletion = { workspaceId: job.workspaceId };
  const review = (id, action) => call(owner, 'review_approval', { id, action });

  await t.test('review, change the limit, retry and enforce the team boundary', async () => {
    assert.equal((await provision(job)).decision, 'REQUIRE_APPROVAL');
    assert.equal((await snapshot()).resources.jobs.length, 0);
    await edit({ outboundMb: 8 });
    assert.equal((await provision(job)).executed, true);
    assert.equal((await snapshot()).resources.jobs.length, 1);
    assert.equal(
      (await provision({ ...job, destination: 'unapproved_external' })).decision,
      'BLOCK'
    );
    await edit({ outboundMb: 100 });
    assert.equal((await provision({ ...job, outboundMb: 101 })).decision, 'BLOCK');
  });
  await t.test('incident policy blocks new and previously pending publication', async () => {
    const publish = () =>
      call(agent, 'publish_artifact', {
        ...deletion,
        destination: 'approved_external',
        name: 'Incident report',
      });
    const pending = await publish();
    assert.equal(pending.decision, 'REQUIRE_APPROVAL');
    await edit({ externalPublishing: 'deny' });
    assert.equal((await publish()).decision, 'BLOCK');
    assert.equal((await review(pending.approvalId, 'approve')).decision, 'BLOCK');
    assert.equal((await snapshot()).resources.artifacts.length, 0);
  });
  await t.test(
    'protected workspace deletion can be rejected or approved exactly once',
    async () => {
      const remove = () => call(agent, 'delete_workspace', deletion);
      const first = await remove();
      assert.equal(first.decision, 'REQUIRE_APPROVAL');
      assert.equal((await review(first.approvalId, 'reject')).status, 'rejected');
      assert.equal((await snapshot()).resources.workspaces.length, 1);
      const second = await remove();
      assert.equal((await review(second.approvalId, 'approve')).executed, true);
      assert.equal((await review(second.approvalId, 'approve')).status, 'executed');
      assert.equal((await snapshot()).resources.workspaces.length, 0);
    }
  );
  await t.test('workspace lifecycle, strict inputs and isolated inventory', async () => {
    await reset();
    const created = await call(agent, 'execute', {
      code: "return await callTool('create_workspace', { name: 'Case notes', environment: 'development', workspaceType: 'research' });",
    });
    const workspaceId = created.resourceIds[0];
    assert.ok(workspaceId);
    assert.equal(
      (await call(agent, 'change_workspace_access', { workspaceId, access: 'team' })).executed,
      true
    );
    const exported = await call(agent, 'export_data', {
      workspaceId,
      destination: 'internal',
      outboundMb: 1,
    });
    assert.equal(exported.executed, true);
    const inventory = await call(agent, 'get_workspaces');
    assert.equal(inventory.workspaces.find((w) => w.id === workspaceId).access, 'team');
    assert.ok(
      (await call(agent, 'get_agent_activity')).history.some(
        (h) => h.attempt === exported.attempt && h.event === 'EXECUTED'
      )
    );
    const other = await connect('developers-agent');
    for (const id of [workspaceId, 'unknown']) {
      const result = await call(other, 'delete_workspace', { workspaceId: id });
      assert.equal(result.decision, 'BLOCK');
      assert.equal(result.reason, 'resource-access');
      assert.deepEqual(result.resourceIds, []);
    }
    await assert.rejects(call(agent, 'run_outbound_job', { ...job, unexpected: true }));
    await assert.rejects(
      call(agent, 'update_policy', { revision: 1, settings: (await snapshot()).settings })
    );
  });
  await t.test('runtime changes through the control plane, webhook and raw policies', async () => {
    await reset();
    const path = '/guardrails/v1/policies/research/security-mutation';
    assert.equal((await provision(job)).reason, 'outboundMb-review');

    // Change one threshold from outside MCP: the next tool call sees it.
    const current = await admin('GET', path);
    assert.equal(current.status, 200);
    assert.equal(current.headers.get('etag'), `"${current.body.head.revision}"`);
    const patched = await admin('PATCH', path + '/settings', { outboundMb: 8 });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.revision, current.body.head.revision + 1);
    const allowed = await provision(job);
    assert.equal(allowed.decision, 'ALLOW');
    assert.equal(allowed.revision, patched.body.revision);
    const view = await snapshot();
    assert.equal(view.settings.outboundMb, 8);
    assert.deepEqual([view.externalChange.source, view.externalChange.by], ['api', 'admin-key']);
    assert.ok(
      view.history.some((h) => h.event === 'UPDATED' && h.tool === 'api' && h.actor === 'admin-key')
    );

    // Optimistic concurrency, validation, boundary and the floor.
    const stale = { headers: { 'if-match': String(current.body.head.revision) } };
    assert.equal((await admin('PATCH', path + '/settings', { outboundMb: 4 }, stale)).status, 412);
    assert.equal((await admin('PATCH', path + '/settings', { outboundMb: 101 })).status, 422);
    assert.equal(
      (await admin('PATCH', path + '/settings', { destinations: ['unapproved_external'] })).status,
      422
    );
    assert.equal((await admin('PATCH', path + '/settings', { nope: 1 })).status, 422);

    // Admin access: demo admin tokens for their own team only; agents never.
    assert.equal(
      (await admin('GET', path, undefined, { token: 'demo-research-admin' })).status,
      200
    );
    assert.equal(
      (await admin('GET', path, undefined, { token: 'demo-research-agent' })).status,
      403
    );
    assert.equal(
      (
        await admin('GET', '/guardrails/v1/policies/response/security-mutation', undefined, {
          token: 'demo-research-admin',
        })
      ).status,
      403
    );
    assert.equal((await admin('GET', path, undefined, { token: 'wrong' })).status, 401);
    assert.equal(
      (await admin('GET', '/guardrails/v1/policies/nope/security-mutation')).status,
      404
    );

    // Raw policies: unknown facts are rejected; floor rules cannot be removed by a stored policy.
    const allowAll = {
      schemaVersion: 1,
      tenantId: 'research',
      id: 'security-mutation',
      version: 1,
      defaultEffect: 'deny',
      rules: [
        {
          id: 'resource-access',
          effect: 'allow',
          all: [{ field: 'owned', op: 'eq', value: false }],
        },
        { id: 'anything', effect: 'allow', all: [{ field: 'outboundMb', op: 'gte', value: 0 }] },
      ],
    };
    assert.equal(
      (await admin('POST', path + '/versions', { policy: { ...allowAll, defaultEffect: 'allow' } }))
        .status,
      422
    );
    const bad = {
      ...allowAll,
      rules: [{ id: 'x', effect: 'deny', all: [{ field: 'secret', op: 'eq', value: 1 }] }],
    };
    assert.equal((await admin('POST', path + '/versions', { policy: bad })).status, 422);
    const draft = await admin('POST', path + '/versions', {
      policy: allowAll,
      comment: 'try to lift the floor',
    });
    assert.equal(draft.status, 201);
    assert.equal(draft.body.status, 'draft');
    const preview = await admin('POST', path + '/simulate', { settings: { outboundMb: 1 } });
    assert.equal(preview.status, 200);
    const revision = (await admin('GET', path)).body.head.revision;
    const activated = await admin(
      'POST',
      path + '/activate',
      { version: draft.body.version },
      { headers: { 'if-match': String(revision) } }
    );
    assert.equal(activated.status, 200);
    assert.equal((await provision({ ...job, outboundMb: 101 })).reason, 'absolute-outboundMb');
    const response = await connect('response-agent');
    assert.equal((await call(response, 'delete_workspace', deletion)).reason, 'resource-access');

    // Rollback copies an earlier version forward.
    const back = await admin('POST', path + '/rollback', { toVersion: patched.body.activeVersion });
    assert.equal(back.status, 200);
    assert.equal(back.body.revision, revision + 2);
    assert.equal((await snapshot()).settings.outboundMb, 8);
    const versions = await admin('GET', path + '/versions?limit=3');
    assert.deepEqual(
      versions.body.versions.map((v) => v.kind),
      ['rollback', 'policy', 'update']
    );

    // Signed webhook: refresh by default, replay-protected.
    const body = JSON.stringify({ type: 'policy.changed', tenantId: 'research' });
    const sign = (secret, ts) =>
      'sha256=' +
      createHmac('sha256', secret)
        .update(ts + '.' + body)
        .digest('hex');
    const ts = String(Math.floor(Date.now() / 1000));
    const hook = (signature, timestamp = ts, delivery = 'd-1') =>
      admin('POST', '/guardrails/webhook', body, {
        headers: {
          'x-nitro-signature': signature,
          'x-nitro-timestamp': timestamp,
          'x-nitro-delivery': delivery,
        },
      });
    assert.equal((await hook(sign('wrong', ts))).status, 401);
    assert.equal((await hook(sign(webhookSecret, '1000'), '1000')).status, 401);
    assert.equal((await hook(sign(webhookSecret, ts))).status, 202);
    assert.deepEqual((await hook(sign(webhookSecret, ts))).body, { duplicate: true });
    const activate = JSON.stringify({
      type: 'policy.activate',
      tenantId: 'research',
      settings: { outboundMb: 1 },
    });
    const signedActivate =
      'sha256=' +
      createHmac('sha256', webhookSecret)
        .update(ts + '.' + activate)
        .digest('hex');
    const refused = await admin('POST', '/guardrails/webhook', activate, {
      headers: { 'x-nitro-signature': signedActivate, 'x-nitro-timestamp': ts },
    });
    assert.equal(refused.status, 403);

    const health = await fetch(adminUrl + '/healthz/guardrails').then((r) => r.json());
    assert.deepEqual([health.profile, health.store, health.push], ['demo', 'file', 'store']);
  });
});
