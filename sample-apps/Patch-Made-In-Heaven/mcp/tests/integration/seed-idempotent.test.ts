import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { ElasticService } from '../../src/services/elastic.client.js';
import { loadEnv } from '../../src/config/env.js';
import { validateCardsForSeeding } from '../../src/scripts/seed-elastic.js';
import { SEED_KNOWLEDGE_CARDS } from '../../src/services/seed.data.js';

/**
 * Proves the actual Definition-of-Done claim: seeding is idempotent. Runs
 * against a real Elasticsearch scratch index (never the production
 * `hacksmymachine-fixes` index). Self-skips here — no ELASTICSEARCH_URL.
 */
const hasRealElasticsearch = Boolean(process.env.ELASTICSEARCH_URL);
const scratchIndexName = `patch-made-in-heaven-fixes-seed-test-${Date.now()}`;

describe.skipIf(!hasRealElasticsearch)('bulk seeding idempotency (real Elasticsearch)', () => {
  let service: ElasticService;
  let rawClient: Client;

  beforeAll(async () => {
    const env = loadEnv();
    rawClient = new Client({
      node: env.elasticsearch.url!,
      ...(env.elasticsearch.apiKey ? { auth: { apiKey: env.elasticsearch.apiKey } } : {}),
    });
    service = new ElasticService({ env, indexName: scratchIndexName, embeddingClient: null });
    await service.initIndex();
  });

  afterAll(async () => {
    await rawClient.indices.delete({ index: scratchIndexName }).catch(() => {});
  });

  it('running the full 60-card seed twice leaves exactly 60 documents, not 120', async () => {
    const { valid, errors } = validateCardsForSeeding(SEED_KNOWLEDGE_CARDS);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(60);

    const firstRun = await service.bulkUpsertFixes(valid);
    expect(firstRun.failed).toBe(0);
    expect(firstRun.created).toBe(60);

    const secondRun = await service.bulkUpsertFixes(valid);
    expect(secondRun.failed).toBe(0);
    expect(secondRun.created).toBe(0);
    expect(secondRun.updated).toBe(60);

    const countResponse = await rawClient.count({ index: scratchIndexName });
    expect(countResponse.count).toBe(60);
  }, 60000);
});
