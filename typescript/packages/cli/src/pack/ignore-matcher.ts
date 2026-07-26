/**
 * Lightweight gitignore-style matcher implemented in-house (no external ignore package).
 * Supports the pattern subset used by nitrostack pack:
 * - Directory rules: dist/, .git/
 * - Recursive directory rules: slash-star-star/dist/
 * - Exact file names: .env, .DS_Store
 * - Simple globs: *.log, *.tsbuildinfo, npm-debug.log*, .env.*.local
 * - Path-anchored rules with / (match relative to project root)
 * - Negation with leading ! (last matching rule wins)
 */

export interface IgnoreMatcher {
  ignores(relativePath: string, isDirectory?: boolean): boolean;
  add(patterns: string | string[]): IgnoreMatcher;
}

interface CompiledRule {
  raw: string;
  negated: boolean;
  directoryOnly: boolean;
  anchored: boolean;
  regex: RegExp;
  /** Matches only paths under the directory (requires a slash after the dir name). */
  underRegex: RegExp | null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a single gitignore-like pattern into a RegExp that matches
 * the full relative path (forward-slash separated, no leading ./).
 */
function compilePattern(pattern: string): CompiledRule | null {
  let raw = pattern.trim();
  if (!raw || raw.startsWith('#')) {
    return null;
  }

  let negated = false;
  if (raw.startsWith('!')) {
    negated = true;
    raw = raw.slice(1);
  }

  if (raw.startsWith('\\!')) {
    raw = raw.slice(1);
  }

  let directoryOnly = false;
  if (raw.endsWith('/')) {
    directoryOnly = true;
    raw = raw.slice(0, -1);
  }

  if (!raw) {
    return null;
  }

  const anchored = raw.startsWith('/');
  if (anchored) {
    raw = raw.slice(1);
  }

  const hasSlash = raw.includes('/');
  const isRecursivePrefix = raw.startsWith('**/');
  const basenameOnly = !anchored && !hasSlash;

  let body = '';
  let i = 0;
  while (i < raw.length) {
    if (raw.startsWith('**/', i)) {
      body += '(?:.*/)?';
      i += 3;
      continue;
    }
    if (raw[i] === '*') {
      body += '[^/]*';
      i += 1;
      continue;
    }
    if (raw[i] === '?') {
      body += '[^/]';
      i += 1;
      continue;
    }
    body += escapeRegex(raw[i]);
    i += 1;
  }

  let source: string;
  if (isRecursivePrefix || raw.includes('**/')) {
    source = `^${body}(?:/.*)?$`;
  } else if (basenameOnly) {
    // Match the basename anywhere in the path (gitignore default)
    source = `(^|/)${body}(?:/.*)?$`;
  } else if (anchored || hasSlash) {
    source = `^${body}(?:/.*)?$`;
  } else {
    source = `(^|/)${body}(?:/.*)?$`;
  }

  // For directory-only rules, also compile a regex that requires a child path
  // so a plain file named "dist" is not treated like directory "dist/".
  let underSource: string;
  if (isRecursivePrefix || raw.includes('**/')) {
    underSource = `^${body}/.+$`;
  } else if (basenameOnly) {
    underSource = `(^|/)${body}/.+$`;
  } else {
    underSource = `^${body}/.+$`;
  }

  return {
    raw: pattern.trim(),
    negated,
    directoryOnly,
    anchored,
    regex: new RegExp(source),
    underRegex: directoryOnly ? new RegExp(underSource) : null,
  };
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

/**
 * Create a matcher from a list of gitignore-style patterns.
 */
export function createIgnoreMatcher(patterns: string[] = []): IgnoreMatcher {
  const rules: CompiledRule[] = [];

  const matcher: IgnoreMatcher = {
    add(input: string | string[]): IgnoreMatcher {
      const list = Array.isArray(input) ? input : [input];
      for (const pattern of list) {
        const compiled = compilePattern(pattern);
        if (compiled) {
          rules.push(compiled);
        }
      }
      return matcher;
    },

    ignores(relativePath: string, isDirectory: boolean = false): boolean {
      const normalized = normalizeRelativePath(relativePath);
      if (!normalized || normalized === '.') {
        return false;
      }

      // Trailing slash is a directory hint (gitignore-style)
      const asDirectory = isDirectory || relativePath.replace(/\\/g, '/').endsWith('/');

      let ignored = false;

      for (const rule of rules) {
        if (!rule.regex.test(normalized)) {
          continue;
        }

        if (rule.directoryOnly && !asDirectory) {
          // Plain file: only ignore if it lives under the directory, not if it
          // merely shares the directory's name (e.g. file "dist" vs dir "dist/").
          if (!rule.underRegex || !rule.underRegex.test(normalized)) {
            continue;
          }
        }

        ignored = !rule.negated;
      }

      return ignored;
    },
  };

  if (patterns.length > 0) {
    matcher.add(patterns);
  }

  return matcher;
}
