/**
 * Scans raw, untrusted, fetched HTML/text for prompt-injection attempts
 * before any of it reaches a model. Deliberately built on plain regular
 * expressions rather than an LLM classifier: it must be fast, deterministic,
 * auditable, and able to run on every single fetch without adding latency
 * or its own attack surface.
 *
 * Six categories, matching OWASP MCP06/MCP10 (prompt injection via
 * untrusted tool output):
 *   imperative_override, role_hijack, exfiltration, hidden_text,
 *   zero_width, tool_hijack
 */

import { decodeZeroWidthMessage, ZERO_WIDTH_CHARS } from "./zero-width.js";

export type PatternType =
  | "imperative_override"
  | "role_hijack"
  | "exfiltration"
  | "hidden_text"
  | "zero_width"
  | "tool_hijack";

export interface QuarantineEntry {
  pattern_type: PatternType;
  excerpt: string;
  location: string;
  action: "blocked - not passed to model";
}

interface PhraseRule {
  type: PatternType;
  regex: RegExp;
}

const PHRASE_RULES: PhraseRule[] = [
  { type: "imperative_override", regex: /ignore\s+(all\s+)?(the\s+)?(previous|prior|above)\s+instructions?/gi },
  { type: "imperative_override", regex: /disregard\s+the\s+above/gi },
  { type: "imperative_override", regex: /new\s+instructions?\s*:/gi },
  { type: "imperative_override", regex: /forget\s+everything/gi },
  { type: "imperative_override", regex: /instead\s+of\s+(your|the)\s+(instructions|task|previous)/gi },

  { type: "role_hijack", regex: /you\s+are\s+now\b/gi },
  { type: "role_hijack", regex: /^\s*system\s*:/gim },
  { type: "role_hijack", regex: /^\s*assistant\s*:/gim },
  { type: "role_hijack", regex: /<\|im_start\|>/gi },

  { type: "exfiltration", regex: /send\s+(this|these\s+results|the\s+results|output)\s+to\b/gi },
  { type: "exfiltration", regex: /post\s+(the\s+)?results?\s+to\b/gi },
  { type: "exfiltration", regex: /email\s+(this|the\s+results?)?\s*to\b/gi },
  { type: "exfiltration", regex: /https?:\/\/[^\s"'<>]+\?[^\s"'<>]{30,}/gi },

  { type: "tool_hijack", regex: /call\s+the\s+tool\b/gi },
  { type: "tool_hijack", regex: /use\s+your\s+\w+\s+(tool|function)\b/gi },
  { type: "tool_hijack", regex: /invoke\s+(the\s+)?function\b/gi },
];

function lineNumberAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

function trimExcerpt(s: string, max = 160): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

function findHiddenRegions(rawHtml: string): Array<{ text: string; index: number; kind: string }> {
  const regions: Array<{ text: string; index: number; kind: string }> = [];

  const commentRe = /<!--([\s\S]*?)-->/g;
  let m: RegExpExecArray | null;
  while ((m = commentRe.exec(rawHtml))) {
    regions.push({ text: m[1], index: m.index, kind: "hidden HTML comment" });
  }

  const hiddenStyleRe =
    /<([a-z0-9]+)\b[^>]*style\s*=\s*["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  while ((m = hiddenStyleRe.exec(rawHtml))) {
    const inner = m[3].replace(/<[^>]+>/g, " ");
    regions.push({ text: inner, index: m.index, kind: `hidden via CSS (${m[2].replace(/\s+/g, "")})` });
  }

  return regions;
}

function stripHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scanForInjection(rawHtml: string): { quarantined: QuarantineEntry[]; visibleText: string } {
  const quarantined: QuarantineEntry[] = [];
  const flaggedRanges: Array<[number, number]> = [];

  // 1. Hidden regions (comments, display:none, etc.) — check each for
  //    specific attack phrases first; if none match, still flag the
  //    region generically since hiding content from a human reader while
  //    keeping it machine-readable is itself suspicious.
  const hiddenRegions = findHiddenRegions(rawHtml);
  for (const region of hiddenRegions) {
    const line = lineNumberAt(rawHtml, region.index);
    let matchedSpecific = false;
    for (const rule of PHRASE_RULES) {
      rule.regex.lastIndex = 0;
      const match = rule.regex.exec(region.text);
      if (match) {
        matchedSpecific = true;
        quarantined.push({
          pattern_type: rule.type,
          excerpt: trimExcerpt(match[0]),
          location: `${region.kind}, line ${line}`,
          action: "blocked - not passed to model",
        });
      }
    }
    if (!matchedSpecific && region.text.trim().length > 0) {
      quarantined.push({
        pattern_type: "hidden_text",
        excerpt: trimExcerpt(region.text),
        location: `${region.kind}, line ${line}`,
        action: "blocked - not passed to model",
      });
    }
    flaggedRanges.push([region.index, region.index + region.text.length]);
  }

  // 2. Visible text — run the same phrase rules over what a human reader
  //    would actually see, so on-page manipulation attempts are caught too.
  const visibleText = stripHtml(rawHtml);
  for (const rule of PHRASE_RULES) {
    rule.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.regex.exec(visibleText))) {
      quarantined.push({
        pattern_type: rule.type,
        excerpt: trimExcerpt(match[0]),
        location: "visible page text",
        action: "blocked - not passed to model",
      });
      if (!rule.regex.global) break;
    }
  }

  // 3. Zero-width steganography — invisible in any renderer, but present
  //    as literal characters in the DOM/text.
  const zwPattern = new RegExp(`[${ZERO_WIDTH_CHARS.join("")}]{8,}`, "g");
  let zwMatch: RegExpExecArray | null;
  while ((zwMatch = zwPattern.exec(rawHtml))) {
    const decoded = decodeZeroWidthMessage(zwMatch[0]);
    quarantined.push({
      pattern_type: "zero_width",
      excerpt: decoded
        ? `decoded hidden payload: "${decoded}"`
        : `${zwMatch[0].length} invisible zero-width characters (possible steganographic payload, could not decode)`,
      location: `zero-width characters embedded in text, line ${lineNumberAt(rawHtml, zwMatch.index)}`,
      action: "blocked - not passed to model",
    });
  }

  return { quarantined, visibleText };
}
