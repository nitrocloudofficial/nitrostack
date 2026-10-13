/**
 * EmergencyDetectionGuard — scans clinical input for emergency red-flag terms.
 * It never blocks a request; it annotates the execution context so the safety
 * interceptor can escalate the response.
 */
import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';
import { loadDataJson } from '../data/load-json.js';

const redFlagData = loadDataJson<{ emergency_terms?: unknown }>('red-flag-rules.json');

if (!Array.isArray(redFlagData.emergency_terms)) {
  throw new Error(
    '[EmergencyDetectionGuard] Fatal: red-flag-rules.json must contain an emergency_terms array.',
  );
}

const EMERGENCY_TERMS = [...new Set(
  redFlagData.emergency_terms.filter(
    (term): term is string => typeof term === 'string' && term.trim().length > 0,
  ),
)].map((term) => term.trim().toLowerCase());

if (EMERGENCY_TERMS.length === 0) {
  throw new Error(
    '[EmergencyDetectionGuard] Fatal: red-flag-rules.json contains no usable emergency terms.',
  );
}

const EMERGENCY_PATTERNS = EMERGENCY_TERMS.map((term) => ({
  term,
  pattern: new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i'),
}));

function collectStrings(value: unknown, output: string[]): void {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectEmergencyTerms(value: unknown): string[] {
  const strings: string[] = [];
  collectStrings(value, strings);
  const text = strings.join(' ');

  return EMERGENCY_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ term }) => term);
}

export function getEmergencyTerms(): string[] {
  return [...EMERGENCY_TERMS];
}

@Injectable()
export class EmergencyDetectionGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // The framework does not pass tool arguments to guards. The gateway
      // decorator records them on context.input for post-handler processing;
      // metadata is still available for clients that provide MCP _meta values.
      const input = (context as any).input ?? context.metadata;
      contextAny(context).emergency = {
        ruleset_available: true,
        matched_terms: detectEmergencyTerms(input),
      };
    } catch {
      // Detection must never block care information. The safety interceptor
      // still provides the tool's ordinary safety envelope on detector failure.
      contextAny(context).emergency = {
        ruleset_available: true,
        matched_terms: [],
      };
    }

    return true;
  }
}

function contextAny(context: ExecutionContext): any {
  return context as any;
}
