import { Injectable } from '@nitrostack/core';
import type { ExtractedClause, ExtractedObligation } from './contract.types.js';

/**
 * Clause / deadline / obligation extraction.
 *
 * Deliberately heuristic and fully local: there is no external legal API.
 * Every rule below returns the VERBATIM sentence from the contract so the
 * sentinel can always show the exact text that drove a decision.
 */

interface ClauseRule {
  type: string;
  label: string;
  /** Any of these must appear in the sentence (lower-cased match). */
  keywords: string[];
}

const CLAUSE_RULES: ClauseRule[] = [
  { type: 'auto_renewal', label: 'Auto-renewal', keywords: ['auto-renewal', 'auto renewal', 'automatic renewal', 'automatically renew', 'shall renew'] },
  { type: 'notice_period', label: 'Notice period', keywords: ['written notice', 'notice is given', 'days notice', 'days prior', 'notify'] },
  { type: 'liability_cap', label: 'Liability cap', keywords: ['liability capped', 'liability is limited', 'limit of indemnity', 'capped at', 'unlimited liability', 'aggregate limit'] },
  { type: 'indemnity', label: 'Indemnity', keywords: ['indemnif'] },
  { type: 'governing_law', label: 'Governing law', keywords: ['governing law', 'governed by the laws'] },
  { type: 'dispute_resolution', label: 'Dispute resolution', keywords: ['arbitration', 'disputes shall be resolved', 'exclusive jurisdiction'] },
  { type: 'data_protection', label: 'Data protection / transfers', keywords: ['personal data', 'sub-processor', 'subprocessor', 'data breach', 'eea', 'gdpr'] },
  { type: 'termination', label: 'Termination', keywords: ['terminate', 'termination', 'let lapse', 'expiry'] },
  { type: 'pricing', label: 'Pricing / fees', keywords: ['pricing', 'rent review', 'fees are fixed', 'amend pricing', 'price increase'] },
  { type: 'service_level', label: 'Service level', keywords: ['uptime', 'service credits', 'service level'] },
  { type: 'intellectual_property', label: 'Intellectual property', keywords: ['intellectual property', 'work product', 'licence', 'license'] },
  { type: 'exclusivity', label: 'Exclusivity', keywords: ['exclusivity', 'exclusive right', 'minimum revenue'] },
  { type: 'term', label: 'Term / expiry date', keywords: ['term expires', 'expires', 'cover expires', 'term of'] },
];

const OBLIGATION_MARKERS = [
  'shall ',
  'must ',
  'is required to',
  'agrees to',
  'undertakes to',
  'indemnifies',
  'shall provide',
  'shall maintain',
];

@Injectable()
export class ClauseExtractorService {
  /** Split contract text into trimmed sentences, preserving original wording. */
  splitSentences(text: string): string[] {
    return String(text || '')
      .split(/(?<=[.;])\s+(?=[A-Z(])/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Extract labelled clauses. A single sentence can satisfy several rules,
   * so the most specific match wins per rule and duplicates are collapsed.
   */
  extractClauses(text: string): ExtractedClause[] {
    const sentences = this.splitSentences(text);
    const clauses: ExtractedClause[] = [];
    const seen = new Set<string>();

    for (const rule of CLAUSE_RULES) {
      for (const sentence of sentences) {
        const haystack = sentence.toLowerCase();
        const hit = rule.keywords.some((kw) => haystack.includes(kw));
        if (!hit) continue;
        const key = `${rule.type}::${sentence}`;
        if (seen.has(key)) continue;
        seen.add(key);
        clauses.push({ type: rule.type, label: rule.label, text: sentence });
        break; // first matching sentence per clause type is the representative one
      }
    }

    if (clauses.length === 0 && sentences.length > 0) {
      clauses.push({
        type: 'unclassified',
        label: 'Unclassified provision',
        text: sentences[0],
      });
    }

    return clauses;
  }

  /**
   * Extract the primary deadline date as an ISO `YYYY-MM-DD` string.
   * Supports ISO dates and common long-form dates (e.g. "15 September 2026").
   */
  extractDeadline(text: string): string | null {
    const source = String(text || '');

    const iso = source.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
    if (iso) return iso[0];

    const slash = source.match(/\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(20\d{2})\b/);
    if (slash) {
      const day = slash[1].padStart(2, '0');
      const month = slash[2].padStart(2, '0');
      return `${slash[3]}-${month}-${day}`;
    }

    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    };
    const monthNames = Object.keys(months).join('|');

    const dayFirst = source.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\s+(20\\d{2})\\b`, 'i'));
    if (dayFirst) {
      const day = dayFirst[1].padStart(2, '0');
      return `${dayFirst[3]}-${months[dayFirst[2].toLowerCase()]}-${day}`;
    }

    const monthFirst = source.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b`, 'i'));
    if (monthFirst) {
      const day = monthFirst[2].padStart(2, '0');
      return `${monthFirst[3]}-${months[monthFirst[1].toLowerCase()]}-${day}`;
    }

    return null;
  }

  /** Extract obligation sentences with a best-effort guess at who owes them. */
  extractObligations(text: string): ExtractedObligation[] {
    const sentences = this.splitSentences(text);
    const obligations: ExtractedObligation[] = [];

    for (const sentence of sentences) {
      const haystack = sentence.toLowerCase();
      if (!OBLIGATION_MARKERS.some((m) => haystack.includes(m))) continue;
      obligations.push({ owedBy: this.guessObligor(sentence), text: sentence });
    }

    return obligations;
  }

  /** Derive counterparty name from contract text, falling back to "Unknown counterparty". */
  extractCounterparty(text: string): string {
    const between = String(text || '').match(/between\s+(.+?)\s+and\s+([A-Z][^.,;]{2,80})/);
    if (between) {
      const first = between[1].trim();
      const second = between[2].trim();
      // Prefer the party that is NOT the customer-side entity mentioned first.
      return second.length > 1 ? second : first;
    }
    const issued = String(text || '').match(/issued by\s+([A-Z][^.,;]{2,80})/);
    if (issued) return issued[1].trim();
    return 'Unknown counterparty';
  }

  /** Derive a readable contract type from the opening of the document. */
  extractContractType(text: string): string {
    const head = String(text || '').slice(0, 160);
    const known = [
      'Master Services Agreement',
      'Data Processing Addendum',
      'Commercial Lease Agreement',
      'SaaS Subscription Agreement',
      'Services Retainer',
      'Development Agreement',
      'Professional Indemnity Policy',
      'Reseller Agreement',
      'Non-Disclosure Agreement',
      'Statement of Work',
      'Licence Agreement',
      'License Agreement',
    ];
    for (const type of known) {
      if (head.toLowerCase().includes(type.toLowerCase())) return type;
    }
    const generic = head.match(/^([A-Z][A-Za-z\s]{3,60}?(Agreement|Addendum|Policy|Contract|Lease|Retainer))/);
    return generic ? generic[1].trim() : 'Contract';
  }

  private guessObligor(sentence: string): string {
    const match = sentence.match(
      /\b(Vendor|Supplier|Customer|Processor|Controller|Tenant|Landlord|Reseller|Insured|Insurer|Each party|Either party|Company|Client)\b/i,
    );
    if (match) {
      const raw = match[1];
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    return 'Both parties';
  }
}
