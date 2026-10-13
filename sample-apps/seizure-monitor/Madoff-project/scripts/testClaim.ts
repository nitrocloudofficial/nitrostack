import 'dotenv/config';
import { TestingModule } from '@nitrostack/core/testing';
import { FraudTools } from '../src/tools/FraudTools.js';
import { DatasetService } from '../src/services/DatasetService.js';
import { MongoService } from '../src/services/MongoService.js';
import { FraudResources } from '../src/resources/FraudResources.js';
import { AIService } from '../src/services/AIService.js';
import { Ledger } from '../src/domain/Ledger.js';
import { RuleEngine } from '../src/rules/index.js';

async function main() {
  console.log('🏁 Starting E2E database lookup verification test...');
  
  // Compile the testing module with all dependencies
  const module = TestingModule.create()
    .addProvider(MongoService)
    .addProvider(DatasetService)
    .addProvider(FraudResources)
    .addProvider(AIService)
    .addProvider(Ledger)
    .addProvider(RuleEngine)
    .addProvider(FraudTools)
    .compile();
    
  // Resolve MongoService and initialize database connection manually
  const mongoService = module.get(MongoService);
  if (!mongoService) {
    throw new Error('Failed to resolve MongoService.');
  }
  await mongoService.onModuleInit();

  // Resolve FraudTools
  const fraudTools = module.get(FraudTools);
  if (!fraudTools) {
    throw new Error('Failed to resolve FraudTools provider.');
  }

  const mockCtx: any = {
    logger: console
  };

  const claimsToTest = ['claim_csv_001', 'claim_csv_002', 'claim_csv_003'];
  
  for (const claimId of claimsToTest) {
    console.log(`\n--- Testing Valid Claim ID: "${claimId}" ---`);
    try {
      const result = await fraudTools.analyzeClaim({ claimId }, mockCtx);
      console.log(`✅ Claim ${claimId} succeeded. Recommendation: ${result.decision.recommendation}`);
    } catch (err: any) {
      console.error(`❌ Claim ${claimId} failed:`, err.message);
    }
  }

  console.log(`\n--- Testing Invalid Claim ID: "invalid_claim_999" ---`);
  try {
    await fraudTools.analyzeClaim({ claimId: 'invalid_claim_999' }, mockCtx);
    console.error('❌ Expected invalid_claim_999 to fail, but it succeeded!');
  } catch (err: any) {
    console.log(`✅ Invalid claim check passed: "${err.message}"`);
  }

  // Cleanup container and connection
  await mongoService.onModuleDestroy();
  module.cleanup();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ E2E test failed with exception:', err);
  process.exit(1);
});
