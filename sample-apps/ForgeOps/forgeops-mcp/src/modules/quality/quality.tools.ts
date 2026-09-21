/**
 * ForgeOps — Quality MCP Server Module
 *
 * Tools:
 *   - get_defect_records: Defect classes, severity, measurements
 *   - get_inspection_results: Inspection pass/fail, quality scores, criteria
 */
import { ToolDecorator as Tool, ExecutionContext, z } from '../../nitrostack.js';
import { DEFECT_RECORDS, INSPECTION_RESULTS } from '../../data/incident-data.js';

export class QualityTools {
  @Tool({
    name: 'get_defect_records',
    description: 'Retrieve defect records with classes, severity, locations, measurements, and inspector notes from the quality management system.',
    inputSchema: z.object({
      batch_id: z.string().describe('Batch identifier'),
    }),
  })
  async getDefectRecords(input: { batch_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Quality: Retrieving defect records', { batch_id: input.batch_id });

    const defects = DEFECT_RECORDS[input.batch_id] || [];
    return {
      source: 'quality',
      record_id: `defects:${input.batch_id}`,
      timestamp: new Date().toISOString(),
      batch_id: input.batch_id,
      defects,
      total_count: defects.length,
    };
  }

  @Tool({
    name: 'get_inspection_results',
    description: 'Retrieve inspection results with quality scores, pass/fail criteria, and defect references.',
    inputSchema: z.object({
      batch_id: z.string().describe('Batch identifier'),
    }),
  })
  async getInspectionResults(input: { batch_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Quality: Retrieving inspection results', { batch_id: input.batch_id });

    const inspections = INSPECTION_RESULTS[input.batch_id] || [];
    return {
      source: 'quality',
      record_id: `inspections:${input.batch_id}`,
      timestamp: new Date().toISOString(),
      batch_id: input.batch_id,
      inspections,
    };
  }
}
