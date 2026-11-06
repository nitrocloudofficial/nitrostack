import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiKeyModule, buildResource, buildTool, clearCache, DIContainer, ExecutionContext, extractResources,
  extractTools, getCacheMetadata, getGuardsMetadataFromDecorator, getInterceptorMetadata,
  getModuleMetadata,
} from '@nitrostack/core';
import { BouncerTools } from '../src/modules/bouncer/bouncer.tools.js';
import { BouncerResources } from '../src/modules/bouncer/bouncer.resources.js';
import { BouncerService } from '../src/modules/bouncer/bouncer.service.js';
import { ReleaseDiffService } from '../src/modules/bouncer/release-diff.service.js';
import { IncidentsService } from '../src/modules/incidents/incidents.service.js';
import { BouncerApiKeyGuard } from '../src/modules/observability/api-key.guard.js';
import { MetricsInterceptor } from '../src/modules/observability/metrics.interceptor.js';
import { MetricsService } from '../src/modules/observability/metrics.service.js';
import { ObservabilityModule } from '../src/modules/observability/observability.module.js';
import { AppModule } from '../src/app.module.js';

const context: ExecutionContext = {
  requestId: 'test', toolName: 'bouncer_replay_incident',
  logger: { info() {}, debug() {}, warn() {}, error() {} },
};

test('all bouncer tools have the auth guard and class-level metrics, and only replay is cached', () => {
  const definitions = extractTools(BouncerTools);
  assert.equal(definitions.length, 7);
  for (const { methodName } of definitions) {
    assert.deepEqual(getGuardsMetadataFromDecorator(BouncerTools.prototype, methodName), [BouncerApiKeyGuard]);
    assert.deepEqual(getInterceptorMetadata(BouncerTools.prototype, methodName), [MetricsInterceptor]);
    const cache = getCacheMetadata(BouncerTools.prototype, methodName);
    if (methodName === 'replayIncident') {
      assert.equal(cache?.ttl, 3600);
      assert.notEqual(cache?.key?.({ incident: 'axios' }, {}), cache?.key?.({ incident: 'chalk' }, {}));
    } else assert.equal(cache, undefined);
  }
  assert.ok(getModuleMetadata(AppModule)?.imports?.includes(ObservabilityModule));
  assert.deepEqual(getModuleMetadata(ObservabilityModule)?.exports, [MetricsService, MetricsInterceptor]);
});

test('SDK tool pipeline shares DI metrics, counts replay cache hits, and guards cached results', async t => {
  await clearCache();
  t.after(() => clearCache());
  const container = DIContainer.getInstance();
  const previousConfig = ApiKeyModule.getConfig();
  const metrics = container.resolve(MetricsService);
  container.resolve(MetricsInterceptor);
  const before = metrics.snapshot();
  const previousGuard = container.resolve(BouncerApiKeyGuard);
  const previousEnv = process.env.DEP_BOUNCER_API_KEYS;
  process.env.DEP_BOUNCER_API_KEYS = 'pipeline-secret';
  t.after(() => {
    if (previousEnv === undefined) delete process.env.DEP_BOUNCER_API_KEYS;
    else process.env.DEP_BOUNCER_API_KEYS = previousEnv;
  });
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  let replays = 0;
  const bouncer = { replay: async (incident: string) => {
    replays++;
    return { verdict: 'BLOCK', incident };
  } } as unknown as BouncerService;
  const tools = new BouncerTools(bouncer, {} as ReleaseDiffService);
  container.registerValue(BouncerApiKeyGuard, new BouncerApiKeyGuard());
  t.after(() => {
    container.registerValue(BouncerApiKeyGuard, previousGuard);
    ApiKeyModule.forRoot(previousConfig);
  });
  const definition = extractTools(BouncerTools).find(tool => tool.methodName === 'replayIncident')!;
  const tool = buildTool(tools, definition.methodName, definition.options);
  const authenticated = { ...context, metadata: { apiKey: 'pipeline-secret' } };
  const first = await tool.execute({ incident: 'axios' }, authenticated);
  assert.equal(await tool.execute({ incident: 'axios' }, authenticated), first);
  assert.equal(replays, 1);
  await assert.rejects(tool.execute({ incident: 'axios' }, context), /API key required/);
  assert.equal(replays, 1);
  await tool.execute({ incident: 'chalk' }, authenticated);
  assert.equal(replays, 2);
  now += 3_600_001;
  await tool.execute({ incident: 'axios' }, authenticated);
  assert.equal(replays, 3);
  assert.equal(metrics.snapshot().tools.bouncer_replay_incident.calls, before.tools.bouncer_replay_incident.calls + 4);
  assert.equal(metrics.snapshot().verdicts.BLOCK, before.verdicts.BLOCK + 4);
});

test('SDK resource handlers cache policy and incident list for one hour and leave stats uncached', async t => {
  await clearCache();
  t.after(() => clearCache());
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const controller = new BouncerResources(new IncidentsService(), new MetricsService());
  for (const definition of extractResources(BouncerResources)) {
    const metadata = getCacheMetadata(BouncerResources.prototype, definition.methodName);
    if (definition.methodName === 'stats') {
      assert.equal(metadata, undefined);
      continue;
    }
    assert.equal(metadata?.ttl, 3600);
    const resource = buildResource(controller, definition.methodName, definition.options);
    const first = await resource.fetch(context);
    assert.equal((await resource.fetch(context)).data, first.data);
    now += 3_600_001;
    assert.notEqual((await resource.fetch(context)).data, first.data);
  }
});
