import { fileURLToPath } from 'url';
import { ElasticService } from '../services/elastic.client.js';
import { SEED_KNOWLEDGE_CARDS } from '../services/seed.data.js';
import { knowledgeCardSchema, isTrustedForIndexing, type KnowledgeCard } from '../domain/knowledge-card.js';

export interface SeedValidationResult {
  valid: KnowledgeCard[];
  errors: string[];
}

/**
 * Schema-validates every seed card and refuses any that aren't genuinely
 * trusted (real PASS verification evidence, not just a status flag). Pure
 * and network-free — safe to call from `--validate-only` mode or tests.
 */
export function validateCardsForSeeding(cards: unknown[]): SeedValidationResult {
  const errors: string[] = [];
  const valid: KnowledgeCard[] = [];

  for (const rawCard of cards) {
    const parsed = knowledgeCardSchema.safeParse(rawCard);
    if (!parsed.success) {
      const id = typeof (rawCard as { id?: unknown })?.id === 'string' ? (rawCard as { id: string }).id : 'unknown';
      errors.push(`${id}: schema validation failed: ${parsed.error.message}`);
      continue;
    }
    if (!isTrustedForIndexing(parsed.data)) {
      errors.push(`${parsed.data.id}: not trusted for indexing (requires a real, evidenced PASS verification)`);
      continue;
    }
    valid.push(parsed.data);
  }

  return { valid, errors };
}

async function main() {
  const validateOnly = process.argv.includes('--validate-only');

  const { valid, errors } = validateCardsForSeeding(SEED_KNOWLEDGE_CARDS);
  if (errors.length > 0) {
    console.error(`Refusing to seed: ${errors.length} card(s) failed validation:`);
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
  console.log(`Validated ${valid.length} card(s): schema-valid and trusted (real, evidenced PASS verification).`);

  if (validateOnly) {
    console.log('--validate-only: no network writes performed.');
    return;
  }

  const service = new ElasticService();
  if (!service.isConnected()) {
    console.error(
      'ELASTICSEARCH_URL is not configured. A live seed requires real credentials; refusing to silently no-op. Use --validate-only for an offline check.'
    );
    process.exit(1);
  }

  await service.initIndex();
  console.log(`Index ready. Bulk upserting ${valid.length} card(s)...`);

  const result = await service.bulkUpsertFixes(valid);
  console.log(`Seeding complete: ${result.created} created, ${result.updated} updated, ${result.failed} failed.`);

  if (result.failed > 0) {
    result.errors.forEach((error) => console.error(`  - ${error.id}: ${error.reason}`));
    process.exit(1);
  }
}

const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error('seed-elastic failed:', error);
    process.exit(1);
  });
}
