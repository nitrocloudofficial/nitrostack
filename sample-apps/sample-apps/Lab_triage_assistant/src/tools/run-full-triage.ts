/**
 * Run Full Triage Tool
 *
 * Orchestrates the full pipeline — parse_labs → flag_critical →
 * route_specialist → share_summary — in a single call, so a client only
 * needs to send the raw report text once instead of planning four
 * sequential tool calls itself.
 *
 * Runs as an optional task so NitroStudio (or any MCP client) can track
 * progress across the four stages instead of waiting on one opaque call.
 */

import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { ParseLabsTools } from './parse_labs.js';
import { FlagCriticalTools } from './flag-critical.js';
import { RouteSpecialistTools } from './route-specialist.js';
import { ShareSummaryTools } from './share-summary.js';

const RunFullTriageInputSchema = z.object({
  reportText: z.string().describe('Raw lab report text, one test per line (format: "TestName : value unit")')
});

const RunFullTriageOutputSchema = z.object({
  tests: z.array(z.object({ testName: z.string(), value: z.number(), unit: z.string() })),
  unparsedLines: z.array(z.string()),
  flagged: z.array(
    z.object({
      testName: z.string(),
      value: z.number(),
      unit: z.string(),
      status: z.enum(['NORMAL', 'BORDERLINE', 'CRITICAL']),
      panel: z.string(),
      normalRange: z.object({ min: z.number(), max: z.number() }).optional(),
      criticalRange: z.object({ min: z.number(), max: z.number() }).optional()
    })
  ),
  overallTriage: z.enum(['NORMAL', 'BORDERLINE', 'CRITICAL']),
  summary: z.object({
    normalCount: z.number(),
    borderlineCount: z.number(),
    criticalCount: z.number()
  }),
  routing: z.array(
    z.object({
      specialist: z.string(),
      urgency: z.enum(['SEE TODAY', 'ROUTINE FOLLOW-UP']),
      reason: z.string()
    })
  ),
  summaryText: z.string()
});

const parseLabsTools = new ParseLabsTools();
const flagCriticalTools = new FlagCriticalTools();
const routeSpecialistTools = new RouteSpecialistTools();
const shareSummaryTools = new ShareSummaryTools();

export class RunFullTriageTools {
  @Tool({
    name: 'run_full_triage',
    description: 'Run the full triage pipeline on raw lab report text in one call: parse, classify, route to specialists, and produce a shareable summary.',
    inputSchema: RunFullTriageInputSchema,
    outputSchema: RunFullTriageOutputSchema,
    taskSupport: 'optional',
    examples: {
      request: {
        reportText: 'Hemoglobin : 13.5 g/dL\nCreatinine : 1.5 mg/dL\nFastingGlucose : 250 mg/dL'
      },
      response: {
        tests: [
          { testName: 'Hemoglobin', value: 13.5, unit: 'g/dL' },
          { testName: 'Creatinine', value: 1.5, unit: 'mg/dL' },
          { testName: 'FastingGlucose', value: 250, unit: 'mg/dL' }
        ],
        unparsedLines: [],
        flagged: [
          { testName: 'Hemoglobin', value: 13.5, unit: 'g/dL', status: 'NORMAL', panel: 'CBC' },
          { testName: 'Creatinine', value: 1.5, unit: 'mg/dL', status: 'BORDERLINE', panel: 'KFT' },
          { testName: 'FastingGlucose', value: 250, unit: 'mg/dL', status: 'CRITICAL', panel: 'Glucose' }
        ],
        overallTriage: 'CRITICAL',
        summary: { normalCount: 1, borderlineCount: 1, criticalCount: 1 },
        routing: [
          { specialist: 'Nephrologist', urgency: 'ROUTINE FOLLOW-UP', reason: 'Creatinine is borderline (1.5 mg/dL)' },
          { specialist: 'Endocrinologist', urgency: 'SEE TODAY', reason: 'FastingGlucose is critical (250 mg/dL)' }
        ],
        summaryText: '*Lab Result Summary — CRITICAL*\n...'
      }
    }
  })
  @Widget('triage-panel')
  async runFullTriage(
    input: z.infer<typeof RunFullTriageInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof RunFullTriageOutputSchema>> {
    ctx.task?.updateProgress('Parsing lab report...');
    const parsed = await parseLabsTools.parseLabs({ reportText: input.reportText }, ctx);
    const numericTests = parsed.tests.map((t) => ({ testName: t.testName, value: Number(t.value), unit: t.unit }));

    ctx.task?.throwIfCancelled();
    ctx.task?.updateProgress('Classifying results against reference ranges...');
    const flagResult = await flagCriticalTools.flagCritical({ tests: numericTests }, ctx);

    ctx.task?.throwIfCancelled();
    ctx.task?.updateProgress('Routing abnormal results to specialists...');
    const routingResult = await routeSpecialistTools.routeSpecialist({ flagged: flagResult.flagged }, ctx);

    ctx.task?.throwIfCancelled();
    ctx.task?.updateProgress('Building shareable summary...');
    const summaryResult = await shareSummaryTools.shareSummary(
      { flagged: flagResult.flagged, overallTriage: flagResult.overallTriage, routing: routingResult.routing },
      ctx
    );

    ctx.logger.info(`run_full_triage complete: overallTriage=${flagResult.overallTriage}`);

    return {
      tests: numericTests,
      unparsedLines: parsed.unparsedLines,
      flagged: flagResult.flagged,
      overallTriage: flagResult.overallTriage,
      summary: flagResult.summary,
      routing: routingResult.routing,
      summaryText: summaryResult.summaryText
    };
  }
}
