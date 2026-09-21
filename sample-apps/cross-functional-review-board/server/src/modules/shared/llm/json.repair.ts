import { z } from 'zod';

/**
 * Strips markdown code fences and extracts JSON objects/arrays if preamble/postamble prose exists.
 */
export function stripMarkdown(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  
  // Remove markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // Extract JSON payload if preamble prose precedes the first '{' or '['
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx > 0) {
    cleaned = cleaned.slice(startIdx);
  }

  // Trim postamble prose after the last closing '}' or ']'
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const endIdx = Math.max(lastBrace, lastBracket);
  if (endIdx !== -1 && endIdx < cleaned.length - 1) {
    cleaned = cleaned.slice(0, endIdx + 1);
  }

  return cleaned.trim();
}

/**
 * Repairs common JSON formatting flaws emitted by LLMs:
 * - Trailing commas before closing brackets or braces
 * - Unescaped newlines inside quote strings
 * - Missing closing brackets or braces
 */
export function repairJson(raw: string): string {
  let cleaned = stripMarkdown(raw);
  if (!cleaned) return '{}';

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // Fix unescaped newlines inside strings
  cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  });

  // Balance brackets/braces if truncated
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces = Math.max(0, openBraces - 1);
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
    }
  }

  if (inString) cleaned += '"';
  while (openBrackets > 0) {
    cleaned += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    cleaned += '}';
    openBraces--;
  }

  return cleaned;
}

/**
 * Strips markdown, repairs JSON formatting flaws, parses JSON, and validates with Zod schema.
 */
export function parseAndValidate<T>(raw: string, schema: z.ZodSchema<T>): T {
  const repaired = repairJson(raw);
  const parsed = JSON.parse(repaired);
  return schema.parse(parsed);
}
