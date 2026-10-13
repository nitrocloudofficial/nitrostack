import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { ElasticService } from '../../src/services/elastic.client.js';
import { loadEnv } from '../../src/config/env.js';
import { validateCardsForSeeding } from '../../src/scripts/seed-elastic.js';
import { SEED_KNOWLEDGE_CARDS } from '../../src/services/seed.data.js';

/**
 * Phase 1 Checkpoint 10 retrieval-quality gate: hit@1 >= 80%, hit@3 >= 90%,
 * and 100% exclusion of wrong-language / unverified records, against a real
 * Elasticsearch scratch index seeded with all 60 real cards.
 *
 * Self-skips here — this sandbox has no live Elasticsearch cluster and no
 * embedding credentials, so this evaluation has NEVER ACTUALLY RUN in this
 * session. The thresholds below are the agreed target, not a result anyone
 * has observed; do not treat a green CI run of the surrounding suite as
 * evidence this gate passed. See HANDOFF.md/DOUBTS.md for the honest status.
 *
 * Note on scope: none of the 60 seed cards populate `environment.packageVersions`
 * (query-time package-version filtering is unit-tested with synthetic filter
 * params in elastic.query.test.ts, but isn't exercised here against real stored
 * data) — "version conflict" exclusion below is covered via language/framework
 * mismatch instead, which the corpus does support.
 */
const hasRealElasticsearch = Boolean(process.env.ELASTICSEARCH_URL);
const scratchIndexName = `patch-made-in-heaven-fixes-quality-${Date.now()}`;

interface PositiveCase {
  kind: 'exact' | 'paraphrase' | 'abbreviation';
  description: string;
  query: { stacktrace: string; language: string; framework?: string };
  expectedId: string;
}

interface ExclusionCase {
  kind: 'cross-language' | 'unknown-error';
  description: string;
  query: { stacktrace: string; language: string; framework?: string };
  /** Card id that must NOT appear in results (cross-language case only). */
  mustNotContainId?: string;
}

const POSITIVE_CASES: PositiveCase[] = [
  {
    kind: 'exact',
    description: 'exact captured stacktrace for a KeyError',
    query: {
      stacktrace:
        'Traceback (most recent call last):\n  File "/workspace/main.py", line 2, in <module>\n    print(config["port"])\n          ~~~~~~^^^^^^^^\nKeyError: \'port\'',
      language: 'python',
    },
    expectedId: 'fix_python_keyerror_dict_access',
  },
  {
    kind: 'exact',
    description: 'exact captured stacktrace for a const reassignment TypeError',
    query: {
      stacktrace: '/workspace/main.js:2\nretries = retries - 1;\n        ^\n\nTypeError: Assignment to constant variable.',
      language: 'javascript',
    },
    expectedId: 'fix_node_const_reassignment',
  },
  {
    kind: 'exact',
    description: 'exact captured build error for an unknown Dockerfile instruction',
    query: {
      stacktrace: 'Error: building at STEP "RUNN ": Build error: Unknown instruction: "RUNN"',
      language: 'docker',
    },
    expectedId: 'fix_docker_unknown_instruction_typo',
  },
  {
    kind: 'exact',
    description: 'exact captured stacktrace for a ZeroDivisionError',
    query: {
      stacktrace: 'ZeroDivisionError: division by zero',
      language: 'python',
    },
    expectedId: 'fix_python_zero_division_unguarded',
  },
  {
    kind: 'paraphrase',
    description: 'natural-language paraphrase of the KeyError problem',
    query: {
      stacktrace: "trying to access a dictionary key that doesn't exist throws an error",
      language: 'python',
    },
    expectedId: 'fix_python_keyerror_dict_access',
  },
  {
    kind: 'paraphrase',
    description: 'natural-language paraphrase of the collections.abc import problem',
    query: {
      stacktrace: 'cannot import Mapping from the collections module on newer python versions',
      language: 'python',
    },
    expectedId: 'fix_python_collections_abc_import',
  },
  {
    kind: 'paraphrase',
    description: 'natural-language paraphrase of calling .map on null',
    query: {
      stacktrace: 'calling map on a null value instead of an array crashes the script',
      language: 'javascript',
    },
    expectedId: 'fix_node_map_on_null',
  },
  {
    kind: 'abbreviation',
    description: 'short/informal phrasing: "KeyError missing dict key"',
    query: { stacktrace: 'KeyError missing dict key', language: 'python' },
    expectedId: 'fix_python_keyerror_dict_access',
  },
  {
    kind: 'abbreviation',
    description: 'short/informal phrasing: "set -u unbound var"',
    query: { stacktrace: 'set -u unbound var DEPLOY_TARGET', language: 'general' },
    expectedId: 'fix_general_set_u_unbound_variable',
  },
  {
    kind: 'abbreviation',
    description: 'short/informal phrasing: "const reassign TypeError"',
    query: { stacktrace: 'const reassign TypeError js', language: 'javascript' },
    expectedId: 'fix_node_const_reassignment',
  },
];

