/**
 * Clinical Copilot MCP Server - Helper Utilities
 *
 * PHI sanitization, base64 payload decoding, and date calculation helpers.
 */

import * as fs from 'fs';
import * as path from 'path';

export function sanitizePhiText(rawText: string): string {
  // TODO: Implement Regex / Named Entity Recognition (NER) to redact SSN, Phone, Address
  return rawText;
}

export function decodeBase64File(content: string): Buffer {
  if (typeof content === 'string' && content.trim()) {
    const trimmed = content.trim();
    // 1. Check if content is a valid local file path
    const resolvedPath = path.isAbsolute(trimmed) ? trimmed : path.resolve(process.cwd(), trimmed);
    if (fs.existsSync(resolvedPath)) {
      return fs.readFileSync(resolvedPath);
    }
    // 2. Check for data URL format
    const matches = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      return Buffer.from(matches[2], 'base64');
    }
  }
  return Buffer.from(content, 'base64');
}
