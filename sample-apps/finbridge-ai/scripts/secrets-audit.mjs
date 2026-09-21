#!/usr/bin/env node
/**
 * FinBridge AI — pre-submission secrets audit
 *
 *   npm run audit:secrets
 *
 * Jeevan's 06:00 job. Checks what git would actually publish, not what is on
 * disk — the two differ, and only the first one matters once the repo is public.
 *
 * Exit code 0 = safe to submit. Non-zero = do not push.
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const problems = [];
const notes = [];

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

let tracked = [];
try {
  tracked = git('ls-files').split('\n').filter(Boolean);
} catch {
  console.error('✗ Not a git repository, or git is unavailable.');
  process.exit(2);
}

// 1. Files that must never be tracked -----------------------------------
const FORBIDDEN = [
  { pattern: /(^|\/)\.env$/, label: '.env' },
  { pattern: /(^|\/)\.env\.(local|production|development)/, label: '.env.*' },
  { pattern: /(^|\/)node_modules\//, label: 'node_modules' },
  { pattern: /(^|\/)dist\//, label: 'dist' },
  { pattern: /\.pem$/, label: 'PEM key' },
  { pattern: /\.p12$/, label: 'PKCS#12 key' },
  { pattern: /(^|\/)id_rsa/, label: 'SSH key' },
  { pattern: /(^|\/)tokens?\.json$/, label: 'token file' },
  { pattern: /(^|\/)\.nitrostudio\//, label: '.nitrostudio' },
  { pattern: /(^|\/)sweeps\//, label: 'sweep logs' }
];

for (const file of tracked) {
  for (const { pattern, label } of FORBIDDEN) {
    if (pattern.test(file)) problems.push(`tracked ${label}: ${file}`);
  }
}

// 2. Secret-shaped strings in tracked text files -------------------------
const SECRET_PATTERNS = [
  { re: /\bsk-[A-Za-z0-9]{20,}/, label: 'OpenAI-style key' },
  { re: /\bghp_[A-Za-z0-9]{30,}/, label: 'GitHub token' },
  { re: /\bAKIA[0-9A-Z]{16}\b/, label: 'AWS access key id' },
  { re: /\bAIza[0-9A-Za-z_-]{30,}/, label: 'Google API key' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: 'private key block' },
  { re: /\b(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*['"][^'"\s]{12,}['"]/i, label: 'assigned credential' }
];

const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.env', '.example', '.sh', '.txt']);

for (const file of tracked) {
  const ext = path.extname(file);
  if (!TEXT_EXT.has(ext) && ext !== '') continue;
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) continue;
  const stat = fs.statSync(abs);
  // git ls-files can surface submodule roots and other non-files; reading one
  // throws EISDIR and kills the audit.
  if (!stat.isFile()) continue;
  if (stat.size > 2_000_000) continue;
  const content = fs.readFileSync(abs, 'utf-8');
  for (const { re, label } of SECRET_PATTERNS) {
    const m = content.match(re);
    if (!m) continue;
    // .env.example is meant to hold empty placeholders — flag only if filled in.
    if (file.endsWith('.env.example') && /=\s*$/m.test(m[0])) continue;
    problems.push(`${label} in ${file}: ${m[0].slice(0, 40)}…`);
  }
}

// 3. .gitignore coverage --------------------------------------------------
const gitignore = fs.existsSync(path.join(ROOT, '.gitignore'))
  ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8')
  : '';
for (const entry of ['.env', 'node_modules', 'dist']) {
  if (!gitignore.split('\n').some((l) => l.trim().replace(/\/$/, '') === entry)) {
    problems.push(`.gitignore does not cover "${entry}"`);
  }
}
if (!gitignore.includes('sweeps')) notes.push('consider adding sweeps/ to .gitignore');

// 4. Every env var read in src/ appears in .env.example -------------------
const envExample = fs.existsSync(path.join(ROOT, '.env.example'))
  ? fs.readFileSync(path.join(ROOT, '.env.example'), 'utf-8')
  : '';
const used = new Set();
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name)) {
      for (const m of fs.readFileSync(p, 'utf-8').matchAll(/process\.env\.([A-Z0-9_]+)/g)) used.add(m[1]);
    }
  }
}
walk(path.join(ROOT, 'src'));
for (const v of used) {
  if (!new RegExp(`^\\s*#?\\s*${v}\\s*=`, 'm').test(envExample)) {
    problems.push(`env var ${v} is read in src/ but absent from .env.example`);
  }
}

// ------------------------------------------------------------------ report
console.log('\nFinBridge secrets audit\n' + '─'.repeat(40));
console.log(`tracked files scanned: ${tracked.length}`);
console.log(`env vars referenced:   ${used.size ? [...used].join(', ') : 'none'}`);

if (notes.length) {
  console.log('\nNotes:');
  for (const n of notes) console.log(`  · ${n}`);
}

if (problems.length) {
  console.log(`\n✗ ${problems.length} problem(s) — DO NOT PUSH:\n`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  console.log('');
  process.exit(1);
}

console.log('\n✓ Clean. No .env, no node_modules, no keys in tracked files.\n');
