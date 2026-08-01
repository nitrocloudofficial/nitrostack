import path from 'path';
import fs from 'fs-extra';
import { loadCanonicalGitignore } from './canonical-gitignore.js';
import { ENV_EXCLUDED_PATTERNS, HARD_EXCLUDED_PATTERNS } from './exclusions.js';
import { createIgnoreMatcher, type IgnoreMatcher } from './ignore-matcher.js';
import type { GitignoreMergeResult } from './types.js';

const GIT_DIR_PATTERN = '.git/';

export interface BuildIgnoreMatcherOptions {
  includeEnv?: boolean;
}

export type { IgnoreMatcher };

function normalizeRuleLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  return trimmed;
}

function parseRules(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map(normalizeRuleLine)
    .filter((line): line is string => line !== null);
}

function isEnvRule(rule: string): boolean {
  return ENV_EXCLUDED_PATTERNS.some((pattern) => {
    if (pattern === rule) return true;
    if (pattern === '.env.*.local') {
      return /^\.env\..+\.local$/.test(rule) || rule === '.env.*.local';
    }
    return rule === pattern || rule.startsWith(`${pattern}/`);
  }) || rule === '.env' || rule.startsWith('.env.');
}

/**
 * Non-destructively merge canonical rules into a local .gitignore.
 * Existing local rules are preserved; only missing canonical rules are appended.
 */
export function mergeGitignoreRules(
  localContent: string,
  canonicalContent: string,
): GitignoreMergeResult {
  const localRules = parseRules(localContent);
  const canonicalRules = parseRules(canonicalContent);
  const existing = new Set(localRules);

  const addedRules: string[] = [];
  for (const rule of canonicalRules) {
    if (!existing.has(rule)) {
      addedRules.push(rule);
      existing.add(rule);
    }
  }

  if (!existing.has(GIT_DIR_PATTERN)) {
    addedRules.push(GIT_DIR_PATTERN);
    existing.add(GIT_DIR_PATTERN);
  }

  const newlyAddedRules = addedRules.filter((rule) => !localRules.includes(rule));
  const updated = newlyAddedRules.length > 0;

  if (!updated) {
    const normalized = localContent.endsWith('\n') || localContent.length === 0
      ? localContent
      : `${localContent}\n`;
    return {
      mergedContent: normalized,
      addedRules: [],
      updated: false,
    };
  }

  const mergedContent = rebuildGitignoreContent(localContent, newlyAddedRules);

  return {
    mergedContent,
    addedRules: newlyAddedRules,
    updated: true,
  };
}

function rebuildGitignoreContent(localContent: string, appendedRules: string[]): string {
  const base = localContent.trimEnd();
  const suffix = appendedRules.join('\n');
  return base.length > 0 ? `${base}\n\n# Added by nitrostack pack\n${suffix}\n` : `${suffix}\n`;
}

/**
 * Sync local .gitignore with canonical rules when enabled.
 */
export async function syncProjectGitignore(
  projectRoot: string,
  syncGitignore: boolean,
): Promise<GitignoreMergeResult> {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const canonicalContent = await loadCanonicalGitignore();
  const localContent = (await fs.pathExists(gitignorePath))
    ? await fs.readFile(gitignorePath, 'utf-8')
    : '';

  const mergeResult = mergeGitignoreRules(localContent, canonicalContent);

  if (syncGitignore && mergeResult.updated) {
    await fs.writeFile(gitignorePath, mergeResult.mergedContent, 'utf-8');
    return mergeResult;
  }

  // Matcher still uses merged rules, but only report an update when we actually wrote.
  return {
    mergedContent: mergeResult.mergedContent,
    addedRules: [],
    updated: false,
  };
}

/**
 * Build a gitignore matcher from merged project rules and hard-coded exclusions.
 */
export function buildIgnoreMatcher(
  mergedGitignoreContent: string,
  options: BuildIgnoreMatcherOptions = {},
): IgnoreMatcher {
  const includeEnv = options.includeEnv ?? false;
  let mergedRules = parseRules(mergedGitignoreContent);

  if (includeEnv) {
    mergedRules = mergedRules.filter((rule) => !isEnvRule(rule));
  }

  const hardPatterns = includeEnv
    ? HARD_EXCLUDED_PATTERNS.filter((pattern) => !ENV_EXCLUDED_PATTERNS.includes(pattern))
    : HARD_EXCLUDED_PATTERNS;

  const allRules = [...mergedRules];

  for (const pattern of hardPatterns) {
    if (!allRules.includes(pattern)) {
      allRules.push(pattern);
    }
  }

  if (!allRules.includes(GIT_DIR_PATTERN)) {
    allRules.push(GIT_DIR_PATTERN);
  }

  return createIgnoreMatcher(allRules);
}

export function isPathIgnored(
  matcher: IgnoreMatcher,
  projectRoot: string,
  absolutePath: string,
  isDirectory: boolean = false,
): boolean {
  const relativePath = path.relative(projectRoot, absolutePath).split(path.sep).join('/');
  if (!relativePath || relativePath === '.') {
    return false;
  }
  return matcher.ignores(relativePath, isDirectory);
}
