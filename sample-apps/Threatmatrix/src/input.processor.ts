/**
 * ThreatMatrix Universal Input Processor
 * Converts ANY user input (JSON, XML, CSV, Markdown, Code, PDF, Logs, URLs, IPs, QRs, Text)
 * into a normalized, unified text representation for the AI Agent.
 *
 * Pipeline: INPUT -> Format Detection -> Content Extraction -> Normalization -> Text Conversion
 */
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { logger } from './logger.js';

export type InputFormat =
  | 'JSON'
  | 'XML'
  | 'CSV'
  | 'MARKDOWN'
  | 'CODE'
  | 'LOGS'
  | 'PDF'
  | 'URL'
  | 'IP'
  | 'EMAIL'
  | 'HASH'
  | 'QR'
  | 'PLAIN_TEXT';

export interface ProcessedInput {
  format: InputFormat;
  rawInput: string;
  normalizedText: string;
  metadata: Record<string, unknown>;
}

export class UniversalInputProcessor {
  /**
   * Detect format of the raw input
   */
  public detectFormat(inputStr: string): InputFormat {
    const trimmed = inputStr.trim();

    // 1. JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'JSON';
      } catch {}
    }

    // 2. XML / HTML
    if (trimmed.startsWith('<') && trimmed.endsWith('>') && (trimmed.includes('</') || trimmed.includes('/>'))) {
      return 'XML';
    }

    // 3. URL
    if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
      return 'URL';
    }

    // 4. IP Address
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(trimmed)) {
      return 'IP';
    }

    // 5. PDF File Path
    if (trimmed.toLowerCase().endsWith('.pdf') || (fs.existsSync(trimmed) && trimmed.toLowerCase().endsWith('.pdf'))) {
      return 'PDF';
    }

    // 6. Hash (MD5, SHA1, SHA256)
    if (/^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$/.test(trimmed)) {
      return 'HASH';
    }

    // 7. Logs (containing timestamps and log levels)
    if (/(?:INFO|WARN|ERROR|DEBUG|FATAL|TRACE|\[\d{4}-\d{2}-\d{2})/i.test(trimmed) && trimmed.includes('\n')) {
      return 'LOGS';
    }

    // 8. CSV
    if (trimmed.includes(',') && trimmed.includes('\n') && !trimmed.includes('{')) {
      const lines = trimmed.split('\n');
      if (lines.length > 1 && lines[0].split(',').length > 1) {
        return 'CSV';
      }
    }

    // 9. Code (JS, TS, Python, C, Go, Java, Shell)
    if (
      /^(import|export|const|let|var|function|def|class|if|for|while|#include|package|select|insert|update|delete|curl|wget|bash|sh)\b/im.test(
        trimmed
      ) &&
      (trimmed.includes(';') || trimmed.includes('{') || trimmed.includes('def ') || trimmed.includes('=>'))
    ) {
      return 'CODE';
    }

    // 10. Markdown
    if (/^#|\n#|\*\*|```|\[.+\]\(.+\)/.test(trimmed)) {
      return 'MARKDOWN';
    }

    // 11. Email
    if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmed)) {
      return 'EMAIL';
    }

    return 'PLAIN_TEXT';
  }

  /**
   * Process raw input through format detection, content extraction, and text normalization.
   */
  public async process(rawInput: unknown): Promise<ProcessedInput> {
    const inputStr = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput, null, 2);
    const format = this.detectFormat(inputStr);
    logger.info('Input processing started', { format, length: inputStr.length });

    let normalizedText = '';
    const metadata: Record<string, unknown> = { detectedFormat: format, originalLength: inputStr.length };

    switch (format) {
      case 'JSON': {
        try {
          const parsed = typeof rawInput === 'object' && rawInput !== null ? rawInput : JSON.parse(inputStr);
          normalizedText = this.flattenJsonToText(parsed);
          metadata.jsonKeys = Object.keys(parsed);
        } catch {
          normalizedText = `User provided JSON data:\n${inputStr}`;
        }
        break;
      }

      case 'XML': {
        const textContent = inputStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const tags = Array.from(new Set(inputStr.match(/<([a-zA-Z0-9]+)/g) || [])).map((t) => t.slice(1));
        normalizedText = `User provided XML/HTML markup:\n- Tags detected: ${tags.join(', ')}\n- Text Content: ${textContent}`;
        metadata.tags = tags;
        break;
      }

      case 'CSV': {
        const rows = inputStr.trim().split('\n');
        const headers = rows[0].split(',').map((h) => h.trim());
        const sampleRows = rows.slice(1, 6).map((r) => r.split(',').map((c) => c.trim()).join(' | '));
        normalizedText = `User provided CSV structured data (${rows.length - 1} rows):\nHeaders: ${headers.join(', ')}\nSample Rows:\n${sampleRows.join('\n')}`;
        metadata.rowCount = rows.length - 1;
        metadata.headers = headers;
        break;
      }

      case 'PDF': {
        const filePath = inputStr.trim();
        if (fs.existsSync(filePath)) {
          try {
            const buf = fs.readFileSync(filePath);
            const parsed = await pdfParse(buf);
            normalizedText = `User provided PDF Document (${parsed.numpages} pages):\nFile Path: ${filePath}\nExtracted Document Text:\n${parsed.text.slice(0, 4000)}`;
            metadata.pages = parsed.numpages;
            metadata.pdfTextLength = parsed.text.length;
          } catch (e: any) {
            normalizedText = `User provided PDF File Path: ${filePath} (Error reading file: ${e.message})`;
          }
        } else {
          normalizedText = `User provided PDF File Reference: ${filePath}`;
        }
        break;
      }

      case 'CODE': {
        const lineCount = inputStr.split('\n').length;
        normalizedText = `User provided Source Code snippet (${lineCount} lines):\n\`\`\`\n${inputStr}\n\`\`\``;
        metadata.lineCount = lineCount;
        break;
      }

      case 'LOGS': {
        const logLines = inputStr.split('\n');
        const errors = logLines.filter((l) => /ERROR|FATAL|EXCEPTION/i.test(l));
        normalizedText = `User provided System Logs (${logLines.length} lines, ${errors.length} error entries):\nFull Logs:\n${inputStr}`;
        metadata.totalLines = logLines.length;
        metadata.errorLinesCount = errors.length;
        break;
      }

      case 'URL': {
        normalizedText = `User provided Target URL for investigation: ${inputStr.trim()}`;
        metadata.targetUrl = inputStr.trim();
        break;
      }

      case 'IP': {
        normalizedText = `User provided Host IP Address for investigation: ${inputStr.trim()}`;
        metadata.targetIp = inputStr.trim();
        break;
      }

      case 'MARKDOWN':
      case 'EMAIL':
      case 'HASH':
      case 'QR':
      case 'PLAIN_TEXT':
      default: {
        normalizedText = `User provided input content (${format}):\n${inputStr}`;
        break;
      }
    }

    logger.info('Input normalized successfully', { format, normalizedLength: normalizedText.length });

    return {
      format,
      rawInput: inputStr,
      normalizedText,
      metadata,
    };
  }

  /**
   * Helper: Flatten JSON objects/arrays into clean human-readable text key-values
   */
  private flattenJsonToText(obj: any, prefix = ''): string {
    if (typeof obj !== 'object' || obj === null) {
      return `${prefix}: ${String(obj)}`;
    }

    const lines: string[] = [];
    if (Array.isArray(obj)) {
      lines.push(`${prefix || 'Data List'} (${obj.length} items):`);
      obj.forEach((item, index) => {
        lines.push(this.flattenJsonToText(item, `  - Item ${index + 1}`));
      });
    } else {
      if (prefix) lines.push(`${prefix}:`);
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          lines.push(this.flattenJsonToText(value, `  ${key}`));
        } else {
          lines.push(`  - ${key}: ${String(value)}`);
        }
      }
    }
    return lines.join('\n');
  }
}
