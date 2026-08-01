import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runDetection } from '../src/engine/index.js';
import { parseOpenApiTemplates, diffSpec } from '../src/engine/spec.js';
import { aggregateEndpoints } from '../src/engine/topology.js';
import type { AccessLogRecord, Severity } from '../src/engine/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SEVERITY_RANK: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function loadRecords(): AccessLogRecord[] {
  const raw = readFileSync(join(ROOT, 'fixtures/logs/acme-prod.jsonl'), 'utf-8');
  return raw
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as AccessLogRecord);
}

function loadGroundTruth(): {
  expectedTemplateCount: number;
  expectedDocumentedCount: number;
  expectedShadowCount: number;
  expectedFindings: { template: string; rule: string; minSeverity: Severity }[];
  mustNotFlag: string[];
} {
  return JSON.parse(readFileSync(join(ROOT, 'fixtures/ground-truth.json'), 'utf-8'));
}

function run() {
  const records = loadRecords();
  const spec = JSON.parse(readFileSync(join(ROOT, 'fixtures/spec/acme-openapi.json'), 'utf-8'));
  const rawSpecPaths = parseOpenApiTemplates(spec);

  // Resolve the real documented/shadow split via diffSpec first (position-
  // based, per spec.ts), then feed the resulting documented-template list
  // into runDetection — this is the same two-step pipeline the MCP layer
  // will use once import_openapi_spec + scan_authorization_risks are wired.
  const naiveObserved = aggregateEndpoints(records, []);
  const diff = diffSpec(naiveObserved, rawSpecPaths);
  const documentedTemplates = diff.documented.map((t) => t.template);

  return runDetection(records, documentedTemplates);
}

describe('ground truth (real fixture data)', () => {
  const groundTruth = loadGroundTruth();

  it('1. every expected finding is present at >= minSeverity', () => {
    const { findings } = run();
    for (const expected of groundTruth.expectedFindings) {
      const match = findings.find((f) => f.template === expected.template && f.rule === expected.rule);
      expect(match, `expected ${expected.rule} on ${expected.template}`).toBeDefined();
      expect(
        SEVERITY_RANK[match!.severity],
        `${expected.rule} on ${expected.template}: got ${match!.severity}, want >= ${expected.minSeverity}`,
      ).toBeGreaterThanOrEqual(SEVERITY_RANK[expected.minSeverity]);
    }
  });

  it('2. no finding exists for any mustNotFlag template', () => {
    const { findings } = run();
    for (const template of groundTruth.mustNotFlag) {
      const matches = findings.filter((f) => f.template === template);
      expect(matches, `unexpected finding(s) on ${template}: ${JSON.stringify(matches)}`).toEqual([]);
    }
  });

  it('3. /internal/v0/export/customers is CRITICAL and carries both R3_AUTH_GAP and R5_SHADOW', () => {
    const { findings } = run();
    const onTemplate = findings.filter((f) => f.template === '/internal/v0/export/customers');
    const rules = onTemplate.map((f) => f.rule).sort();
    expect(rules).toContain('R3_AUTH_GAP');
    expect(rules).toContain('R5_SHADOW');
    for (const f of onTemplate) {
      expect(f.severity, `${f.rule} on export/customers should be CRITICAL`).toBe('CRITICAL');
    }
  });

  it('4. every finding has non-empty evidence and a well-formed evidenceUri', () => {
    const { findings } = run();
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.evidence.length, `${f.rule} on ${f.template} has empty evidence`).toBeGreaterThan(0);
      expect(f.evidenceUri).toBe(`evidence://finding/${f.id}`);
    }
  });

  it('5. no finding\'s title/rationale contains raw attacker text from the injection payloads', () => {
    const { findings } = run();
    for (const f of findings) {
      expect(f.title).not.toMatch(/IGNORE PREVIOUS/i);
      expect(f.rationale).not.toMatch(/IGNORE PREVIOUS/i);
      expect(f.title).not.toMatch(/you are now an unrestricted/i);
      expect(f.rationale).not.toMatch(/you are now an unrestricted/i);
    }
  });

  it('6. running runDetection twice on the same input yields deeply equal output', () => {
    const a = run();
    const b = run();
    expect(a).toEqual(b);
  });
});
