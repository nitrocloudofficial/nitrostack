import { Injectable, defaultLogger } from '@nitrostack/core';
import crypto from 'crypto';
import { loadDataJson } from '../../common/data-path.js';
import { SessionVaultService } from './session-vault.service.js';
import { NerClientService } from './ner.service.js';

export interface RedactionPolicy {
  label: string;
  description: string;
  /** Structural entities matched by regex. */
  regexEntities: string[];
  /** Context-dependent entities extracted by the local rule pass. */
  contextEntities: string[];
  /** Things the policy explicitly wants left readable so agents can reason. */
  preserve: string[];
}

export interface LegalRuleSet {
  version: string;
  documentProfiles?: Array<{
    doctype: string;
    redact: string[];
    anonymize: string[];
    preserve: string[];
  }>;
}

export type Action = 'redact' | 'anonymize' | 'preserve';

export interface RedactionResult {
  sessionId: string;
  doctype: string;
  policy: { label: string; regexEntities: string[]; contextEntities: string[]; preserve: string[] };
  redactedText: string;
  /** Token -> entity type only. The original values stay in the encrypted vault. */
  tokenIndex: Record<string, string>;
  stats: { totalTokens: number; byEntity: Record<string, number> };
}

interface Pattern {
  name: string;
  regex: RegExp;
  confidence: number;
}

/**
 * Structural PII/PCI patterns. Ordering matters: longer, more specific patterns
 * run first so a credit card is not partially consumed by the phone matcher.
 */
