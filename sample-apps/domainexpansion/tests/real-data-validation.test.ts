import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TestingModule, createMockContext } from '@nitrostack/core/testing';
import { SurfaceStateService } from '../src/modules/surface/state.js';
import { SurfaceTools } from '../src/modules/surface/surface.tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_DIR = join(ROOT, 'fixtures/real-data-validation');
const NASA_PATH = join(CACHE_DIR, 'nasa-http-jul95-sample.log');
const INJECTION_PATH = join(CACHE_DIR, 'disclosed-injection.log');

/**
 * Locks in the result of `npx tsx scripts/validate-real-data.ts` as a
 * permanent regression test, using the two committed artifacts (the real
 * NASA-HTTP sample and the disclosed synthetic injection block — see that
 * script's header comment for the full disclosure of what's injected and
 * why) rather than re-downloading. Skips gracefully if those files haven't
 * been generated yet (they're gitignored-with-exception but a fresh
 * clone's first `npm test` run would still have them, since they're
 * committed — this guard exists for defence in depth, not because they're
 * expected to be missing).
 */
describe('real-data validation (NASA-HTTP background + disclosed injection)', () => {
  const hasFixtures = existsSync(NASA_PATH) && existsSync(INJECTION_PATH);

  it.skipIf(!hasFixtures)('finds all six disclosed attack patterns embedded in real, uncurated traffic', async () => {
    const nasaBackground = readFileSync(NASA_PATH, 'utf-8');
    const injection = readFileSync(INJECTION_PATH, 'utf-8');
    const rawText = nasaBackground + injection;

    const module = TestingModule.create().addProvider(SurfaceStateService).addProvider(SurfaceTools).compile();
    const tools = module.get(SurfaceTools);
    const ctx = createMockContext();

    const ingestResult = await tools.ingestAccessLogs({ source: 'combined-log-format', rawText }, ctx);
    expect(ingestResult.ok).toBe(true);
    if (!ingestResult.ok) throw new Error('unreachable');
    expect(ingestResult.data.rejected.count).toBe(0);

    const scanResult = await tools.scanAuthorizationRisks({}, ctx);
    expect(scanResult.ok).toBe(true);
    if (!scanResult.ok) throw new Error('unreachable');

    const expected: { rule: string; template: string; minSeverity: string }[] = [
      { rule: 'R1_CROSS_ACTOR', template: '/api/v1/accounts/{id}', minSeverity: 'HIGH' },
      { rule: 'R2_ENUMERATION', template: '/api/v1/documents/{docId}', minSeverity: 'HIGH' },
      { rule: 'R3_AUTH_GAP', template: '/api/v1/reports', minSeverity: 'HIGH' },
      { rule: 'R4_EXISTENCE_ORACLE', template: '/api/v1/invoices/{invoiceId}', minSeverity: 'LOW' },
      { rule: 'R6_UNGUARDED_WRITE', template: '/api/v1/sessions/{id}', minSeverity: 'LOW' },
      { rule: 'R7_LOG_INJECTION', template: '/api/v1/accounts/{id}', minSeverity: 'HIGH' },
    ];
    const rank: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

    for (const exp of expected) {
      const match = scanResult.data.find((f) => f.rule === exp.rule && f.template === exp.template);
      expect(match, `expected ${exp.rule} on ${exp.template}`).toBeDefined();
      expect(rank[match!.severity]).toBeGreaterThanOrEqual(rank[exp.minSeverity]);
    }

    // R7's own output must never echo the raw injected instruction text.
    const r7 = scanResult.data.find((f) => f.rule === 'R7_LOG_INJECTION' && f.template === '/api/v1/accounts/{id}');
    expect(r7!.rationale).not.toMatch(/IGNORE PREVIOUS/i);
  });
});