const EXCLUSION_CASES: ExclusionCase[] = [
  {
    kind: 'cross-language',
    description: 'a Python KeyError stacktrace filtered to javascript must not surface the Python card',
    query: {
      stacktrace:
        'Traceback (most recent call last):\n  File "/workspace/main.py", line 2, in <module>\n    print(config["port"])\nKeyError: \'port\'',
      language: 'javascript',
    },
    mustNotContainId: 'fix_python_keyerror_dict_access',
  },
  {
    kind: 'cross-language',
    description: 'a Node TypeError stacktrace filtered to python must not surface the Node card',
    query: {
      stacktrace: 'TypeError: Assignment to constant variable.',
      language: 'python',
    },
    mustNotContainId: 'fix_node_const_reassignment',
  },
  {
    kind: 'unknown-error',
    description: 'a nonsense query with no real corpus overlap should return no confident hits',
    query: { stacktrace: 'quantum flux capacitor overload in the flimflam subsystem', language: 'python' },
  },
  {
    kind: 'unknown-error',
    description: 'a second nonsense query in a different language should also return no confident hits',
    query: { stacktrace: 'the sprocket alignment daemon reported an unrecognized glyph error', language: 'javascript' },
  },
];

describe.skipIf(!hasRealElasticsearch)('retrieval quality evaluation (real Elasticsearch)', () => {
  let service: ElasticService;
  let rawClient: Client;

  beforeAll(async () => {
    const env = loadEnv();
    rawClient = new Client({
      node: env.elasticsearch.url!,
      ...(env.elasticsearch.apiKey ? { auth: { apiKey: env.elasticsearch.apiKey } } : {}),
    });
    service = new ElasticService({ env, indexName: scratchIndexName });
    await service.initIndex();

    const { valid, errors } = validateCardsForSeeding(SEED_KNOWLEDGE_CARDS);
    if (errors.length > 0) {
      throw new Error(`Refusing to run quality evaluation: seed corpus failed validation: ${errors.join('; ')}`);
    }
    const result = await service.bulkUpsertFixes(valid);
    if (result.failed > 0) {
      throw new Error(`Failed to seed scratch index for quality evaluation: ${JSON.stringify(result.errors)}`);
    }
  }, 60000);

  afterAll(async () => {
    await rawClient.indices.delete({ index: scratchIndexName }).catch(() => {});
  });

  it('meets the Phase 1 thresholds: hit@1 >= 80%, hit@3 >= 90%, over exact/paraphrase/abbreviation cases', async () => {
    let hit1 = 0;
    let hit3 = 0;

    for (const testCase of POSITIVE_CASES) {
      const result = await service.searchFix(testCase.query);
      const ids = result.hits.map((hit) => hit.card.id);
      if (ids[0] === testCase.expectedId) hit1 += 1;
      if (ids.slice(0, 3).includes(testCase.expectedId)) hit3 += 1;
    }

    const hit1Rate = hit1 / POSITIVE_CASES.length;
    const hit3Rate = hit3 / POSITIVE_CASES.length;
    // Never hidden: printed regardless of pass/fail.
    console.log(`Retrieval quality: hit@1=${(hit1Rate * 100).toFixed(1)}% hit@3=${(hit3Rate * 100).toFixed(1)}%`);

    expect(hit1Rate).toBeGreaterThanOrEqual(0.8);
    expect(hit3Rate).toBeGreaterThanOrEqual(0.9);
  }, 60000);

  it('excludes wrong-language records and returns no confident hits for unrecognized errors (100%)', async () => {
    for (const testCase of EXCLUSION_CASES) {
      const result = await service.searchFix(testCase.query);
      const ids = result.hits.map((hit) => hit.card.id);

      if (testCase.mustNotContainId) {
        expect(ids, testCase.description).not.toContain(testCase.mustNotContainId);
      } else {
        // Unknown-error case: no result should be returned with meaningful confidence.
        const hasConfidentHit = result.hits.some((hit) => hit.confidence > 0.3);
        expect(hasConfidentHit, testCase.description).toBe(false);
      }
    }
  }, 60000);
});
