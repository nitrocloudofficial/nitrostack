import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { StartupValidator } from './health/startup-validator.js';

async function bootstrap() {
  const validator = new StartupValidator();
  const results = await validator.validateAll();

  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    console.error('Startup validation failed:');
    errors.forEach(e => console.error(`  [ERROR] ${e.service}: ${e.message}`));
    process.exit(1);
  }

  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('Failed to start AEIOS-X MCP Server:', error);
  process.exit(1);
});
