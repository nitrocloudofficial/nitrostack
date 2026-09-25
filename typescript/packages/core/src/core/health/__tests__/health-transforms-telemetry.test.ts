import { describe, it, expect, afterEach } from '@jest/globals';
import { NitroStackServer } from '../../server.js';
import { buildHealthChecksResource } from '../health-checks.resource.js';
import { CatalogTransform } from '../../transforms/catalog.transform.js';
import { MemorySpilloverStore } from '../../interceptors/spillover/memory-spillover.store.js';

class MockTransformWithTelemetry extends CatalogTransform {
  readonly name = 'mock-telemetry';
  protected async applyTransform(tools: any[]): Promise<any[]> {
    return tools;
  }
  getTelemetry() {
    return { sampleStat: 42, active: true };
  }
}

describe('Health Checks Pipeline Telemetry Export (NITRO-106-M2)', () => {
  let server: NitroStackServer | undefined;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = undefined;
    }
  });

  it('exports active transforms and pipeline telemetry over health://checks', async () => {
    const transform = new MockTransformWithTelemetry();
    server = new NitroStackServer({
      name: 'telemetry-test-server',
      version: '1.0.0',
      transforms: [transform],
    });

    const resourceDef = await buildHealthChecksResource(server);
    const jsonStr = await resourceDef.read();
    const parsed = JSON.parse(jsonStr);

    expect(parsed.status).toBe('healthy');
    expect(parsed.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(parsed.transforms.length).toBe(1);
    expect(parsed.transforms[0].name).toBe('mock-telemetry');
    expect(parsed.transforms[0].type).toBe('MockTransformWithTelemetry');
    expect(parsed.transforms[0].order).toBe(0);
    expect(parsed.transforms[0].details).toEqual({ sampleStat: 42, active: true });
    expect(parsed.spillover).toBeDefined();
    expect(parsed.spillover?.driver).toBe('MemorySpilloverStore');
    expect(parsed.spillover?.activeCount).toBe(0);
    expect(parsed.spillover?.currentSizeBytes).toBe(0);
  });

  it('exports spillover telemetry metrics when records exist', async () => {
    server = new NitroStackServer({
      name: 'spillover-health-server',
      version: '1.0.0',
    });

    const store = new MemorySpilloverStore({ maxSizeBytes: 5000 });
    server.setSpilloverStore(store);

    await store.save('test-1', '{"hello":"world"}', 'application/json', 60);

    const resourceDef = await buildHealthChecksResource(server);
    const parsed = JSON.parse(await resourceDef.read());

    expect(parsed.spillover).toBeDefined();
    expect(parsed.spillover?.driver).toBe('MemorySpilloverStore');
    expect(parsed.spillover?.activeCount).toBe(1);
    expect(parsed.spillover?.currentSizeBytes).toBeGreaterThan(0);
    expect(parsed.spillover?.maxSizeBytes).toBe(5000);
  });

  it('runs cleanly when server is omitted (backwards compatibility)', async () => {
    const resourceDef = await buildHealthChecksResource();
    const parsed = JSON.parse(await resourceDef.read());

    expect(parsed.status).toBe('healthy');
    expect(parsed.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(parsed.transforms)).toBe(true);
    expect(parsed.transforms.length).toBe(0);
  });
});
