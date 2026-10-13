import { AIService } from './core/ai/ai.service.js';

async function test() {
  const service = new AIService();
  const health = await service.healthCheck();
  console.error('[HEALTH CHECK RESULT]:', JSON.stringify(health, null, 2));
}

test();
