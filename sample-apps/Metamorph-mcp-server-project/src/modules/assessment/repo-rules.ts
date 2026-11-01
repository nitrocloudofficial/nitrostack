// Repository-wide text rules that are not tied to one language: credentials written into source, and risky GitHub Actions
// workflows. Pure functions, no I/O. Findings carry file:line and the TYPE of the secret, never the matched text.
import type { Finding } from './types.js';

export interface TextFile {
  path: string;
  content: string;
}

const MAX_PER_RULE = 5;
const MAX_LINE = 2000; // longer lines are minified or generated; matching them costs time and finds noise

// ---------- secrets in source ----------
// Each pattern is a documented, vendor-specific format, not a generic "looks random" heuristic:
//  AWS access key id    AKIA + 16 upper-case letters/digits (IAM user key id prefix, AWS docs)
//  private key block    a PEM header for an RSA, EC, DSA, OpenSSH, PGP or plain private key
//  GitHub token         ghp_/gho_/ghu_/ghs_/ghr_ + 36 or more characters, or github_pat_ + 22 or more
// Built from parts so this file does not match its own patterns.
const PEM_DASHES = '-'.repeat(5);
const SECRET_TYPES: Array<{ type: string; re: RegExp; ignore?: (match: string) => boolean }> = [
  // AWS documents AKIAIOSFODNN7EXAMPLE and AKIAI44QH8DHBEXAMPLE as example keys: every id ending in EXAMPLE is skipped.
  { type: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/, ignore: (m) => m.endsWith('EXAMPLE') },
  { type: 'private key block', re: new RegExp(`${PEM_DASHES}BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?${PEM_DASHES}`) },
  { type: 'GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b/ }
];

export function scanSecrets(files: TextFile[]): Finding[] {
  const out: Finding[] = [];
  for (const file of files) {
    if (out.length >= MAX_PER_RULE) break;
    // Quick reject keeps the scan cheap on large files with no candidate at all.
    if (!/AKIA|PRIVATE KEY|gh[pousr]_|github_pat_/.test(file.content)) continue;
    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length && out.length < MAX_PER_RULE; i++) {
      const line = lines[i] ?? '';
      if (line.length > MAX_LINE) continue;
      for (const { type, re, ignore } of SECRET_TYPES) {
        const m = line.match(re);
        if (!m || ignore?.(m[0])) continue;
        out.push({
          id: 'hardcoded-secret-in-source',
          category: 'security',
          severity: 'high',
          title: `Hard-coded credential in source (${type})`,
          evidence: `${file.path}:${i + 1} (${type})`,
          recommendation: 'Revoke and rotate this credential now, remove it from the code and from git history, and load it from environment or a secret store instead.'
        });
        break; // one finding per line
      }
    }
  }
  return out;
}

// ---------- risky GitHub Actions workflows ----------
// 1. pull_request_target runs with the base repository's secrets and a write token. Checking out the pull request's HEAD
//    (code the author controls) in that context lets any contributor run code with those secrets.
// 2. `uses: owner/repo@main` follows a branch that can change at any time, so the workflow runs code nobody reviewed.
//    Only branch-like refs are flagged (main, master, develop, dev, trunk, HEAD, latest); versions and commit SHAs pass.
const PR_HEAD_REF = /\bref:\s*.*(?:github\.event\.pull_request\.head\.(?:sha|ref)|github\.head_ref|refs\/pull\/[^\s'"]*\/(?:head|merge))/;
const PR_HEAD_REPO = /\brepository:\s*.*github\.event\.pull_request\.head\.repo/;
const MOVING_REF = /^\s*-?\s*uses:\s*['"]?(?!\.\/|docker:\/\/)([\w.-]+\/[\w./-]+)@(main|master|develop|dev|trunk|HEAD|latest)['"]?\s*(?:#.*)?$/i;

function hasPullRequestTarget(lines: string[]): boolean {
  return lines.some((l) => !l.trimStart().startsWith('#') && /\bpull_request_target\b/.test(l));
}

export function scanWorkflows(files: TextFile[]): Finding[] {
  const out: Finding[] = [];
  const count = { target: 0, moving: 0 };
  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    const target = hasPullRequestTarget(lines);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (line.trimStart().startsWith('#') || line.length > MAX_LINE) continue;
      if (target && count.target < MAX_PER_RULE && (PR_HEAD_REF.test(line) || PR_HEAD_REPO.test(line))) {
        count.target++;
        out.push({
          id: 'ci-pr-target-checkout',
          category: 'security',
          severity: 'high',
          title: 'Workflow checks out pull request code under pull_request_target',
          evidence: `${file.path}:${i + 1}`,
          recommendation: 'Use the pull_request trigger for code from forks, or keep pull_request_target but never check out or run the pull request head.'
        });
      }
      const m = line.match(MOVING_REF);
      if (m && count.moving < MAX_PER_RULE) {
        count.moving++;
        out.push({
          id: 'ci-action-unpinned-branch',
          category: 'security',
          severity: 'medium',
          title: 'GitHub Action is pinned to a moving branch',
          evidence: `${file.path}:${i + 1} (${m[1]}@${m[2]})`,
          recommendation: 'Pin the action to a released version tag or, better, a full commit SHA.'
        });
      }
    }
  }
  return out;
}
