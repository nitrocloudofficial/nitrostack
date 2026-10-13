/**
 * Banned phrases table for ClinicalSafetyInterceptor overreach rewriting.
 * Prevents diagnostic overreach and medical prescription language.
 */

export interface BannedPhraseReplacement {
  pattern: RegExp;
  replacement: string | ((substring: string, ...args: any[]) => string);
}

export const BANNED_PHRASES: BannedPhraseReplacement[] = [
  {
    pattern: /\byou are diagnosed with\b/gi,
    replacement: 'discuss the possibility of',
  },
  {
    pattern: /\bthis (is|means you have)\b/gi,
    replacement: 'this could indicate',
  },
  {
    pattern: /\byou have ([\p{L}\p{N}\s'/-]+?)(?=[.,;!?]|$)/giu,
    replacement: 'your symptoms may be associated with $1',
  },
  {
    pattern: /\b(definitely|diagnosed|diagnosis confirmed)\b/gi,
    replacement: 'evaluated by a clinician',
  },
  {
    pattern: /\byou should take\s+(\d+(?:\.\d+)?\s?(?:mg|g|mcg|µg|ml|units?))\b/gi,
    replacement: 'dosing must be confirmed by a clinician or pharmacist (reference: $1)',
  },
];

/** Recursively traverses an object/array and rewrites string values containing banned phrases. */
export function rewriteBannedPhrases(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    let rewritten = data;
    for (const rule of BANNED_PHRASES) {
      rewritten = rewritten.replace(rule.pattern, rule.replacement as any);
    }
    return rewritten;
  }

  if (Array.isArray(data)) {
    return data.map((item) => rewriteBannedPhrases(item));
  }

  if (typeof data === 'object') {
    const obj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      obj[key] = rewriteBannedPhrases(value);
    }
    return obj;
  }

  return data;
}
