/**
 * OCR Report Image Tool
 *
 * Accepts a photographed or scanned lab report image and extracts raw
 * text from it via tesseract.js, running entirely server-side (no
 * external OCR API, no API key). The extracted text is meant to be fed
 * straight into parse_labs — it uses the same "TestName : value unit"
 * report format the parser already expects, just messier since it came
 * from OCR rather than being typed by hand.
 */

import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { extractTextFromImage } from '../ocr.js';

const OcrReportImageInputSchema = z.object({
  file_name: z.string().describe('Name of the uploaded image file, e.g. "report.jpg"'),
  file_type: z.string().describe('MIME type of the uploaded image, e.g. "image/jpeg"'),
  file_content: z.string().describe('Base64-encoded image content (data URL or raw base64)')
});

const OcrReportImageOutputSchema = z.object({
  extractedText: z.string().describe('Raw text extracted from the image, one line per detected row — feed this into parse_labs as reportText'),
  confidence: z.number().describe('OCR confidence score from 0-100; lower scores mean the photo may need to be retaken or verified manually')
});

export class OcrReportImageTools {
  @Tool({
    name: 'ocr_report_image',
    description: 'Extract raw text from a photographed or scanned lab report image via OCR. Feed the result into parse_labs to get structured test data.',
    inputSchema: OcrReportImageInputSchema,
    outputSchema: OcrReportImageOutputSchema,
    examples: {
      request: {
        file_name: 'report.jpg',
        file_type: 'image/jpeg',
        file_content: '<base64-encoded-image-data>'
      },
      response: {
        extractedText: 'Hemoglobin : 13.5 g/dL\nCreatinine : 1.5 mg/dL\nFastingGlucose : 250 mg/dL',
        confidence: 91.4
      }
    }
  })
  async ocrReportImage(
    input: z.infer<typeof OcrReportImageInputSchema>,
    ctx: ExecutionContext
  ): Promise<z.infer<typeof OcrReportImageOutputSchema>> {
    if (!input.file_type.startsWith('image/')) {
      throw new Error(`Expected an image file, got file_type "${input.file_type}"`);
    }

    ctx.logger.info(`Running OCR on uploaded image: ${input.file_name} (${input.file_type})`);
    const result = await extractTextFromImage(input.file_content);
    ctx.logger.info(`OCR complete for ${input.file_name}: confidence=${result.confidence}`);

    return {
      extractedText: result.text,
      confidence: result.confidence
    };
  }
}
