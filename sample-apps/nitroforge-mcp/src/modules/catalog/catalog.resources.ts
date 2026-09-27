import { ResourceDecorator as Resource, Inject, type ExecutionContext } from '@nitrostack/core';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTIFACT_STORE, type ArtifactStore } from '../../contracts/store.contract.js';
import { ActivityService } from '../../observability/activity.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPECS_DIR = join(__dirname, '..', '..', '..', 'fixtures', 'specs');

/**
 * catalog.resources.ts — no class-level decorator, matching the real
 * CLI-generated CalculatorResources (verified: resources/prompts don't
 * need @Controller — only listed in the module's `controllers` array).
 *
 * Injects ArtifactStore via the ARTIFACT_STORE token, same as
 * ingest.tools.ts / forge.tools.ts — NOT by injecting StoreService
 * directly by class, even though this module owns that class. Direct
 * class-typed injection would resolve under a *different* DI cache key
 * (`resolve(StoreService)` vs `resolve('ARTIFACT_STORE')`) and silently
 * produce a second, disconnected StoreService instance. Token-based
 * injection everywhere is what guarantees one shared store.
 *
 * Manual activity logging: buildResource() in
 * node_modules/@nitrostack/core/dist/core/builders.js never reads
 * interceptor metadata (confirmed — only buildTool does), so there's no
 * @UseInterceptors path for resources. Each handler logs directly.
 */
export class CatalogResources {
  constructor(
    @Inject(ARTIFACT_STORE) private readonly store: ArtifactStore,
    private readonly activity: ActivityService,
  ) {}

  private async logRead(uri: string, start: number, status: 'ok' | 'error', detail: string | null) {
    await this.activity.record({
      ts: new Date().toISOString(),
      kind: 'resource',
      method: 'resources/read',
      name: uri,
      durationMs: Date.now() - start,
      status,
      detail,
    });
  }

  @Resource({
    uri: 'forge://specs',
    name: 'Vetted spec catalog',
    description: 'The pre-vetted OpenAPI specs NitroForge demos against, from fixtures/specs/',
    mimeType: 'application/json',
    examples: {
      response: { specs: [{ name: 'demo', file: 'demo.yaml' }] },
    },
  })
  async getSpecs(uri: string, _ctx: ExecutionContext) {
    const start = Date.now();
    try {
      let files: string[] = [];
      if (existsSync(SPECS_DIR)) {
        files = (await readdir(SPECS_DIR)).filter((f) => f.endsWith('.yaml') || f.endsWith('.json'));
      }
      const specs = files.map((file) => ({ name: file.replace(/\.(yaml|json)$/, ''), file }));
      await this.logRead(uri, start, 'ok', `${specs.length} specs`);
      return { specs };
    } catch (err) {
      await this.logRead(uri, start, 'error', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  @Resource({
    uri: 'forge://ir/{id}',
    name: 'Raw Tool Surface IR',
    description:
      "The model's literal planning output — tool names, descriptions, endpoint clustering, widget bindings. JSON, not code. This is the resource that proves the 'not a wrapper' claim.",
    mimeType: 'application/json',
    examples: {
      response: { irId: 'ir_...', ir: { server: { name: 'demo-crm-mcp' } } },
    },
  })
  async getIR(uri: string, _ctx: ExecutionContext) {
    const start = Date.now();
    const id = uri.split('forge://ir/')[1] ?? '';
    try {
      const ir = await this.store.getIR(id);
      if (!ir) {
        await this.logRead(uri, start, 'error', `unknown ir id: ${id}`);
        return { error: `Unknown ir id: ${id}` };
      }
      await this.logRead(uri, start, 'ok', `${ir.server.name}`);
      return { irId: id, ir };
    } catch (err) {
      await this.logRead(uri, start, 'error', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  @Resource({
    uri: 'forge://server/{id}',
    name: 'Generated server manifest',
    description: 'File manifest and machine VerificationReport for a forged server',
    mimeType: 'application/json',
    examples: {
      response: { serverId: 'server_...', status: 'green', toolCount: 6 },
    },
  })
  async getServer(uri: string, _ctx: ExecutionContext) {
    const start = Date.now();
    const id = uri.split('forge://server/')[1] ?? '';
    try {
      const record = await this.store.getServer(id);
      if (!record) {
        await this.logRead(uri, start, 'error', `unknown server id: ${id}`);
        return { error: `Unknown server id: ${id}` };
      }
      await this.logRead(uri, start, 'ok', record.report.status);
      return {
        serverId: id,
        irId: record.irId,
        entrypoint: record.project.entrypoint,
        toolNames: record.project.toolNames,
        files: record.project.files.map((f) => f.relPath),
        report: record.report,
      };
    } catch (err) {
      await this.logRead(uri, start, 'error', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }
}
