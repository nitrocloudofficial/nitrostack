import { Queue, Worker } from 'bullmq';
import { redis } from '../../config/redis.js';
import { logger } from '../logger/index.js';

export const syncQueue = new Queue('sync-queue', { connection: redis });
export const predictionQueue = new Queue('prediction-queue', { connection: redis });
export const workflowQueue = new Queue('workflow-queue', { connection: redis });

export function initializeWorkers() {
  try {
    new Worker(
      'sync-queue',
      async (job) => {
        logger.info({ jobId: job.id, data: job.data }, '[BullMQ Worker] Syncing Connector...');
        return { success: true, timestamp: new Date() };
      },
      { connection: redis }
    );

    new Worker(
      'prediction-queue',
      async (job) => {
        logger.info({ jobId: job.id, data: job.data }, '[BullMQ Worker] Processing Prediction Task...');
        return { success: true, timestamp: new Date() };
      },
      { connection: redis }
    );

    logger.info('[BullMQ] Background workers initialized successfully.');
  } catch (error) {
    logger.warn('[BullMQ] Background queue worker initialization skipped (Redis fallback mode).');
  }
}
