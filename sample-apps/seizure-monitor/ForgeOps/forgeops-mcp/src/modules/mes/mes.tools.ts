/**
 * ForgeOps — MES MCP Server Module
 *
 * Tools:
 *   - get_batch_history: Batch genealogy, route, timestamps, yield, status
 *   - get_production_path: Stage-by-stage manufacturing path with anomalies
 *   - get_queue_events: Queue delays, wait times, anomalies
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '../../nitrostack.js';
import { BATCH_HISTORY, PRODUCTION_PATH, QUEUE_EVENTS } from '../../data/incident-data.js';

export class MesTools {
  @Tool({
    name: 'get_batch_history',
    description: 'Retrieve batch genealogy including route, timestamps, yield, material tracing, and production status from the Manufacturing Execution System.',
    inputSchema: z.object({
      batch_id: z.string().describe('Batch identifier (e.g. B-2407-184)'),
    }),
  })
  async getBatchHistory(input: { batch_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('MES: Retrieving batch history', { batch_id: input.batch_id });

    if (input.batch_id === 'B-2407-184') {
      return BATCH_HISTORY;
    }
    return {
      source: 'mes',
      record_id: `batch:${input.batch_id}`,
      timestamp: new Date().toISOString(),
      batch_id: input.batch_id,
      error: 'Batch not found in system',
    };
  }

  @Tool({
    name: 'get_production_path',
    description: 'Retrieve the stage-by-stage manufacturing path with cycle times, process parameters, and anomaly flags for a batch.',
    inputSchema: z.object({
      batch_id: z.string().describe('Batch identifier'),
    }),
  })
  async getProductionPath(input: { batch_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('MES: Retrieving production path', { batch_id: input.batch_id });

    if (input.batch_id === 'B-2407-184') {
      return PRODUCTION_PATH;
    }
    return {
      source: 'mes',
      record_id: `path:${input.batch_id}`,
      timestamp: new Date().toISOString(),
      batch_id: input.batch_id,
      error: 'Production path not found',
    };
  }

  @Tool({
    name: 'get_queue_events',
    description: 'Retrieve queue delay events including wait times, expected wait, anomaly flags, and severity for a batch on a production line.',
    inputSchema: z.object({
      batch_id: z.string().describe('Batch identifier'),
      line_id: z.string().optional().describe('Production line identifier'),
    }),
  })
  async getQueueEvents(input: { batch_id: string; line_id?: string }, ctx: ExecutionContext) {
    ctx.logger.info('MES: Retrieving queue events', { batch_id: input.batch_id, line_id: input.line_id });

    if (input.batch_id === 'B-2407-184') {
      return { source: 'mes', record_id: `queue:${input.batch_id}`, events: QUEUE_EVENTS };
    }
    return { source: 'mes', record_id: `queue:${input.batch_id}`, events: [] };
  }
}
