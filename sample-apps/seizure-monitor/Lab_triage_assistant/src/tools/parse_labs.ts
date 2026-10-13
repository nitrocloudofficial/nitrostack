/**
 * Parse Labs Tool
 * 
 * Parses raw lab report text and extracts structured test results.
 * Input: raw lab report text (one test per line, colon-separated format)
 * Output: structured test results with canonical names, values, and units
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { parseLabReport } from '../parser.js';

// Input schema
const ParseLabsInputSchema = z.object({
  reportText: z.string().describe('Raw lab report text, one test per line (format: "TestName : value unit")')
});

// Output schema
const ParsedTestSchema = z.object({
  testName: z.string().describe('Canonical test name (e.g., "Hemoglobin", "ALT", "TSH")'),
  value: z.union([z.string(), z.number()]).describe('Test result value'),
  unit: z.string().describe('Unit of measurement (e.g., "g/dL", "U/L")')
});

const ParseLabsOutputSchema = z.object({
  tests: z.array(ParsedTestSchema).describe('Parsed lab tests'),
  unparsedLines: z.array(z.string()).describe('Lines that could not be parsed (for transparency)')
});

export class ParseLabsTools {
  @Tool({
    name: 'parse_labs',
    description: 'Parse raw lab report text and extract structured test results. Recognizes common test names and aliases (e.g., "SGPT" → "ALT", "Hb" → "Hemoglobin").',
    inputSchema: ParseLabsInputSchema,
    examples: {
      request: {
        reportText: 'Hemoglobin : 13.5 g/dL\nWBC : 7.2 K/uL\nSGPT : 45 U/L'
      },
      response: {
        tests: [
          { testName: 'Hemoglobin', value: 13.5, unit: 'g/dL' },
          { testName: 'WBC', value: 7.2, unit: 'K/uL' },
          { testName: 'ALT', value: 45, unit: 'U/L' }
        ],
        unparsedLines: []
      }
    }
  })
  async parseLabs(input: z.infer<typeof ParseLabsInputSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Parsing lab report', { reportLength: input.reportText.length });
    const result = parseLabReport(input.reportText);
    ctx.logger.info('Lab report parsed', { testCount: result.tests.length, unparsedCount: result.unparsedLines.length });
    return result;
  }
}