const PATTERNS: Pattern[] = [
  { name: 'EMAIL_ADDRESS', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, confidence: 0.97 },
  { name: 'URL', regex: /\bhttps?:\/\/[^\s<>"')\]]+/gi, confidence: 0.95 },
  { name: 'IBAN', regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, confidence: 0.9 },
  { name: 'CREDIT_CARD', regex: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g, confidence: 0.96 },
  { name: 'AADHAAR', regex: /\b\d{4}\s\d{4}\s\d{4}\b/g, confidence: 0.98 },
  { name: 'US_SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g, confidence: 0.98 },
  { name: 'PAN', regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g, confidence: 0.99 },
  { name: 'BANK_ACCOUNT', regex: /\b(?:account|a\/c|acct)[\s.:#]*(?:no\.?|number)?[\s.:#]*\d{8,18}\b/gi, confidence: 0.88 },
  { name: 'PO_NUMBER', regex: /\b(?:P\.?O\.?|purchase order)[\s.:#-]*[A-Z0-9-]{4,20}\b/gi, confidence: 0.85 },
  { name: 'IP_ADDRESS', regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g, confidence: 0.95 },
  { name: 'PHONE_NUMBER', regex: /(?:\+\d{1,3}[\s-]?)?(?<!\d)(?:\(\d{3}\)[\s-]?|\d{3}[\s-])\d{3}[\s-]?\d{4}(?!\d)|(?:\+91[\s-]?)?(?<!\d)[6-9]\d{9}(?!\d)/g, confidence: 0.85 },
  // Currency amounts: $1,200,000 / USD 1.2M / 250,000 EUR / ₹45,00,000
  { name: 'MONEY', regex: /(?:(?:US\$|\$|₹|€|£)\s?\d[\d,.]*(?:\s?(?:million|billion|mn|bn|k|M|B))?)|(?:\b(?:USD|EUR|GBP|INR|AUD|CAD)\s?\d[\d,.]*(?:\s?(?:million|billion|mn|bn|k|M|B))?)|(?:\b\d[\d,.]*\s?(?:USD|EUR|GBP|INR|AUD|CAD)\b)/g, confidence: 0.9 },
  { name: 'PERCENTAGE', regex: /\b\d{1,3}(?:\.\d+)?\s?(?:%|percent)\b/gi, confidence: 0.75 }
];

/**
 * Local, no-network heuristics for the context-dependent entities each policy
 * asks for. These run BEFORE anything reaches an external model — that ordering
 * is the whole point of the architecture, so this pass must stay purely local.
 */
const CONTEXT_RULES: Array<{ name: string; regex: RegExp; group: number }> = [
  // Corporate suffix form: "Acme Systems Pvt. Ltd."
  { name: 'CLIENT_NAME', regex: /\b([A-Z][A-Za-z0-9&.,'-]*(?:\s+[A-Z][A-Za-z0-9&.,'-]*){0,5}\s+(?:Inc\.?|LLC|L\.L\.C\.|Ltd\.?|Limited|GmbH|Pvt\.?\s?Ltd\.?|Corp\.?|Corporation|Company|Co\.|PLC|LLP|S\.A\.|B\.V\.))/g, group: 1 },
  // Defined-term form: 'Acme Corp ("Customer")'
  { name: 'CLIENT_NAME', regex: /\b([A-Z][A-Za-z0-9&.,'-]*(?:\s+[A-Z][A-Za-z0-9&.,'-]*){0,4})\s*\(\s*(?:the\s+)?["“']?(?:Customer|Client|Purchaser|Buyer)["”']?\s*\)/g, group: 1 },
  { name: 'VENDOR_NAME', regex: /\b([A-Z][A-Za-z0-9&.,'-]*(?:\s+[A-Z][A-Za-z0-9&.,'-]*){0,4})\s*\(\s*(?:the\s+)?["“']?(?:Provider|Vendor|Supplier|Contractor|Licensor|Processor)["”']?\s*\)/g, group: 1 },
  { name: 'AFFILIATE_NAME', regex: /\baffiliates?\s+(?:including|namely|such as)\s+([A-Z][A-Za-z0-9&.,'\s-]{2,60}?)(?=[,.;)])/g, group: 1 },
  { name: 'SUBPROCESSOR_NAME', regex: /\bsub-?processors?\s+(?:including|namely|such as|:)\s*([A-Z][A-Za-z0-9&.,'\s-]{2,80}?)(?=[,.;)])/gi, group: 1 },
  { name: 'DPO_NAME', regex: /\b(?:Data Protection Officer|DPO)\s*(?:is|:|shall be)\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/g, group: 1 },
  { name: 'DATA_CENTER_LOCATION', regex: /\b(?:data\s+(?:centre|center)s?|hosted|stored|processed)\s+(?:is\s+|are\s+|located\s+)?in\s+([A-Z][A-Za-z-]+(?:,\s?[A-Z][A-Za-z-]+){0,2})/g, group: 1 },
  { name: 'JURISDICTION', regex: /\b(?:governed by|construed in accordance with|laws of|courts of|exclusive jurisdiction of)\s+(?:the\s+)?(?:State of\s+|Commonwealth of\s+)?([A-Z][A-Za-z-]+(?:\s+[A-Z][A-Za-z-]+){0,3})/g, group: 1 },
  { name: 'SIGNATORY_NAME', regex: /\b(?:Name|Signed by|Authori[sz]ed Signatory|By)\s*:\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})/g, group: 1 },
  { name: 'PROJECT_CODENAME', regex: /\b(?:Project|Codename|Code Name)\s+["“']?([A-Z][A-Za-z0-9-]{2,24})["”']?/g, group: 1 },
  { name: 'TRADE_SECRET', regex: /\b(?:proprietary|trade secret)\s+(?:algorithm|process|formula|method|technology)\s+(?:known as|called|designated)\s+["“']?([A-Za-z0-9 -]{3,40})["”']?/gi, group: 1 },
  { name: 'SECURITY_CONTACT', regex: /\b(?:security contact|incident contact)\s*(?:is|:)\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/gi, group: 1 },
  // Captured as its own entity so the financial agent can see that a commercial
  // figure existed at all, without ever seeing the number.
  { name: 'ACV_VALUE', regex: /\b(?:Annual Contract Value|ACV|Total Contract Value|TCV|Annual Recurring Revenue|ARR)\s*(?:of|:|=|shall be)?\s*((?:US\$|\$|₹|€|£)?\s?\d[\d,.]*(?:\s?(?:million|billion|mn|bn|k|M|B))?)/gi, group: 1 }
];

/** Names too generic to be a real party — matching these produces noise. */
const ENTITY_STOPWORDS = new Set([
  'The Agreement', 'This Agreement', 'The Parties', 'The Party', 'Effective Date',
  'Exhibit A', 'Exhibit B', 'Schedule A', 'Schedule B', 'Section', 'Article',
  'Confidential Information', 'Intellectual Property', 'Force Majeure',
  'Customer', 'Provider', 'Vendor', 'Supplier', 'Company', 'Corporation'
]);

@Injectable({ deps: [SessionVaultService, NerClientService] })
export class RedactionService {
  private policies: Record<string, RedactionPolicy> = {};
  private legalRules: LegalRuleSet = { version: 'unknown' };

  constructor(
    private vault: SessionVaultService,
    private ner: NerClientService
  ) {
    this.loadPolicies();
  }

  private loadPolicies() {
    this.policies = loadDataJson<Record<string, RedactionPolicy>>('redaction-policies.json', {});
    this.legalRules = loadDataJson<LegalRuleSet>('legal-rules.json', { version: 'unknown' });

    if (Object.keys(this.policies).length === 0) {
      defaultLogger.warn('[redaction] No policy file loaded — falling back to the built-in maximal policy.');
    }
    if (!this.legalRules.documentProfiles?.length) {
      defaultLogger.warn('[redaction] No legal rule profiles loaded — action defaults apply.');
    }
  }

  listPolicies(): Array<{ doctype: string; label: string; description: string }> {
    return Object.entries(this.policies).map(([doctype, p]) => ({
      doctype,
      label: p.label,
      description: p.description
    }));
  }

  /** Resolve a user-selected contract type to a policy, defaulting conservatively. */
  resolvePolicy(doctype: string): { key: string; policy: RedactionPolicy } {
    const requested = (doctype || '').toLowerCase().trim().replace(/[\s-]+/g, '_');

    if (this.policies[requested]) return { key: requested, policy: this.policies[requested] };
    if (this.policies['general_contract']) {
      return { key: 'general_contract', policy: this.policies['general_contract'] };
    }

    // No policy file at all — redact everything we can detect.
    return {
      key: 'general_contract',
      policy: {
        label: 'General Contract (built-in default)',
        description: 'Policy file unavailable; redacting all detectable entities.',
        regexEntities: PATTERNS.map((p) => p.name),
        contextEntities: CONTEXT_RULES.map((r) => r.name),
        preserve: []
      }
    };
  }

  private resolveLegalProfile(doctype: string): { redact: Set<string>; anonymize: Set<string>; preserve: Set<string> } {
    const profile = this.legalRules.documentProfiles?.find((p) => p.doctype === doctype) ||
      this.legalRules.documentProfiles?.find((p) => p.doctype === 'general_contract');

    return {
      redact: new Set(profile?.redact || []),
      anonymize: new Set(profile?.anonymize || []),
      preserve: new Set(profile?.preserve || [])
    };
  }

  private decideAction(entity: string, legalProfile: { redact: Set<string>; anonymize: Set<string>; preserve: Set<string> }): Action {
    if (legalProfile.preserve.has(entity)) return 'preserve';
    if (legalProfile.redact.has(entity)) return 'redact';
    if (legalProfile.anonymize.has(entity)) return 'anonymize';

    if (entity === 'MONEY' || entity === 'PERCENTAGE' || entity === 'JURISDICTION') return 'preserve';
    return 'anonymize';
  }

  /**
   * Redact `text` under the policy for `doctype`, store the reverse map in the
   * encrypted vault, and return only the redacted text plus a type-only index.
   */
  async redact(text: string, doctype: string, sessionId?: string): Promise<RedactionResult> {
    const { key, policy } = this.resolvePolicy(doctype);
    const legalProfile = this.resolveLegalProfile(key);
    const session = sessionId || `sess_${crypto.randomBytes(8).toString('hex')}`;

    const tokenMap: Record<string, string> = {};
    const tokenIndex: Record<string, string> = {};
    const byEntity: Record<string, number> = {};
    // One token per distinct original value, so the graph can tell that two
    // mentions of the same party are the same node.
    const valueToToken = new Map<string, string>();
    let counter = 0;

    const mint = (entity: string, original: string): string => {
      const cacheKey = `${entity}::${original}`;
      const cached = valueToToken.get(cacheKey);
      if (cached) return cached;

      counter += 1;
      const token = `[${entity}_${String(counter).padStart(3, '0')}]`;
      valueToToken.set(cacheKey, token);
      tokenMap[token] = original;
      tokenIndex[token] = entity;
      byEntity[entity] = (byEntity[entity] || 0) + 1;
      return token;
    };

    let redactedText = text;

    // Pass 1 (primary/offline) — regex heuristics.
    // Execute this FIRST so hard PII never goes to the cloud.
    for (const pattern of PATTERNS) {
      if (!policy.regexEntities.includes(pattern.name)) continue;

      const action = this.decideAction(pattern.name, legalProfile);
      if (action === 'preserve') continue;

      // Extract raw matches and then apply them string-wise to avoid intersecting
      // already-minted tokens (which regex might falsely match).
      const matches = Array.from(redactedText.matchAll(pattern.regex)).map((m) => m[0].trim());
      for (const value of matches) {
        if (value.length < 3) continue;
        const token = mint(pattern.name, value);
        redactedText = this.replaceOutsideTokens(redactedText, value, token);
      }
    }

    // Pass 2 (secondary/cloud) — external NER, when configured.
    // Receives the partially-redacted text with PII safely masked.
    if (this.ner.available) {
      const labels = [...new Set([...policy.contextEntities, ...policy.regexEntities])];
      const entities = await this.ner.extractEntities(redactedText, labels);

      if (entities.length > 0) {
        // Longest first, so "Acme Corp International" is not clipped by "Acme Corp".
        entities.sort((a, b) => b.text.length - a.text.length);
        for (const ent of entities) {
          const value = ent.text.trim();
          if (value.length < 3) continue;

          const action = this.decideAction(ent.label, legalProfile);
          if (action === 'preserve') continue; // Not masking this entity class

          const token = mint(ent.label, value);
          redactedText = this.replaceOutsideTokens(redactedText, value, token);
        }
      } else {
        defaultLogger.warn('[redaction] NER pass returned no entities; continuing with local rules.');
      }
    } else {
      defaultLogger.warn('[redaction] NER unavailable; running local rules only.');
    }

    // Pass 2 — context-dependent heuristics. Runs before the structural
    // patterns so a party name containing digits is not partly eaten by one.
    for (const rule of CONTEXT_RULES) {
      if (!policy.contextEntities.includes(rule.name)) continue;
      if (this.decideAction(rule.name, legalProfile) === 'preserve') continue;

      const captured = new Set<string>();
      for (const match of redactedText.matchAll(new RegExp(rule.regex.source, rule.regex.flags))) {
        const value = (match[rule.group] || '').trim().replace(/[.,;:]+$/, '');
        if (this.isRedactableValue(value)) captured.add(value);
      }

      for (const value of [...captured].sort((a, b) => b.length - a.length)) {
        const token = mint(rule.name, value);
        redactedText = this.replaceOutsideTokens(redactedText, value, token);
      }
    }

    // Pass 3 — structural patterns.
    for (const pattern of PATTERNS) {
      if (!policy.regexEntities.includes(pattern.name)) continue;
      if (this.decideAction(pattern.name, legalProfile) === 'preserve') continue;

      redactedText = this.mapOutsideTokens(redactedText, (segment) =>
        segment.replace(
          new RegExp(pattern.regex.source, pattern.regex.flags),
          (match) => mint(pattern.name, match)
        )
      );
    }

    this.vault.put(session, tokenMap);

    return {
      sessionId: session,
      doctype: key,
      policy: {
        label: policy.label,
        regexEntities: policy.regexEntities,
        contextEntities: policy.contextEntities,
        preserve: policy.preserve
      },
      redactedText,
      tokenIndex,
      stats: { totalTokens: Object.keys(tokenMap).length, byEntity }
    };
  }

  /** Matches an already-minted placeholder token, e.g. `[CLIENT_NAME_001]`. */
  private static readonly TOKEN_RE = /\[[A-Z_]+_\d{3,}\]/g;

  /** Reject values too generic, too short, or already tokenized. */
  private isRedactableValue(value: string): boolean {
    if (value.length < 2) return false;
    if (ENTITY_STOPWORDS.has(value)) return false;
    if (value.includes('[') || value.includes(']')) return false;
    return true;
  }

  /**
   * Split `text` into already-tokenized spans and plain spans, apply `fn` to the
   * plain spans only, and rejoin.
   *
   * This is what stops the passes from corrupting each other. Once
   * `[CLIENT_NAME_001]` is in the text, a later rule matching "Client" or the
   * digits `001` would otherwise rewrite the inside of that token and leave a
   * placeholder the vault can never restore.
   */
  private mapOutsideTokens(text: string, fn: (segment: string) => string): string {
    const tokenRe = new RegExp(RedactionService.TOKEN_RE.source, 'g');
    let out = '';
    let cursor = 0;

    for (const match of text.matchAll(tokenRe)) {
      const start = match.index ?? 0;
      out += fn(text.slice(cursor, start)) + match[0];
      cursor = start + match[0].length;
    }

    return out + fn(text.slice(cursor));
  }

  /** Literal find-and-replace that never touches the inside of an existing token. */
  private replaceOutsideTokens(text: string, value: string, token: string): string {
    return this.mapOutsideTokens(text, (segment) => segment.split(value).join(token));
  }

  /**
   * Reverse the redaction for user-facing output. Decrypts the session vault,
   * substitutes originals, and never returns the map itself.
   */
  restore(text: string, sessionId: string): { restoredText: string; substitutions: number; found: boolean } {
    const tokenMap = this.vault.get(sessionId);
    if (!tokenMap) return { restoredText: text, substitutions: 0, found: false };

    let restoredText = text;
    let substitutions = 0;

    // Longest token first — `[CLIENT_NAME_010]` must not be mangled by a prefix match.
    for (const token of Object.keys(tokenMap).sort((a, b) => b.length - a.length)) {
      const parts = restoredText.split(token);
      if (parts.length > 1) {
        substitutions += parts.length - 1;
        restoredText = parts.join(tokenMap[token]);
      }
    }

    return { restoredText, substitutions, found: true };
  }

  /** Restore every string value in an arbitrary JSON structure. */
  restoreDeep<T>(payload: T, sessionId: string): T {
    const tokenMap = this.vault.get(sessionId);
    if (!tokenMap) return payload;

    const tokens = Object.keys(tokenMap).sort((a, b) => b.length - a.length);

    const walk = (node: unknown): unknown => {
      if (typeof node === 'string') {
        let out = node;
        for (const token of tokens) out = out.split(token).join(tokenMap[token]);
        return out;
      }
      if (Array.isArray(node)) return node.map(walk);
      if (node && typeof node === 'object') {
        return Object.fromEntries(
          Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, walk(v)])
        );
      }
      return node;
    };

    return walk(payload) as T;
  }

  /** Wipe a session's encrypted mapping. Call this once the report is delivered. */
  destroySession(sessionId: string): void {
    this.vault.destroy(sessionId);
  }

  /**
   * Local gate: confirm no high-confidence PII survived before the redacted text
   * is handed to the graph builder.
   */
  verify(redactedText: string, doctype?: string): { clean: boolean; leaks: Array<{ entity: string; sample: string }> } {
    const leaks: Array<{ entity: string; sample: string }> = [];
    const legalProfile = doctype ? this.resolveLegalProfile(doctype) : null;

    for (const pattern of PATTERNS.filter((p) => p.confidence >= 0.9)) {
      if (legalProfile && legalProfile.preserve.has(pattern.name)) {
        // Intentionally preserved under legal policy
        continue;
      }
      const match = new RegExp(pattern.regex.source, pattern.regex.flags).exec(redactedText);
      if (match) leaks.push({ entity: pattern.name, sample: `${match[0].slice(0, 4)}…` });
    }

    return { clean: leaks.length === 0, leaks };
  }
}
