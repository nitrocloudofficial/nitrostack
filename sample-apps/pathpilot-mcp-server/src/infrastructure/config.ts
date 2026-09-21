export interface AnalysisBudget {
  maxFilePaths: number;
  maxContentReads: number;
  maxRetainedTextKb: number;
}

export interface ServerConfig {
  env: 'development' | 'production' | 'test';
  budget: AnalysisBudget;
  excludedPathPatterns: RegExp[];
  excludedFilePatterns: RegExp[];
  secretPatterns: RegExp[];
  githubToken?: string;
  linkedinToken?: string;
  cacheTtlSeconds: number;
  defaultPathway: 'full-stack-developer';
}

const DEFAULT_BUDGET: AnalysisBudget = {
  maxFilePaths: Number(process.env.MAX_FILE_PATHS || 80),
  maxContentReads: Number(process.env.MAX_CONTENT_READS || 25),
  maxRetainedTextKb: Number(process.env.MAX_RETAINED_TEXT_KB || 64),
};

const DEFAULT_EXCLUDED_PATHS = [
  /(^|[\\/])\.git([\\/]|$)/,
  /(^|[\\/])node_modules([\\/]|$)/,
  /(^|[\\/])dist([\\/]|$)/,
  /(^|[\\/])build([\\/]|$)/,
  /(^|[\\/])\.next([\\/]|$)/,
  /(^|[\\/])\.nuxt([\\/]|$)/,
  /(^|[\\/])coverage([\\/]|$)/,
  /(^|[\\/])\.output([\\/]|$)/,
  /(^|[\\/])\.turbo([\\/]|$)/,
  /(^|[\\/])\.cache([\\/]|$)/,
  /(^|[\\/])vendor([\\/]|$)/,
  /(^|[\\/])vendored([\\/]|$)/,
];

const DEFAULT_EXCLUDED_FILES = [
  /\.lock$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /bun\.lock$/i,
  /\.(png|jpe?g|gif|ico|webp|avif|svg|mp4|mp3|woff2?|ttf|eot|otf|pdf|zip|tar\.gz|tgz|exe|bin|so|dylib|dll)$/i,
  /\.(map|min\.js|min\.css)$/i,
];

const DEFAULT_SECRET_PATTERNS = [
  /(api[_-]?key|secret|token|password|private[_-]?key|auth|credential)s?\s*[:=]\s*["'][^"']{8,}["']/i,
  /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9\-_]{20,}/,
];

export const CONFIG: ServerConfig = {
  env: (process.env.NODE_ENV as ServerConfig['env']) || 'development',
  budget: DEFAULT_BUDGET,
  excludedPathPatterns: DEFAULT_EXCLUDED_PATHS,
  excludedFilePatterns: DEFAULT_EXCLUDED_FILES,
  secretPatterns: DEFAULT_SECRET_PATTERNS,
  githubToken: process.env.GITHUB_TOKEN,
  linkedinToken: process.env.LINKEDIN_TOKEN,
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  defaultPathway: 'full-stack-developer',
};

export function isPathExcluded(path: string): boolean {
  const normalized = path.replace(/\\/g, '/');
  return CONFIG.excludedPathPatterns.some((p) => p.test(normalized)) ||
    CONFIG.excludedFilePatterns.some((p) => p.test(normalized));
}

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of CONFIG.secretPatterns) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}
