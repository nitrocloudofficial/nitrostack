/**
 * Parse PDF Report Tool
 *
 * Accepts an uploaded PDF lab report and extracts raw text from it via
 * pdf-parse, running entirely server-side (no external API, no API key).
 * The extracted text is meant to be fed straight into parse_labs — it
 * uses the same "TestName : value unit" report format the parser expects.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { extractTextFromPdf } from '../pdf.js';

const ParsePdfReportInputSchema = z.object({
  file_name: z.string().describe('Name of the uploaded PDF file, e.g. "report.pdf"'),
  file_type: z.string().describe('MIME type of the uploaded file, expected "application/pdf"'),
  file_content: z.string().describe('Base64-encoded PDF content (data URL or raw base64)')
});

const ParsePdfReportOutputSchema = z.object({
  extractedText: z.string().describe('Raw text extracted from the PDF, feed this into parse_labs as reportText'),
  pageCount: z.number().describe('Number of pages in the PDF')
});

export class ParsePdfReportTools {
  @Tool({
    name: 'parse_pdf_report',
    description: 'Extract raw text from an uploaded PDF lab report. Feed the result into parse_labs to get structured test data.',
    inputSchema: ParsePdfReportInputSchema,
    outputSchema: ParsePdfReportOutputSchema,
    examples: {
      request: {
        file_name: 'report.pdf',
        file_type: 'application/pdf',
        file_content: '<base64-encoded-pdf-data>'
      },
      response: {
        extractedText: 'Hemoglobin : 13.5 g/dL\nCreatinine : 1.5 mg/dL\nFastingGlucose : 250 mg/dL',
        pageCount: 1
      }
    }
  })
  async parsePdfReport(
    input: z.infer<typeof ParsePdfReportInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof ParsePdfReportOutputSchema>> {
    if (input.file_type !== 'application/pdf') {
      throw new Error(`Expected a PDF file, got file_type "${input.file_type}"`);
    }

    ctx.logger.info(`Extracting text from uploaded PDF: ${input.file_name}`);
    const result = await extractTextFromPdf(input.file_content);
    ctx.logger.info(`PDF extraction complete for ${input.file_name}: pageCount=${result.pageCount}`);

    return {
      extractedText: result.text,
      pageCount: result.pageCount
    };
  }
}
