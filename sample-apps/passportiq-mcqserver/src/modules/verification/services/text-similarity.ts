/**
 * Field-comparison primitives for the consistency stages.
 *
 * Every function here is pure and deterministic. That is a requirement, not a
 * preference: `check_identity_consistency` decides whether the officer sees an
 * Evidence Explorer card, and a comparison that fired probabilistically would
 * make the demo's flagged-mismatch beat land only some of the time.
 *
 * The important design decision is that similarity is NOT symmetric with
 * equality. Two names can be 0.88 similar and still be a reportable mismatch
 * ("Rohan Sharma" vs "Rohan Verma" — one token differs, and it is the surname);
 * two others can be 0.71 similar and NOT a mismatch ("Rohan Kumar Sharma" vs
 * "Sharma Rohan Kumar" — same tokens, different order, which is a transcription
 * convention rather than a discrepancy). So token-set logic runs BEFORE the
 * character-level score, and the score is only used to grade how bad a genuine
 * mismatch is.
 */

/** Collapse to comparable form: lowercase, punctuation stripped, single-spaced. */
export function canonical(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    // Intra-word punctuation goes FIRST, so "M.G." -> "mg" rather than "m g".
    .replace(/[.'’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Canonical tokens, de-duplicated, order discarded. */
export function tokenSet(value: string): Set<string> {
  return new Set(canonical(value).split(' ').filter(Boolean));
}

/** Levenshtein edit distance. Iterative two-row form — no recursion, no allocation churn. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_unused, index) => index);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insertion = current[j - 1]! + 1;
      const deletion = previous[j]! + 1;
      current[j] = Math.min(substitution, insertion, deletion);
    }
    const swap = previous;
    previous = current;
    current = swap;
  }

  return previous[b.length]!;
}

/** 0..1 character-level similarity. 1 = identical after canonicalisation. */
export function charSimilarity(a: string, b: string): number {
  const left = canonical(a);
  const right = canonical(b);
  if (left === right) return 1;

  const longest = Math.max(left.length, right.length);
  if (longest === 0) return 1;

  return round2(1 - editDistance(left, right) / longest);
}

/** Jaccard overlap of token sets. Order-insensitive by construction. */
export function tokenSimilarity(a: string, b: string): number {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (left.size === 0 && right.size === 0) return 1;

  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }

  const union = left.size + right.size - shared;
  return union === 0 ? 1 : round2(shared / union);
}

export interface NameComparison {
  /** 0..1 — the score the UI shows on the Evidence Explorer card. */
  similarity: number;
  /** true when this is a genuine discrepancy an officer must look at. */
  isMismatch: boolean;
  /**
   * Which comparison rule decided it. Surfaced so the officer can tell
   * "the same name written differently" from "a different name".
   */
  verdict:
    | 'identical'
    | 'reordered_tokens'
    | 'expanded_form'
    | 'initials_expanded'
    | 'partial_overlap'
    | 'different';
  detail: string;
}

/**
 * Compare two personal names the way a records clerk would.
 *
 * The four not-a-mismatch cases, in the order they are tested:
 *
 *   identical         canonical forms match exactly
 *   reordered_tokens  same token multiset, different order — a filing convention
 *   expanded_form     one is a strict subset of the other ("Rohan Sharma" is
 *                     contained in "Rohan Kumar Sharma"). Real Indian records do
 *                     this constantly: the middle name is dropped on one document.
 *                     Reported as a LOW-severity note, not a hard mismatch, but
 *                     still reported — it is exactly the beat the demo clicks on.
 *   initials_expanded "R K Sharma" vs "Rohan Kumar Sharma"
 *
 * Anything else with partial token overlap is a real mismatch, graded by how much
 * of the name actually agrees.
 */
export function compareNames(left: string, right: string): NameComparison {
  const a = canonical(left);
  const b = canonical(right);

  if (a === b) {
    return {
      similarity: 1,
      isMismatch: false,
      verdict: 'identical',
      detail: 'Names match exactly.',
    };
  }

  const leftTokens = canonical(left).split(' ').filter(Boolean);
  const rightTokens = canonical(right).split(' ').filter(Boolean);
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);

  const sameTokens =
    leftSet.size === rightSet.size && [...leftSet].every((token) => rightSet.has(token));

  if (sameTokens) {
    return {
      similarity: 1,
      isMismatch: false,
      verdict: 'reordered_tokens',
      detail: 'Same name components in a different order — a filing convention, not a discrepancy.',
    };
  }

  if (isInitialsExpansion(leftTokens, rightTokens) || isInitialsExpansion(rightTokens, leftTokens)) {
    return {
      similarity: 0.9,
      isMismatch: false,
      verdict: 'initials_expanded',
      detail: 'One document abbreviates given names to initials; the components agree.',
    };
  }

  const subset =
    [...leftSet].every((token) => rightSet.has(token)) ||
    [...rightSet].every((token) => leftSet.has(token));

  if (subset) {
    const dropped = [...(leftSet.size > rightSet.size ? leftSet : rightSet)].filter(
      (token) => !(leftSet.size > rightSet.size ? rightSet : leftSet).has(token)
    );
    return {
      similarity: tokenSimilarity(left, right),
      // Reported, but low severity: an omitted middle name is a documentation
      // gap the officer should see, not evidence of a different person.
      isMismatch: true,
      verdict: 'expanded_form',
      detail: `One document omits ${dropped.join(', ')}; the remaining components agree.`,
    };
  }

  const similarity = round2((tokenSimilarity(left, right) + charSimilarity(left, right)) / 2);

  return {
    similarity,
    isMismatch: true,
    verdict: similarity >= 0.4 ? 'partial_overlap' : 'different',
    detail:
      similarity >= 0.4
        ? 'Names partly agree but at least one component differs.'
        : 'Names do not correspond.',
  };
}

/** True when `abbreviated` is `full` with some given names reduced to initials. */
function isInitialsExpansion(abbreviated: string[], full: string[]): boolean {
  if (abbreviated.length !== full.length || abbreviated.length === 0) return false;

  let sawInitial = false;
  for (let i = 0; i < abbreviated.length; i += 1) {
    const short = abbreviated[i]!;
    const long = full[i]!;
    if (short === long) continue;
    if (short.length === 1 && long.startsWith(short)) {
      sawInitial = true;
      continue;
    }
    return false;
  }
  return sawInitial;
}

/** Grade a mismatch. Thresholds are the officer-facing triage, so they are named. */
export function severityFromSimilarity(similarity: number): 'low' | 'medium' | 'high' {
  if (similarity >= 0.8) return 'low';
  if (similarity >= 0.5) return 'medium';
  return 'high';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
