/**
 * Flag Critical Tool
 *
 * Classifies parsed lab test results against reference ranges.
 * Input: output from parse_labs tool
 * Output: flagged results with status (NORMAL, BORDERLINE, CRITICAL) and overall triage level
 */

import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { getReferenceRange } from '../resources/reference-ranges.js';

/**
 * Triage status levels
 */
export type TriageStatus = 'NORMAL' | 'BORDERLINE' | 'CRITICAL';

/**
 * Flagged test result
 */
export interface FlaggedTest {
  testName: string;
  value: number;
  unit: string;
  status: TriageStatus;
  panel: string;
  normalRange?: { min: number; max: number };
  criticalRange?: { min: number; max: number };
}

/**
 * Flag critical output
 */
export interface FlagCriticalOutput {
  flagged: FlaggedTest[];
  overallTriage: TriageStatus;
  summary: {
    normalCount: number;
    borderlineCount: number;
    criticalCount: number;
  };
}

/**
 * Input schema: parsed tests from parse_labs
 */
const FlagCriticalInputSchema = z.object({
  tests: z.array(
    z.object({
      testName: z.string().describe('Canonical test name (e.g., Hemoglobin, Creatinine)'),
      value: z.number().describe('Numeric test value'),
      unit: z.string().describe('Unit of measurement (e.g., g/dL, mg/dL)')
    })
  ).describe('Array of parsed lab tests from parse_labs tool')
});

/**
 * Output schema
 */
const FlagCriticalOutputSchema = z.object({
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
  })
});

/**
 * Classify a single test value against reference ranges
 */
function classifyTest(
  testName: string,
  value: number,
  unit: string
): { status: TriageStatus; panel: string; normalRange?: { min: number; max: number }; criticalRange?: { min: number; max: number } } {
  const refRange = getReferenceRange(testName, unit);

  if (!refRange) {
    // Unknown test — default to NORMAL (cannot classify)
    return {
      status: 'NORMAL',
      panel: 'Unknown'
    };
  }

  const { normalRange, criticalRange } = refRange;

  // Check critical range first (wider bounds)
  if (value < criticalRange.min || value > criticalRange.max) {
    return {
      status: 'CRITICAL',
      panel: refRange.panel,
      normalRange,
      criticalRange
    };
  }

  // Check normal range
  if (value >= normalRange.min && value <= normalRange.max) {
    return {
      status: 'NORMAL',
      panel: refRange.panel,
      normalRange,
      criticalRange
    };
  }

  // Between normal and critical
  return {
    status: 'BORDERLINE',
    panel: refRange.panel,
    normalRange,
    criticalRange
  };
}

/**
 * Determine worst triage status
 */
function getOverallTriage(statuses: TriageStatus[]): TriageStatus {
  if (statuses.includes('CRITICAL')) return 'CRITICAL';
  if (statuses.includes('BORDERLINE')) return 'BORDERLINE';
  return 'NORMAL';
}

/**
 * Flag Critical Tool
 *
 * Classifies each test result as NORMAL, BORDERLINE, or CRITICAL
 * based on reference ranges. Returns overall triage level.
 */
export class FlagCriticalTools {
  @Tool({
    name: 'flag_critical',
    description: 'Classify lab test results against reference ranges. Returns status (NORMAL/BORDERLINE/CRITICAL) for each test and overall triage level.',
    inputSchema: FlagCriticalInputSchema,
    outputSchema: FlagCriticalOutputSchema,
    examples: {
      request: {
        tests: [
          { testName: 'Hemoglobin', value: 13.5, unit: 'g/dL' },
          { testName: 'Creatinine', value: 1.5, unit: 'mg/dL' },
          { testName: 'FastingGlucose', value: 250, unit: 'mg/dL' }
        ]
      },
      response: {
        flagged: [
          {
            testName: 'Hemoglobin',
            value: 13.5,
            unit: 'g/dL',
            status: 'NORMAL',
            panel: 'CBC',
            normalRange: { min: 12.0, max: 17.5 },
            criticalRange: { min: 7.0, max: 20.0 }
          },
          {
            testName: 'Creatinine',
            value: 1.5,
            unit: 'mg/dL',
            status: 'BORDERLINE',
            panel: 'KFT',
            normalRange: { min: 0.7, max: 1.3 },
            criticalRange: { min: 0.4, max: 10.0 }
          },
          {
            testName: 'FastingGlucose',
            value: 250,
            unit: 'mg/dL',
            status: 'CRITICAL',
            panel: 'Glucose',
            normalRange: { min: 70.0, max: 100.0 },
            criticalRange: { min: 40.0, max: 500.0 }
          }
        ],
        overallTriage: 'CRITICAL',
        summary: {
          normalCount: 1,
          borderlineCount: 1,
          criticalCount: 1
        }
      }
    }
  })
  @Widget('triage-panel')
  async flagCritical(
    input: z.infer<typeof FlagCriticalInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof FlagCriticalOutputSchema>> {
    ctx.logger.info(`Flagging ${input.tests.length} tests against reference ranges`);

    const flagged: FlaggedTest[] = [];
    const statuses: TriageStatus[] = [];

    for (const test of input.tests) {
      const classification = classifyTest(test.testName, test.value, test.unit);
      const flaggedTest: FlaggedTest = {
        testName: test.testName,
        value: test.value,
        unit: test.unit,
        status: classification.status,
        panel: classification.panel,
        normalRange: classification.normalRange,
        criticalRange: classification.criticalRange
      };

      flagged.push(flaggedTest);
      statuses.push(classification.status);

      ctx.logger.info(
        `${test.testName} (${test.value} ${test.unit}): ${classification.status}`
      );
    }

    const overallTriage = getOverallTriage(statuses);

    const summary = {
      normalCount: statuses.filter(s => s === 'NORMAL').length,
      borderlineCount: statuses.filter(s => s === 'BORDERLINE').length,
      criticalCount: statuses.filter(s => s === 'CRITICAL').length
    };

    ctx.logger.info(`Overall triage: ${overallTriage} (${summary.criticalCount} critical, ${summary.borderlineCount} borderline, ${summary.normalCount} normal)`);

    return {
      flagged,
      overallTriage,
      summary
    };
  }
}
