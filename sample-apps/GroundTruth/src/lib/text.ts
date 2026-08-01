/**
 * Deterministic text helpers.
 *
 * These produce *signals*, never verdicts. The agent reading the tool output is
 * what decides whether something matters — see eod.prompts.ts. Keeping the
 * judgement out of here is the whole point of the architecture.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'the', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by',
  'from', 'is', 'was', 'were', 'be', 'been', 'am', 'are', 'it', 'its', 'this',
  'that', 'these', 'those', 'i', 'we', 'my', 'our', 'you', 'your', 'as', 'but',
  'so', 'then', 'than', 'up', 'out', 'about', 'into', 'over', 'after', 'today',
  'yesterday', 'also', 'just', 'still', 'some', 'more', 'most', 'not', 'no',
  'did', 'do', 'does', 'doing', 'have', 'has', 'had', 'will', 'would', 'can',
  'could', 'should', 'got', 'get', 'work', 'worked', 'working', 'day',
]);

/** Words signalling the writer claims something is finished. */
const COMPLETION_WORDS = [
  'done', 'finished', 'completed', 'complete', 'shipped', 'merged', 'deployed',
  'closed', 'fixed', 'resolved', 'delivered', 'wrapped', 'finalised',
  'finalized', 'landed',
];

/** Words signalling something is in the way. */
const BLOCKER_WORDS = [
  'blocked', 'blocker', 'stuck', 'waiting', 'pending', 'issue', 'problem',
  'broken', 'failing', 'error', 'cannot', "can't", 'unable', 'delayed',
  'held up', 'depends on', 'need help', 'no access', 'access denied',
];

const NEGATIVE_WORDS = [
  'blocked', 'stuck', 'frustrated', 'exhausted', 'tired', 'overwhelmed',
  'confused', 'broken', 'failing', 'struggling', 'behind', 'delayed', 'worried',
  'burnt out', 'burned out', 'stressed',
];

const POSITIVE_WORDS = [
  'done', 'finished', 'shipped', 'great', 'good', 'smooth', 'ahead', 'clean',
  'solved', 'progress', 'happy', 'productive', 'unblocked', 'on track',
];

/**
 * Words that flip the meaning of a signal word just after them.
 *
 * Deliberately short. A wide list plus a wide window turns "I was not sure, but
 * finished the login module" into a report that claims nothing.
 */
const NEGATORS = new Set([
  'not', 'no', 'never', 'without', "isn't", "wasn't", "aren't", "weren't",
  "hasn't", "haven't", "hadn't", "didn't", "doesn't", "don't", "won't",
  "couldn't", "wouldn't",
]);

/** How many preceding words can negate a signal. Two catches "no longer blocked". */
const NEGATION_WINDOW = 2;

/**
 * Matches a signal word as a whole word, optionally pluralised.
 *
 * `includes()` matched substrings, which inverted meaning on the exact words
 * that matter most: "unresolved" contains "resolved", so an unfinished bug read
 * as completed work; "unblocked" contains "blocked", so a cleared blocker
 * counted towards the recurring-blocker run that decides whether a manager is
 * alerted. A word boundary fixes the whole un-/in- prefix class at once, since
 * there is no boundary between the prefix and the stem.
 */
function phrasePattern(phrase: string): RegExp {
  const escaped = phrase
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  // Plural kept because "blockers" and "issues" must still match.
  return new RegExp(`\\b${escaped}s?\\b`, 'g');
}

