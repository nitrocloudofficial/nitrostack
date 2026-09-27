import { Injectable } from '@nitrostack/core';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParseResult {
  text: string;
  pageCount: number;
  /** How the text was obtained — useful for flagging low-confidence extractions. */
  source: 'pdf' | 'docx' | 'text';
  /** True when extraction produced suspiciously little text per page. */
  lowTextDensity: boolean;
}

/** Below this many characters per page, a PDF is probably a scan. */
const SCAN_SUSPICION_THRESHOLD = 100;

@Injectable()
export class ParserService {
  async parse(url: string, filename: string): Promise<ParseResult> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch document from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const lower = filename.toLowerCase();

    if (lower.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      const text = this.normalize(data.text);
      const pageCount = data.numpages || 1;
      return {
        text,
        pageCount,
        source: 'pdf',
        lowTextDensity: text.length / pageCount < SCAN_SUSPICION_THRESHOLD
      };
    }

    if (lower.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      const text = this.normalize(result.value);
      // DOCX has no fixed pagination; estimate for display purposes only.
      return {
        text,
        pageCount: Math.max(1, Math.ceil(text.length / 3000)),
        source: 'docx',
        lowTextDensity: text.trim().length === 0
      };
    }

    const text = this.normalize(buffer.toString('utf-8'));
    return {
      text,
      pageCount: Math.max(1, Math.ceil(text.length / 3000)),
      source: 'text',
      lowTextDensity: text.trim().length === 0
    };
  }

  /**
   * Repair the two artefacts that most often break clause splitting downstream:
   * hyphenated line-wraps, and headings that PDF extraction runs into the
   * previous paragraph. Blank-line paragraph breaks are preserved, because the
   * graph builder's heuristic fallback splits on clause headings.
   */
  private normalize(raw: string): string {
    return raw
      .replace(/\r\n?/g, '\n')
      // de-hyphenate words split across a line break
      .replace(/(\w)-\n(\w)/g, '$1$2')
      // force a break before a numbered or titled clause heading
      .replace(/([^\n])\n(?=\s*(?:ARTICLE|Article|SECTION|Section)\s+\d+)/g, '$1\n\n')
      .replace(/([^\n])\n(?=\s*\d+(?:\.\d+)*\.?\s+[A-Z])/g, '$1\n\n')
      // collapse runs of blank lines, but keep the paragraph break
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
}
