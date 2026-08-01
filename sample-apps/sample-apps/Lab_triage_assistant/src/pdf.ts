/**
 * PDF Utility
 *
 * Extracts raw text from an uploaded PDF lab report using pdf-parse
 * (pure JS, no external API or native binary required).
 */

// Import the internal implementation directly, not the package root.
// pdf-parse's index.js has a debug-mode check (`!module.parent`) that's meant
// to only run when the file is executed directly, but under ESM `module.parent`
// is always undefined, so it always fires and tries to read a fixture file that
// isn't shipped with the npm package, crashing on import. lib/pdf-parse.js is
// the actual implementation without that wrapper.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export interface PdfExtractResult {
  text: string;
  pageCount: number;
}

/**
 * Decode a base64 file payload, accepting either a data URL
 * ("data:application/pdf;base64,...") or a raw base64 string.
 */
function decodeBase64Pdf(content: string): Buffer {
  const matches = content.match(/^data:([A-Za-z0-9-+/.]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return Buffer.from(matches[2], 'base64');
  }
  return Buffer.from(content, 'base64');
}

/**
 * Extract text from a base64-encoded PDF and return it along with the page count.
 */
export async function extractTextFromPdf(base64Content: string): Promise<PdfExtractResult> {
  const buffer = decodeBase64Pdf(base64Content);
  const result = await pdfParse(buffer);
  return { text: result.text.trim(), pageCount: result.numpages };
}
