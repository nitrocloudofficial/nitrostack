const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'for', 'in', 'on', 'at', 'by', 'with',
  'from', 'up', 'over', 'this', 'that', 'it', 'will', 'i', 'we', 'get', 'have',
  'make', 'send', 'so', 'our', 'their', 'your', 'my', 'me', 'us', 'about', 'into',
  'out', 'if', 'then', 'them', 'they', 'be', 'been', 'is', 'are', 'was', 'were',
  'please', 'kindly', 'need', 'should', 'do', 'did', 'does', 'can', 'could',
  'would', 'just', 'also', 'going', 'want', 'like', 'new', 'via', 'etc', 'e.g'
]);

const DONE_SIGNALS = new Set([
  'sent', 'published', 'shipped', 'completed', 'complete', 'done', 'uploaded',
  'delivered', 'finished', 'attached', 'shared', 'pushed', 'merged', 'submitted',
  'filed', 'posted', 'closed', 'emailed', 'mailed', 'handed', 'finalized',
  'ready', 'delivered', 'shipped', 'deployed', 'live', 'posted'
]);

export const DONE_THRESHOLD = 0.6;
export const NO_SIGNAL_CAP = 0.55;

export function normalizeTerm(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function tokenize(text: string): string[] {
  return text
    .split(/[^a-zA-Z0-9']+/)
    .map(normalizeTerm)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function scoreEvidence(what: string, messageText: string, authorMatches: boolean): number {
  const query = tokenize(what);
  const textTokens = tokenize(messageText);
  if (query.length === 0) {
    return 0;
  }
  const textSet = new Set(textTokens);
  const hits = query.filter((t) => textSet.has(t));
  const recall = hits.length / query.length;
  const signalCount = textTokens.filter((t) => DONE_SIGNALS.has(t)).length;

  let score = recall;
  if (signalCount > 0) {
    score += Math.min(0.3, 0.15 * signalCount);
  }
  if (authorMatches) {
    score += 0.1;
  }
  if (signalCount === 0 && score > NO_SIGNAL_CAP) {
    score = NO_SIGNAL_CAP;
  }
  return Math.min(1, score);
}

