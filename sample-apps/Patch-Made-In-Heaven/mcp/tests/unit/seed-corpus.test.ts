import { describe, expect, it } from 'vitest';
import { applyPatch } from 'diff';
import { SEED_KNOWLEDGE_CARDS } from '../../src/services/seed.data.js';
import { ALL_SEED_FIXTURES } from '../../src/services/seeds/index.js';
import { knowledgeCardSchema } from '../../src/domain/knowledge-card.js';

// Common secret-shaped patterns. Not exhaustive — a lightweight good-faith
// scan, not a substitute for a real secret-scanning tool.
const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /sk-[a-zA-Z0-9]{20,}/, // OpenAI-style secret key
  /ghp_[a-zA-Z0-9]{36}/, // GitHub personal access token
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private key
];

function fieldsToScanForSecrets(card: (typeof SEED_KNOWLEDGE_CARDS)[number]): string[] {
  return [card.problem, card.stacktrace ?? '', card.patch, card.verification.stdout ?? '', card.verification.stderr ?? ''];
}

describe('seed corpus (schema, uniqueness, honesty)', () => {
  it('every seed card is a valid hm.v1 Knowledge Card', () => {
    for (const card of SEED_KNOWLEDGE_CARDS) {
      const result = knowledgeCardSchema.safeParse(card);
      if (!result.success) {
        throw new Error(`${card.id} failed schema validation: ${result.error.message}`);
      }
    }
  });

  it('has no duplicate ids', () => {
    const ids = SEED_KNOWLEDGE_CARDS.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate problem descriptions', () => {
    const problems = SEED_KNOWLEDGE_CARDS.map((card) => card.problem);
    expect(new Set(problems).size).toBe(problems.length);
  });

  it('matches the source fixture count exactly (one card per fixture, none dropped or duplicated)', () => {
    expect(SEED_KNOWLEDGE_CARDS.length).toBe(ALL_SEED_FIXTURES.length);
  });

  it('has exactly 20 Python fixtures (Checkpoint 6 deliverable)', () => {
    const pythonCards = SEED_KNOWLEDGE_CARDS.filter((card) => card.provenance?.category === 'python');
    expect(pythonCards).toHaveLength(20);
  });

  it('has exactly 15 Node.js/TypeScript fixtures (Checkpoint 7 deliverable)', () => {
    const nodeCards = SEED_KNOWLEDGE_CARDS.filter((card) => card.provenance?.category === 'node');
    expect(nodeCards).toHaveLength(15);
  });

  it('has exactly 15 Docker fixtures (Checkpoint 8 deliverable)', () => {
    const dockerCards = SEED_KNOWLEDGE_CARDS.filter((card) => card.provenance?.category === 'docker');
    expect(dockerCards).toHaveLength(15);
  });

  it('has exactly 10 general/environment fixtures (Checkpoint 9 deliverable)', () => {
    const generalCards = SEED_KNOWLEDGE_CARDS.filter((card) => card.provenance?.category === 'general');
    expect(generalCards).toHaveLength(10);
  });

  it('the full cold-start corpus is exactly 60 fixes (Phase 1 Definition of Done)', () => {
    expect(SEED_KNOWLEDGE_CARDS).toHaveLength(60);
  });

  it('every card carries real PASS verification evidence, not a placeholder', () => {
    for (const card of SEED_KNOWLEDGE_CARDS) {
      expect(card.verification.status).toBe('PASS');
      expect(card.verification.exitCode).toBe(0);
      expect(card.verification.sandbox).toBe('docker');
      expect(card.verification.durationMs).toBeGreaterThanOrEqual(0);
      expect(card.verification.stdout?.length || card.verification.stderr?.length).toBeTruthy();
    }
  });

  it('has no fake reuse metrics: every seed card starts at reuseCount 0', () => {
    for (const card of SEED_KNOWLEDGE_CARDS) {
      expect(card.metrics.reuseCount).toBe(0);
    }
  });

  it('every card is provenance-tagged as a seed', () => {
    for (const card of SEED_KNOWLEDGE_CARDS) {
      expect(card.provenance?.source).toBe('seed');
    }
  });

  it('contains no obviously secret-shaped strings', () => {
    for (const card of SEED_KNOWLEDGE_CARDS) {
      for (const field of fieldsToScanForSecrets(card)) {
        for (const pattern of SECRET_PATTERNS) {
          expect(field).not.toMatch(pattern);
        }
      }
    }
  });

  it("every card's patch, applied to the broken fixture, reproduces the fixed fixture exactly", () => {
    const fixturesById = new Map(ALL_SEED_FIXTURES.map((fixture) => [fixture.id, fixture]));
    for (const card of SEED_KNOWLEDGE_CARDS) {
      const fixture = fixturesById.get(card.id);
      expect(fixture, `no source fixture found for card ${card.id}`).toBeDefined();
      const applied = applyPatch(fixture!.brokenCode, card.patch);
      expect(applied, `${card.id}: patch did not cleanly apply to brokenCode`).not.toBe(false);
      expect(applied).toBe(fixture!.fixedCode);
    }
  });
});
