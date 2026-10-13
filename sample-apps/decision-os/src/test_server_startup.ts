import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function testServer() {
  console.error('[SERVER TEST] Initializing McpApplicationFactory...');
  const server = await McpApplicationFactory.create(AppModule);
  console.error('[SERVER TEST] Starting server...');
  await server.start();
  console.error('[SERVER TEST] Server started successfully!');
  
  // Keep process alive for 3 seconds to verify HTTP listener
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.error('[SERVER TEST] Test completed successfully.');
  process.exit(0);
}

testServer().catch((err) => {
  console.error('[SERVER TEST ERROR]:', err);
  process.exit(1);
});
