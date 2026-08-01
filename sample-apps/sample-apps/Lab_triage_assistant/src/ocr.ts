/**
 * OCR Utility
 *
 * Extracts raw text from a photographed/scanned lab report image using
 * tesseract.js (pure JS/WASM, no external API or native binary required).
 *
 * Note: tesseract.js downloads its English trained-data file on first use
 * and caches it locally afterward — the very first OCR call needs network
 * access and is noticeably slower than subsequent ones.
 */

import { createWorker } from 'tesseract.js';

export interface OcrResult {
  text: string;
  confidence: number;
}

/**
 * Decode a base64 image payload, accepting either a data URL
 * ("data:image/png;base64,...") or a raw base64 string.
 */
function decodeBase64Image(content: string): Buffer {
  const matches = content.match(/^data:([A-Za-z0-9-+/.]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return Buffer.from(matches[2], 'base64');
  }
  return Buffer.from(content, 'base64');
}

/**
 * Run OCR on a base64-encoded image and return the extracted text
 * along with tesseract's overall confidence score (0-100).
 */
export async function extractTextFromImage(base64Content: string): Promise<OcrResult> {
  const buffer = decodeBase64Image(base64Content);
  const worker = await createWorker('eng');

  try {
    const { data } = await worker.recognize(buffer);
    return { text: data.text.trim(), confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
