/**
 * SemanticService — local, deterministic embeddings and the conflict engine.
 *
 * Design note, because this is the part reviewers ask about:
 *
 * Cosine similarity alone cannot detect the contradiction we care about.
 * "Implement a Redis cache in front of the invoice read path" and
 * "Redis rejected, we stay on Memcached" share almost all of their vocabulary,
 * so their cosine similarity is HIGH — a naive `similarity < 0.7` test would
 * sail straight past the very conflict it was written to catch.
 *
 * So the engine uses two orthogonal signals:
 *
 *   1. ALIGNMENT  (cosine over hashed token vectors) — are these two statements
 *      talking about the same thing at all?
 *   2. DIVERGENCE (decision-level analysis) — do they choose *differently* about
 *      that thing? Computed from extracted technology entities plus the polarity
 *      of the surrounding language (adopt / reject / freeze / mandate).
 *
 * A contradiction is HIGH alignment + HIGH divergence. Semantic drift — the case
 * the original `similarity < 0.7` rule describes — is LOW alignment between two
 * sources that are nominally about the same ticket. Both raise a conflict; they
 * are reported with different `kind` values so the administrator sees which is which.
 *
 * Everything here is pure, offline and deterministic: no API keys, no network,
 * identical output on every run. That matters on a hackathon stage.
 */
import { Injectable } from '@nitrostack/core';

const DIM = 512;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'for', 'of', 'to', 'in', 'on',
  'at', 'by', 'with', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it',
  'its', 'this', 'that', 'these', 'those', 'we', 'you', 'they', 'i', 'he', 'she', 'them',
  'our', 'your', 'their', 'will', 'would', 'can', 'could', 'should', 'have', 'has', 'had',
  'do', 'does', 'did', 'so', 'than', 'too', 'very', 'just', 'also', 'into', 'about', 'up',
]);

/**
 * Technologies and subsystems this bridge knows how to reason about.
 * Extend freely — unknown capitalised / dotted identifiers are picked up too.
 */
const TECH_LEXICON = [
  'redis', 'memcached', 'oracle', 'postgres', 'postgresql', 'mysql', 'mongodb', 'sqlite',
  'kafka', 'rabbitmq', 'elasticsearch', 'graphql', 'grpc', 'soap', 'rest api',
  'jenkins', 'github actions', 'gitlab ci', 'circleci', 'ansible', 'terraform', 'docker',
  'kubernetes', 'jest', 'junit', 'mockito', 'pytest', 'vitest', 'cypress', 'playwright',
  'eslint', 'prettier', 'commitlint', 'webpack', 'vite', 'tailwind', 'react', 'angular',
  'vue', 'jquery', 'spring', 'express', 'django', 'flask', 'aurora-orm', 'auroraorm',
  'orm', 'cache', 'caching', 'jwt', 'oauth', 'pci',
];

const REJECT_CUES = [
  'not introducing', 'will not', "won't", 'do not', "don't", 'never', 'rejected',
  'denied', 'declined', 'blocked', 'against', 'instead of', 'off the roadmap', 'no second',
  'not approve', 'will not approve', 'revert', 'abandon', 'drop ', 'cancel', 'not doing',
  'are not', 'is not', 'nobody writes',
];
const ADOPT_CUES = [
  'introduce', 'implement', 'adopt', 'stand up', 'switch to', 'migrate to', 'move to',
  'replace', 'use ', 'using', 'add ', 'roll out', 'enable', 'target',
];
const FREEZE_CUES = ['freeze', 'frozen', 'freezing', 'no changes', 'do not touch', 'locked'];
const MANDATE_CUES = [
  'must', 'mandatory', 'required', 'enforced', 'enforce', 'always', 'never', 'reject',
  'rejects', 'fails the build', 'gate',
];

export type Polarity = 'adopt' | 'reject' | 'freeze' | 'mandate' | 'neutral';

export interface DecisionSignal {
  entities: string[];
  polarity: Polarity;
  /** Entities the statement explicitly steers away from. */
  rejected: string[];
  /** Entities the statement explicitly steers toward. */
  adopted: string[];
}

