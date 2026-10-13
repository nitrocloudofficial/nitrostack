/**
 * Untrusted-input handling for log-derived strings (path, query, User-Agent).
 *
 * Design choice: we STRUCTURALLY ISOLATE rather than blocklist. A blocklist
 * of "bad phrases" always loses — attackers just rephrase, re-encode, or
 * split words with zero-width characters. neutralise() doesn't try to
 * recognise every attack; it makes the *shape* of the output impossible to
 * mistake for an instruction: the stripping (step 2) only removes cheap
 * evasion tooling (zero-width joiners, bidi overrides) so detection can see
 * through it, but the actual defense is step 4 — wrapping the value in a
 * labelled, delimiter-escaped `<untrusted>` tag before it ever reaches a
 * tool response or a prompt. Even a payload that evades every detector still
 * arrives at the model visibly quarantined as data, never as an instruction.
 */

import type { AccessLogRecord } from './types.js';

// Excludes \t \n \r deliberately — those are ordinary whitespace and get
// collapsed by the whitespace step below, not deleted outright.
const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
const ZERO_WIDTH = /[​-‏﻿]/g;
const BIDI_OVERRIDES = /[‪-‮⁦-⁩]/g;

/**
 * Normalises, strips evasion characters, collapses whitespace, hard-caps
 * length, then wraps the result in a labelled, delimiter-escaped
 * `<untrusted field="...">` tag. Every log-derived string that can reach a
 * tool response or an LLM prompt must pass through this first.
 */
export function neutralise(value: string, maxLen: number, field: string): string {
  let v = value.normalize('NFKC');
  v = v.replace(CONTROL_CHARS, '').replace(ZERO_WIDTH, '').replace(BIDI_OVERRIDES, '');
  v = v.replace(/\s+/g, ' ').trim();

  if (v.length > maxLen) {
    v = v.slice(0, maxLen) + '…[truncated]';
  }

  // Escape any occurrence of the wrapper's own delimiter inside the value —
  // this is what actually stops a "</untrusted><system>...</system>" payload
  // from terminating the tag early and reappearing as unquarantined markup.
  const escaped = v.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<untrusted field="${field}">${escaped}</untrusted>`;
}

function normaliseForDetection(s: string): string {
  return s.normalize('NFKC').replace(ZERO_WIDTH, '');
}

type DetectableField = 'path' | 'query' | 'ua';

interface PatternDef {
  name: string;
  re: RegExp;
  fields: DetectableField[];
}

// Matched case-insensitively (except the structural multi-newline check)
// after NFKC normalisation and zero-width stripping, so "ig<zero-width>nore"
// is caught the same as "ignore".
const PATTERNS: PatternDef[] = [
  { name: 'ignore-previous', re: /ignore previous|ignore all previous/i, fields: ['path', 'query', 'ua'] },
  { name: 'disregard-previous', re: /disregard (the )?(above|previous)/i, fields: ['path', 'query', 'ua'] },
  { name: 'system-role', re: /system:/i, fields: ['path', 'query', 'ua'] },
  { name: 'assistant-role', re: /assistant:/i, fields: ['path', 'query', 'ua'] },
  { name: 'untrusted-escape', re: /<\/untrusted/i, fields: ['path', 'query', 'ua'] },
  { name: 'pipe-delimiter', re: /<\|/, fields: ['path', 'query', 'ua'] },
  { name: 'instruction-marker', re: /###\s*instruction/i, fields: ['path', 'query', 'ua'] },
  { name: 'role-override', re: /you are now|new instructions|override .{0,20}instructions/i, fields: ['path', 'query', 'ua'] },
  // Only the User-Agent stands in for a "header field" in our schema.
  { name: 'multi-newline', re: /\n{3,}/, fields: ['ua'] },
];

/**
 * Flags instruction-shaped content in a record's path/query/ua. Returns null
 * when nothing matches — callers should treat that as "clean", not "unknown".
 */
export function detectInjectionAttempt(record: AccessLogRecord): { field: string; pattern: string }[] | null {
  const values: Record<DetectableField, string> = {
    path: normaliseForDetection(record.path),
    query: normaliseForDetection(record.query ?? ''),
    ua: normaliseForDetection(record.ua),
  };

  const hits: { field: string; pattern: string }[] = [];
  for (const p of PATTERNS) {
    for (const field of p.fields) {
      if (p.re.test(values[field])) hits.push({ field, pattern: p.name });
    }
  }
  return hits.length > 0 ? hits : null;
}
