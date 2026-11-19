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
import { startDemo, call, gpu } from './mcp-fixture.mjs';

test('CloudOps Guardian over HTTP MCP', async (t) => {
  const { connect, directory } = await startDemo(t);
  const owner = await connect('ml-admin'),
    agent = await connect('ml-agent'),
    platform = await connect('platform-admin'),
    dev = await connect('development-agent');
  const snapshot = (client = owner) => call(client, 'get_cloudops_snapshot');
  const edit = async (changes) => {
    const { revision, settings } = await snapshot();
    return call(owner, 'update_policy', { revision, settings: { ...settings, ...changes } });
  };
  const reset = () => call(owner, 'reset_demo');
  const execute = (client, name, args) =>
    call(client, 'execute', {
      code: `return await callTool(${JSON.stringify(name)}, ${JSON.stringify(args)});`,
    });
  const provision = (args) => execute(agent, 'provision_instance', args);
  const deletion = {
    resourceId: 'ml-db',
    resourceType: 'database',
    environment: 'production',
    reason: 'Retire database',
  };
  const remove = () => execute(agent, 'delete_resource', deletion);
  const review = (id, action = 'approve') => call(owner, 'review_approval', { id, action });

  await t.test('exposes the catalog and opens the widget', async () => {
    const names = (await agent.listTools()).tools.map((tool) => tool.name);
    assert.deepEqual(names.sort(), ['execute', 'get_schema', 'search', 'show_cloudops_dashboard']);
    for (const name of [
      'provision_instance',
      'deploy_application',
      'scale_infrastructure',
      'create_database',
      'modify_firewall_rules',
      'delete_resource',
      'get_resource_usage',
      'get_cloud_cost',
    ]) {
      const found = await agent.callTool({ name: 'search', arguments: { query: name } });
      assert.ok(found.content[0].text.includes(name), name);
    }
    const schema = await agent.callTool({
      name: 'get_schema', arguments: { tools: ['provision_instance'] },
    });
    assert.match(schema.content[0].text, /workload/);
    await assert.rejects(execute(agent, 'reset_demo', {}));
    const open = await owner.callTool({ name: 'show_cloudops_dashboard', arguments: {} });
    assert.equal(open.structuredContent.name, 'ML Research');
    assert.ok(open._meta['openai/outputTemplate']);
  });
  await t.test(
    'same process, exact request, live GPU quota and independent region restriction',
    async () => {
      const initial = await snapshot();
      const pending = await provision(gpu);
      assert.equal(pending.decision, 'REQUIRE_APPROVAL');
      assert.equal(pending.executed, false);
      assert.deepEqual((await snapshot()).resources, initial.resources);
      await edit({ gpu: 8 });
      const allowed = await provision(gpu);
      assert.equal(allowed.executed, true);
      assert.equal(allowed.resourceIds.length, 8);
      assert.equal(allowed.revision, pending.revision + 1);
      assert.equal((await snapshot()).resources.length, 9);
      const blocked = await provision({ ...gpu, region: 'Singapore' });
      assert.equal(blocked.decision, 'BLOCK');
      assert.equal(blocked.reason, 'region-Singapore');
      assert.equal((await snapshot()).resources.length, 9);
      const history = (await snapshot()).history;
      assert.deepEqual(
        history.filter((e) => e.attempt === allowed.attempt).map((e) => e.event),
        ['ALLOW', 'EXECUTED']
      );
      assert.equal((await snapshot(platform)).revision, 1);
    }
  );
  await t.test('spending and CPU thresholds and absolute ceilings', async () => {
    await reset();
    const db = {
      name: 'analytics',
      engine: 'postgres',
      region: 'Mumbai',
      environment: 'development',
      storage: 600,
    };
    const database = () => call(agent, 'create_database', db);
    assert.equal((await database()).reason, 'budget-review');
    await edit({ budget: 2000 });
    assert.equal((await database()).executed, true);
    assert.equal((await call(agent, 'get_cloud_cost')).remaining, 800);
    await reset();
    const cpu = { ...gpu, machine: 'general', cpu: 16, memory: 64, gpu: 0, count: 1 };
    assert.equal((await provision(cpu)).reason, 'cpu-review');
    await edit({ cpu: 16 });
    assert.equal((await provision(cpu)).executed, true);
    assert.equal((await provision({ ...cpu, cpu: 33 })).reason, 'absolute-cpu-ceiling');
    assert.equal((await provision({ ...cpu, count: 60 })).reason, 'absolute-spending-ceiling');
    assert.equal((await provision({ ...gpu, count: 17 })).reason, 'absolute-gpu-ceiling');
  });
  await t.test(
    'concurrent requests respect hard ceilings and failed execution is audited',
    async () => {
      await reset();
      await edit({ gpu: 16, budget: 5000 });
      const pair = await Promise.all([
        provision({ ...gpu, count: 10 }),
        provision({ ...gpu, count: 10 }),
      ]);
      assert.deepEqual(pair.map((r) => r.decision).sort(), ['ALLOW', 'BLOCK']);
      const args = {
        name: 'ledger',
        engine: 'postgres',
        region: 'Mumbai',
        environment: 'development',
        storage: 4,
      };
      assert.equal((await call(agent, 'create_database', args)).executed, true);
      const duplicate = await call(agent, 'create_database', args);
      assert.equal(duplicate.decision, 'ALLOW');
      assert.equal(duplicate.executed, false);
      assert.equal(duplicate.executionError, 'database-name-in-use');
      assert.deepEqual(
        (await snapshot()).history
          .filter((e) => e.attempt === duplicate.attempt)
          .map((e) => e.event),
        ['ALLOW', 'FAILED']
      );
    }
  );

  await t.test(
    'approval rejection, stale replay and at-most-once production deletion',
    async () => {
      await reset();
      const first = await remove();
      assert.equal(first.reason, 'production-deletion');
      await review(first.approvalId, 'reject');
      assert.equal((await snapshot()).resources.length, 1);
      const second = await remove();
      await edit({ cpu: 24 });
      const stale = await review(second.approvalId);
      assert.equal(stale.executed, false);
      assert.equal(stale.decision, 'REQUIRE_APPROVAL');
      const results = await Promise.all([review(stale.approvalId), review(stale.approvalId)]);
      assert.equal(results.filter((r) => r.executed).length, 1);
      assert.equal((await snapshot()).resources.length, 0);
      assert.equal(
        (await call(dev, 'delete_resource', { ...deletion, resourceId: 'development-db' }))
          .decision,
        'BLOCK'
      );
    }
  );
  await t.test('tenant isolation, admin access, stale writes and fail closed state', async () => {
    await reset();
    const { revision, settings } = await snapshot();
    await assert.rejects(call(agent, 'update_policy', { revision, settings }));
    await assert.rejects(
      call(owner, 'update_policy', { revision, settings: { ...settings, regions: ['Singapore'] } })
    );
    await edit({ budget: 600 });
    await assert.rejects(call(owner, 'update_policy', { revision, settings }));
    assert.equal((await call(platform, 'delete_resource', deletion)).reason, 'resource-access');
    const file = join(directory, 'ml.json'),
      saved = await readFile(file, 'utf8');
    await writeFile(file, '{');
    await assert.rejects(provision(gpu));
    assert.equal(await readFile(file, 'utf8'), '{');
    const invalid = JSON.parse(saved);
    invalid.revision = 0;
    await writeFile(file, JSON.stringify(invalid));
    const unavailable = await provision(gpu);
    assert.equal(unavailable.decision, 'BLOCK');
    assert.equal(unavailable.executed, false);
    assert.deepEqual((await snapshot()).resources, invalid.resources);
    await writeFile(file, saved);
    assert.equal((await snapshot()).resources.length, 1);
  });
  await t.test(
    'deployment, scaling, firewall, reads and recheck under stricter region policy',
    async () => {
      await reset();
      const { workload, ...shape } = gpu;
      const deployed = await call(platform, 'deploy_application', {
        ...shape,
        gpu: 0,
        region: 'Singapore',
        count: 1,
        application: 'api',
        release: 'v1',
      });
      assert.equal(deployed.executed, true);
      const target = {
        resourceId: deployed.resourceIds[0],
        environment: 'development',
        resourceType: 'deployment',
      };
      assert.equal(
        (await call(platform, 'scale_infrastructure', { ...target, count: 2 })).executed,
        true
      );
      assert.equal(
        (
          await call(platform, 'modify_firewall_rules', {
            resourceId: target.resourceId,
            source: '192.0.2.0/24',
            port: 443,
            protocol: 'tcp',
            action: 'allow',
          })
        ).executed,
        true
      );
      const row = (await call(platform, 'get_resource_usage', { resourceId: target.resourceId }))
        .resources[0];
      assert.equal(row.count, 2);
      assert.equal(row.firewall.length, 1);
      const pending = await call(platform, 'provision_instance', {
        ...gpu,
        region: 'Singapore',
        count: 13,
      });
      const { revision, settings } = await snapshot(platform);
      await call(platform, 'update_policy', {
        revision,
        settings: { ...settings, regions: ['Mumbai'] },
      });
      const blocked = await call(platform, 'review_approval', {
        id: pending.approvalId,
        action: 'approve',
      });
      assert.equal(blocked.decision, 'BLOCK');
      assert.equal(blocked.executed, false);
    }
  );
});
