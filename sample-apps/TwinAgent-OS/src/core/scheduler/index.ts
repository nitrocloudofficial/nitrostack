import cron from 'node-cron';
import { logger } from '../../infrastructure/logger/index.js';
import { predictionEngineService } from '../prediction/service.js';
import { prisma } from '../../config/database.js';

export function initializeScheduler() {
  logger.info('[Scheduler] Initializing automated cron tasks...');

  // 1. Prediction Scan Cron (Every hour)
  cron.schedule('0 * * * *', async () => {
    logger.info('[Scheduler] Running hourly AI prediction scan...');
    try {
      const orgs = await prisma.organization.findMany({ select: { id: true } });
      for (const org of orgs) {
        await predictionEngineService.runOrganizationScan(org.id);
      }
    } catch (err) {
      logger.error({ err }, '[Scheduler] Error executing prediction scan cron');
    }
  });

  // 2. Health & Twin Metrics Refresh (Every midnight)
  cron.schedule('0 0 * * *', async () => {
    logger.info('[Scheduler] Running daily Digital Twin snapshot refresh...');
  });
}
