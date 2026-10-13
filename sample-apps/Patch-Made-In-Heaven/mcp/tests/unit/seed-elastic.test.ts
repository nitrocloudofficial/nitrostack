import { describe, expect, it } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { validateCardsForSeeding } from '../../src/scripts/seed-elastic.js';
import { SEED_KNOWLEDGE_CARDS } from '../../src/services/seed.data.js';
import type { KnowledgeCard } from '../../src/domain/knowledge-card.js';

const execFileAsync = promisify(execFile);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(currentDir, '../../src/scripts/seed-elastic.ts');
const projectRoot = path.join(currentDir, '../..');

// npm workspaces (the monorepo root package.json added for NitroCloud's build)
// can hoist tsx's binary to either mcp/node_modules/.bin or the repo root's,
// depending on what else is installed — check both rather than hardcode one.
function resolveTsxBin(): string {
  const candidates = [
    path.join(projectRoot, 'node_modules/.bin/tsx'),
    path.join(projectRoot, '../node_modules/.bin/tsx'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Could not resolve the tsx binary; checked: ${candidates.join(', ')}`);
  }
  return found;
}

const tsxBin = resolveTsxBin();

function evidencedPassCard(overrides: Partial<KnowledgeCard> = {}): unknown {
  return {
    id: 'fix_sample_card',
    problem: 'sample problem',
    errorType: 'ImportError',
    environment: { language: 'python' },
    patch: '--- a/x.py\n+++ b/x.py\n@@ -1 +1 @@\n-old\n+new',
    verification: {
      status: 'PASS',
      score: 0.9,
      lastVerified: '2026-07-25T14:00:00.000Z',
      sandbox: 'docker',
      exitCode: 0,
      durationMs: 100,
      stdout: 'OK',
      stderr: '',
    },
    metrics: { reuseCount: 0 },
    ...overrides,
  };
}

describe('validateCardsForSeeding', () => {
  it('accepts every real seed card from the committed corpus', () => {
    const { valid, errors } = validateCardsForSeeding(SEED_KNOWLEDGE_CARDS);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(60);
  });

  it('rejects a card that fails hm.v1 schema validation', () => {
    const { valid, errors } = validateCardsForSeeding([{ id: 'not-a-real-card' }]);
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('schema validation failed');
  });

  it('rejects a schema-valid card whose status is FAIL, never indexing it as trusted', () => {
    const failCard = evidencedPassCard({
      verification: {
        status: 'FAIL',
        score: 0,
        lastVerified: '2026-07-25T14:00:00.000Z',
        sandbox: 'docker',
      },
    });
    const { valid, errors } = validateCardsForSeeding([failCard]);
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('not trusted for indexing');
  });

  it('rejects a PASS-labelled card that lacks real execution evidence', () => {
    const noEvidenceCard = evidencedPassCard({
      verification: {
        status: 'PASS',
        score: 0.9,
        lastVerified: '2026-07-25T14:00:00.000Z',
        sandbox: 'docker',
        // no exitCode/durationMs/stdout/stderr
      },
    });
    const { valid, errors } = validateCardsForSeeding([noEvidenceCard]);
    expect(valid).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a well-formed, evidenced PASS card', () => {
    const { valid, errors } = validateCardsForSeeding([evidencedPassCard()]);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(1);
  });
});

describe('seed-elastic CLI', () => {
  it('--validate-only exits 0 and performs no network writes when Elasticsearch is unconfigured', async () => {
    const { stdout } = await execFileAsync(tsxBin, [scriptPath, '--validate-only'], {
      env: { ...process.env, ELASTICSEARCH_URL: '' },
    });
    expect(stdout).toContain('Validated 60 card(s)');
    expect(stdout).toContain('no network writes performed');
  });

  it('a live seed request without ELASTICSEARCH_URL exits non-zero rather than silently succeeding', async () => {
    await expect(
      execFileAsync(tsxBin, [scriptPath], { env: { ...process.env, ELASTICSEARCH_URL: '' } })
    ).rejects.toMatchObject({ code: 1 });
  });
});
