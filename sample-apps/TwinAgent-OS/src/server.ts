import { buildApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { initializeWorkers } from './infrastructure/queues/index.js';
import { initializeScheduler } from './core/scheduler/index.js';
import { initializeDomainEvents } from './core/events/index.js';
import { logger } from './infrastructure/logger/index.js';

async function startServer() {
  logger.info('[TwinAgent OS] Bootstrapping Proactive Enterprise Digital Twin Server...');

  // Initialize DB & Cache
  await connectDatabase();
  await connectRedis();

  // Initialize Event Listeners & Workers
  initializeDomainEvents();
  initializeWorkers();
  initializeScheduler();

  const app = buildApp();

  try {
    const address = await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`[TwinAgent OS] Server running at ${address}`);
    logger.info(`[TwinAgent OS] Swagger Docs available at ${address}/documentation`);
  } catch (err) {
    logger.error(err, '[TwinAgent OS] Failed to start server');
    process.exit(1);
  }

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`[TwinAgent OS] Received ${signal}, initiating graceful shutdown...`);
      await app.close();
      process.exit(0);
    });
  }
}

startServer();