/** True if a negator sits within NEGATION_WINDOW words before this position. */
function negatedAt(lower: string, index: number): boolean {
  const preceding = lower
    .slice(0, index)
    .split(/\s+/)
    // The text before the match usually ends in a space, which splits to a
    // trailing empty string — leaving it in costs one slot of the window and
    // let "no longer blocked" through.
    .filter(Boolean)
    .slice(-NEGATION_WINDOW)
    .map((w) => w.replace(/[^a-z']/g, ''));
  return preceding.some((w) => NEGATORS.has(w));
}

/** How many of these phrases appear, as whole words and un-negated. */
export function countSignals(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  let found = 0;
  for (const phrase of phrases) {
    const re = phrasePattern(phrase);
    let match: RegExpExecArray | null;
    while ((match = re.exec(lower)) !== null) {
      if (!negatedAt(lower, match.index)) {
        found++;
        break;
      }
    }
  }
  return found;
}

/** Whether any of these phrases appears, as a whole word and un-negated. */
export function hasSignal(text: string, phrases: string[]): boolean {
  return countSignals(text, phrases) > 0;
}

/** Lowercase content words, stop-words and short tokens removed. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/** Splits free text into sentence-ish units suitable for one claim each. */
export function splitClaims(text: string): string[] {
  return text
    .split(/[.!?\n;]+|(?:,\s*(?:and|then)\s+)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

export function assertsCompletion(text: string): boolean {
  return hasSignal(text, COMPLETION_WORDS);
}

export function looksLikeBlocker(text: string): boolean {
  return hasSignal(text, BLOCKER_WORDS);
}

export function scoreSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const neg = countSignals(text, NEGATIVE_WORDS);
  const pos = countSignals(text, POSITIVE_WORDS);
  if (neg > pos) return 'negative';
  if (pos > neg) return 'positive';
  return 'neutral';
}

/**
 * Whether two blocker descriptions are the same underlying problem.
 *
 * Exact string equality is useless here. Nobody retypes a blocker identically
 * day after day — "blocked on staging credentials" one day becomes "still
 * waiting on the staging DB credentials from infra" the next. Requiring an exact
 * match meant a blocker stuck for a week read as four unrelated one-day
 * blockers, which silently disables the single most valuable signal this product
 * has: that someone has been stuck for days and nobody noticed.
 *
 * Compares content words and asks whether the shorter description is largely
 * contained in the longer one, so an elaborated retelling still matches.
 */
export function sameBlocker(a: string, b: string): boolean {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return false;

  const [smaller, larger] =
    aTokens.size <= bTokens.size ? [aTokens, bTokens] : [bTokens, aTokens];
  let shared = 0;
  for (const t of smaller) if (larger.has(t)) shared++;

  // 0.6 tolerates rewording and added detail without merging distinct blockers.
  return shared / smaller.size >= 0.6;
}

/**
 * Groups blocker descriptions that describe the same problem.
 * Returns one entry per distinct blocker, with the dates it appeared on and the
 * most recent wording — which is the version worth showing a manager.
 */
export function groupBlockerRuns(
  entries: Array<{ date: string; blocker: string }>,
): Array<{ blocker: string; dates: string[] }> {
  /*
   * Each run remembers every wording it has seen, and a candidate joins if it
   * matches ANY of them — not just the most recent.
   *
   * Matching only the latest label breaks the chain whenever someone rephrases
   * twice. "Blocked on the staging credentials" → "waiting on infra for the
   * staging credentials" → "still no credentials": each is close to its
   * neighbour but the first and last are not, so one four-day blocker was
   * splitting into two short ones and dropping below the threshold that decides
   * whether a manager hears about it.
   */
  const runs: Array<{ texts: string[]; dates: string[] }> = [];

  // Oldest first, so the newest wording ends up as the label.
  for (const { date, blocker } of [...entries].sort((x, y) => x.date.localeCompare(y.date))) {
    /*
     * An entry can bridge runs that did not previously look related, so collect
     * every run it matches and merge them. Joining only the first match leaves
     * the others orphaned: with wordings A, B, C where A~B and B~C but A≁C, B
     * arriving second starts its own run, and C then joins A's — stranding B and
     * turning one long blocker into two short ones.
     */
    const matched = runs.filter((r) => r.texts.some((t) => sameBlocker(t, blocker)));

    if (matched.length === 0) {
      runs.push({ texts: [blocker], dates: [date] });
      continue;
    }

    const [target, ...rest] = matched;
    for (const other of rest) {
      target.texts.push(...other.texts);
      for (const d of other.dates) if (!target.dates.includes(d)) target.dates.push(d);
      runs.splice(runs.indexOf(other), 1);
    }

    target.texts.push(blocker);
    if (!target.dates.includes(date)) target.dates.push(date);
    target.dates.sort();
  }

  // Label each run with its most recent wording — the version worth showing.
  return runs.map((r) => ({ blocker: r.texts[r.texts.length - 1], dates: r.dates }));
}

/**
 * Fraction of the claim's content words that appear in the evidence text.
 * A blunt instrument by design — the agent interprets it, and a low score on
 * its own is not proof of anything.
 */
export function overlapRatio(claim: string, evidence: string): number {
  const claimTokens = [...new Set(tokenize(claim))];
  if (claimTokens.length === 0) return 0;
  const evidenceTokens = new Set(tokenize(evidence));
  const hits = claimTokens.filter((t) => evidenceTokens.has(t)).length;
  return hits / claimTokens.length;
}
