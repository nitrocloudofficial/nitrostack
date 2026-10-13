/**
 * Sentinel Gateway — Injection Detection Service
 * 
 * Scans tool descriptions and results for hidden instructions,
 * prompt injection patterns, and suspicious content.
 */

import { Injectable } from '@nitrostack/core';
import type { InjectionScanResult } from '../shared/types.js';

// Suspicious patterns that indicate hidden instructions
const INJECTION_PATTERNS = [
  { pattern: /IMPORTANT\s*:/i, name: 'IMPORTANT directive', weight: 0.8 },
  { pattern: /IGNORE\s+(ALL\s+)?PREVIOUS/i, name: 'Ignore-previous attack', weight: 0.95 },
  { pattern: /SYSTEM\s*:/i, name: 'System prompt injection', weight: 0.85 },
  { pattern: /<hidden>/i, name: 'Hidden tag', weight: 0.9 },
  { pattern: /<!--.*instruction/i, name: 'HTML comment injection', weight: 0.85 },
  { pattern: /\bBCC\b/i, name: 'BCC directive (email exfil)', weight: 0.7 },
  { pattern: /\balways\s+(send|forward|copy|include|add)/i, name: 'Always-do directive', weight: 0.75 },
  { pattern: /\bsecretly\b/i, name: 'Secrecy marker', weight: 0.9 },
  { pattern: /\bdo\s+not\s+(tell|inform|mention|disclose)/i, name: 'Non-disclosure directive', weight: 0.9 },
  { pattern: /\boverride\b.*\b(instruction|policy|rule)/i, name: 'Override attempt', weight: 0.85 },
  { pattern: /\bexfiltrat/i, name: 'Exfiltration marker', weight: 0.95 },
  { pattern: /base64[:\s]/i, name: 'Base64 encoding reference', weight: 0.5 },
  { pattern: /\bact\s+as\b/i, name: 'Role assumption', weight: 0.6 },
  { pattern: /\bpretend\b/i, name: 'Pretend directive', weight: 0.7 },
  { pattern: /\bregardless\s+of/i, name: 'Bypass qualifier', weight: 0.65 },
  { pattern: /\bfor\s+compliance\s+purposes\b/i, name: 'Fake compliance justification', weight: 0.8 },
  { pattern: /\baudit\s+purposes\b/i, name: 'Fake audit justification', weight: 0.7 },
];

@Injectable()
export class InjectionService {
  /**
   * Scan text for injection patterns.
   * Returns a score (0.0 = clean, 1.0 = definitely injected) and matched patterns.
   */
  scanText(text: string): InjectionScanResult {
    if (!text || text.trim().length === 0) {
      return { clean: true, score: 0, patterns: [], details: 'Empty text — no scan needed' };
    }

    const matchedPatterns: string[] = [];
    let maxWeight = 0;

    for (const { pattern, name, weight } of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        matchedPatterns.push(name);
        maxWeight = Math.max(maxWeight, weight);
      }
    }

    // Length anomaly check: if description is suspiciously long (> 500 chars),
    // it might contain hidden instructions
    if (text.length > 500) {
      matchedPatterns.push('Unusually long description');
      maxWeight = Math.max(maxWeight, 0.4);
    }

    // Check for Unicode homoglyphs (characters that look like ASCII but aren't)
    const hasHomoglyphs = /[^\x00-\x7F]/.test(text) && /[a-zA-Z]/.test(text);
    if (hasHomoglyphs) {
      // Check if non-ASCII is mixed into what looks like English text
      const nonAsciiRatio = (text.match(/[^\x00-\x7F]/g) || []).length / text.length;
      if (nonAsciiRatio > 0 && nonAsciiRatio < 0.3) {
        matchedPatterns.push('Possible Unicode homoglyph attack');
        maxWeight = Math.max(maxWeight, 0.7);
      }
    }

    const clean = matchedPatterns.length === 0;
    const score = maxWeight;

    return {
      clean,
      score,
      patterns: matchedPatterns,
      details: clean
        ? '✅ No injection patterns detected'
        : `⚠️ ${matchedPatterns.length} suspicious pattern(s) found: ${matchedPatterns.join(', ')}`,
    };
  }

  /**
   * Compare two descriptions and detect if the new one has injection patterns
   * that the old one didn't.
   */
  scanDrift(oldDescription: string, newDescription: string): InjectionScanResult {
    const oldScan = this.scanText(oldDescription);
    const newScan = this.scanText(newDescription);

    // If the new description has patterns the old one didn't, that's suspicious
    const newPatterns = newScan.patterns.filter((p) => !oldScan.patterns.includes(p));

    if (newPatterns.length > 0) {
      return {
        clean: false,
        score: newScan.score,
        patterns: newPatterns,
        details: `🛑 New injection patterns detected after description change: ${newPatterns.join(', ')}`,
      };
    }

    return newScan;
  }
}
