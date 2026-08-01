import { ConfigService, ExecutionContext } from '@nitrostack/core';
import { PurchaseTools } from './modules/purchase/purchase.tools.js';
import { GeminiService } from './services/gemini.service.js';
import { SearchService } from './services/search.service.js';

async function run() {
  const config = new ConfigService();
  const gemini = new GeminiService(config);
  const search = new SearchService(config);
  
  const purchaseTools = new PurchaseTools(search, gemini);

  const context: ExecutionContext = {
    logger: {
      info: console.log,
      error: console.error,
      warn: console.warn,
    }
  } as any;

  try {
    const result = await purchaseTools.analyseProduct({ productUrl: "https://example.com/test" }, context);
    console.log("RESULT OK");
    console.log(JSON.stringify(result));
  } catch (err) {
    console.error("CAUGHT ERROR:", err);
  }
}

run();
