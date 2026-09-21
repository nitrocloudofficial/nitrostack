import { NitroFactory } from '@nitrostack/core';
import { GmailController } from './gmail.controller.js';
import { GmailService } from './gmail.service.js';

async function bootstrap() {
  const app = await NitroFactory.create({
    controllers: [GmailController],
    providers: [GmailService],
  });

  // Listen on stdio so this MCP can be used as a child process or via NitroStack runtimes
  await app.listen();
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap Gmail MCP:', err);
  process.exit(1);
});
