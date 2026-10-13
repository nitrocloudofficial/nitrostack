import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ElasticService } from '../services/elastic.client.js';
import { SEED_KNOWLEDGE_CARDS } from '../services/seed.data.js';
import { knowledgeCardSchema, isTrustedForIndexing, type KnowledgeCard } from '../domain/knowledge-card.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = path.join(currentDir, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const value = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
  if (!process.env.EMBEDDING_VECTOR_DIMENSIONS) {
    process.env.EMBEDDING_VECTOR_DIMENSIONS = '1024';
  }
}


export async function pushMockDataToElastic() {
  loadEnvFile();

  const esUrl = process.env.ELASTICSEARCH_URL;
  if (!esUrl) {
    console.error('❌ ELASTICSEARCH_URL is missing from environment or .env file.');
    process.exit(1);
  }

  console.log(`📡 Connecting to Elasticsearch cluster at: ${esUrl}`);

  // Validate cards
  const validCards: KnowledgeCard[] = [];
  const errors: string[] = [];

  for (const rawCard of SEED_KNOWLEDGE_CARDS) {
    const parsed = knowledgeCardSchema.safeParse(rawCard);
    if (!parsed.success) {
      errors.push(`${(rawCard as { id?: string }).id || 'unknown'}: ${parsed.error.message}`);
      continue;
    }
    if (!isTrustedForIndexing(parsed.data)) {
      errors.push(`${parsed.data.id}: Missing evidence for PASS status`);
      continue;
    }
    validCards.push(parsed.data);
  }

  if (errors.length > 0) {
    console.error(`⚠️ Found ${errors.length} invalid cards. Refusing to index invalid data.`);
    process.exit(1);
  }

  console.log(`✅ Validated ${validCards.length} seed cards cleanly.`);

  const elasticService = new ElasticService();

  console.log('🔨 Ensuring index `hacksmymachine-fixes` exists and mappings are configured...');
  await elasticService.initIndex();

  console.log(`🚀 Bulk-indexing ${validCards.length} verified knowledge cards into Elasticsearch...`);
  const result = await elasticService.bulkUpsertFixes(validCards);

  console.log('\n=================== ELASTICSEARCH INGESTION REPORT ===================');
  console.log(` Total Cards Processed : ${validCards.length}`);
  console.log(` Successfully Created  : ${result.created}`);
  console.log(` Successfully Updated  : ${result.updated}`);
  console.log(` Failures              : ${result.failed}`);
  console.log('======================================================================\n');

  if (result.failed > 0) {
    result.errors.forEach((err) => console.error(` ❌ ${err.id}: ${err.reason}`));
    process.exit(1);
  } else {
    console.log('🎉 Mock data successfully pushed to Elasticsearch!');
  }
}

pushMockDataToElastic().catch((err) => {
  console.error('❌ Ingestion failed with unexpected error:', err);
  process.exit(1);
});
