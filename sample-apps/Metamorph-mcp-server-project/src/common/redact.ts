// Redacts secret-looking strings from text before it reaches tool outputs or logs (OWASP MCP01).
// ponytail: regex list covers common token shapes only; entropy scanning is a later upgrade.
const PATTERNS: Array<[string, RegExp]> = [
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ['nitro-key', /\bnsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g],
  ['api-key', /\bsk_[A-Za-z0-9_-]{16,}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g],
  ['bearer', /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g],
  // credentials inside a URL (scheme://user:password@host): dependency specs, lockfile "resolved" URLs, remotes
  ['url-credentials', /\b([a-z][a-z0-9+.-]{1,15}:\/\/)[^\s/@"'<>\\]{1,200}@(?=[^\s"'<>\\])/gi],
  // key = value or key: value for obvious secret names (keeps the key name, hides the value)
  ['assignment', /\b([\w-]*(?:api[_-]?key|secret|token|passwd|password|private[_-]?key)[\w-]*)(\s*[:=]\s*)(["']?)[^\s"',;]{6,}\3/gi]
];

export interface RedactResult {
  text: string;
  count: number;
}

export function redact(input: string): RedactResult {
  let count = 0;
  let text = input;
  for (const [name, re] of PATTERNS) {
    text = text.replace(re, (...m) => {
      count++;
      if (name === 'url-credentials') return `${m[1]}[REDACTED]@`;
      if (name === 'assignment') return `${m[1]}${m[2]}${m[3]}[REDACTED]${m[3]}`;
      return `[REDACTED:${name}]`;
    });
  }
  return { text, count };
}
