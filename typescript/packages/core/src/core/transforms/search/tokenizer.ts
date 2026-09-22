/**
 * Standard English stop words set for information retrieval.
 * Preserves common API identifiers like 'id', 'get', 'set', etc.
 */
export const STOP_WORDS = new Set<string>([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'aren', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does',
  'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
  'how', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself', 'me', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only',
  'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she',
  'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'won', 'you', 'your',
  'yours', 'yourself', 'yourselves',
]);

/**
 * Splits text into normalized alphanumeric tokens, handling camelCase,
 * snake_case, kebab-case, punctuation, and stop-word filtration.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];

  // 1. Separate camelCase and snake/kebab/punctuation transitions
  const normalized = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-.:/\\,;?!=+*~`'"`()\[\]{}|<>#@$%^&]+/g, ' ')
    .toLowerCase();

  // 2. Extract alphanumeric words >= 2 chars
  const tokens = normalized.match(/[a-z0-9]+/g) || [];

  // 3. Filter common English stop words
  return tokens.filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}