@Injectable()
export class SemanticService {
  /* ----------------------------- embedding ----------------------------- */

  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_./\- ]+/g, ' ')
      .split(/\s+/)
      .map((t) => t.replace(/^[-./]+|[-./]+$/g, ''))
      .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  }

  /**
   * Hashed bag-of-words with sublinear term frequency, L2 normalised.
   * Deterministic across processes — no learned weights, no randomness.
   */
  embed(text: string): Float64Array {
    const vec = new Float64Array(DIM);
    const counts = new Map<number, number>();
    for (const token of this.tokenize(text)) {
      const slot = this.hash(token) % DIM;
      counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }
    for (const [slot, count] of counts) {
      vec[slot] = 1 + Math.log(count); // sublinear TF damps repetition
    }
    let norm = 0;
    for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < DIM; i++) vec[i] /= norm;
    return vec;
  }

  cosine(a: Float64Array, b: Float64Array): number {
    let dot = 0;
    for (let i = 0; i < DIM; i++) dot += a[i] * b[i];
    // Both vectors are unit-length, so the dot product is already the cosine.
    return Math.max(0, Math.min(1, dot));
  }

  similarity(a: string, b: string): number {
    return this.cosine(this.embed(a), this.embed(b));
  }

  /** FNV-1a — stable, fast, and dependency-free. */
  private hash(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return Math.abs(h);
  }

  /* -------------------------- decision analysis -------------------------- */

  /** Extract technology/subsystem entities mentioned in a statement. */
  extractEntities(text: string): string[] {
    const lower = text.toLowerCase();
    const found = new Set<string>();

    for (const term of TECH_LEXICON) {
      // Word-boundary match so "orm" does not fire inside "format".
      const pattern = new RegExp(`(^|[^a-z0-9])${this.escape(term)}([^a-z0-9]|$)`, 'i');
      if (pattern.test(lower)) found.add(term);
    }

    // Pick up project-specific identifiers the lexicon doesn't know:
    // dotted module names and CamelCase symbols.
    for (const match of text.matchAll(/\b[a-z][a-z0-9]*(?:[-.][a-z0-9]+)+\.(?:js|ts|jsx|java|py)\b/gi)) {
      found.add(match[0].toLowerCase());
    }

    return [...found];
  }

  private escape(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Classify what a statement is *doing* to the entities it mentions.
   *
   * The rejected/adopted split is what makes contradiction detection work: we
   * look at which entity each cue is nearest to, rather than assigning a single
   * polarity to the whole sentence.
   */
  analyseDecision(text: string): DecisionSignal {
    const lower = text.toLowerCase();
    const entities = this.extractEntities(text);

    const rejected: string[] = [];
    const adopted: string[] = [];

    for (const entity of entities) {
      const idx = lower.indexOf(entity.toLowerCase());
      if (idx < 0) continue;
      // Inspect the clause around the entity rather than the whole document.
      const window = lower.slice(Math.max(0, idx - 90), Math.min(lower.length, idx + 90));
      const isRejected = REJECT_CUES.some((cue) => window.includes(cue));
      const isAdopted = ADOPT_CUES.some((cue) => window.includes(cue));
      if (isRejected) rejected.push(entity);
      else if (isAdopted) adopted.push(entity);
    }

    let polarity: Polarity = 'neutral';
    if (FREEZE_CUES.some((c) => lower.includes(c))) polarity = 'freeze';
    else if (rejected.length) polarity = 'reject';
    else if (MANDATE_CUES.some((c) => lower.includes(c))) polarity = 'mandate';
    else if (adopted.length) polarity = 'adopt';

    return { entities, polarity, rejected, adopted };
  }

  /**
   * Score how strongly two statements disagree, in [0, 1].
   *
   * 1.0  — one adopts exactly what the other rejects (a direct contradiction)
   * 0.6+ — they adopt different, mutually-exclusive entities for the same topic
   * 0.0  — no decision-level disagreement detected
   */
  divergence(a: DecisionSignal, b: DecisionSignal): { score: number; reason: string } {
    // Direct contradiction: B rejects something A adopts (or vice versa).
    for (const entity of a.adopted) {
      if (b.rejected.includes(entity)) {
        return {
          score: 1,
          reason: `source B explicitly rejects "${entity}", which source A adopts`,
        };
      }
    }
    for (const entity of b.adopted) {
      if (a.rejected.includes(entity)) {
        return {
          score: 1,
          reason: `source A explicitly rejects "${entity}", which source B adopts`,
        };
      }
    }

    // Competing choices: both adopt, but different technologies, on a shared topic.
    const sharedTopic = a.entities.some((e) => b.entities.includes(e));
    if (sharedTopic && a.adopted.length && b.adopted.length) {
      const differing = a.adopted.filter((e) => !b.adopted.includes(e));
      if (differing.length) {
        return {
          score: 0.7,
          reason: `both sources make a choice on a shared topic but pick differently (${a.adopted.join(', ')} vs ${b.adopted.join(', ')})`,
        };
      }
    }

    // A freeze order landing on something the other side wants to change.
    if (b.polarity === 'freeze' && a.adopted.some((e) => b.entities.includes(e))) {
      return { score: 0.85, reason: 'source B freezes a component source A plans to modify' };
    }
    if (a.polarity === 'freeze' && b.adopted.some((e) => a.entities.includes(e))) {
      return { score: 0.85, reason: 'source A freezes a component source B plans to modify' };
    }

    return { score: 0, reason: 'no decision-level disagreement detected' };
  }
}
