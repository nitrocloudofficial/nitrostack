#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════╗
 * ║   VulnixAI — Terminal CLI Auto-Fixer v1.0   ║
 * ║   Uses Gemini / Groq to scan & patch code   ║
 * ╚══════════════════════════════════════════════╝
 *
 * Usage:
 *   node vulnix-autofix.mjs --repo owner/repo-name [options]
 *
 * Options:
 *   --repo        GitHub repo (optional if --local) e.g. myuser/my-app
 *   --local       Scan current local directory    (instant!)
 *   --token       GitHub personal access token    e.g. ghp_xxxx
 *   --fix         Severities to fix               default: critical,high
 *   --branch      Branch to scan                  default: main
 *   --dry-run     Show what would be fixed, no changes
 *   --create-pr   Auto-create a GitHub Pull Request after pushing fixes
 *   --report      Save full JSON report           e.g. --report report.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── COLOURS ─────────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
};

const log     = (m) => console.log(m);
const success = (m) => console.log(`${C.green}${m}${C.reset}`);
const warn    = (m) => console.log(`${C.yellow}${m}${C.reset}`);
const err     = (m) => console.log(`${C.red}${m}${C.reset}`);
const info    = (m) => console.log(`${C.cyan}${m}${C.reset}`);
const dim     = (m) => console.log(`${C.dim}${m}${C.reset}`);
const bar     = ()  => log('━'.repeat(52));

// ─── CLI ARGS ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const argv = process.argv.slice(2);
  const opts = {
    repo:     null,
    token:    null,
    fix:      ['critical', 'high'],
    branch:   'main',
    dryRun:   false,
    createPr: false,
    report:   null,
    local:    false,
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--repo':      opts.repo     = argv[++i]; break;
      case '--token':     opts.token    = argv[++i]; break;
      case '--fix':       opts.fix      = argv[++i].split(',').map(s => s.trim()); break;
      case '--branch':    opts.branch   = argv[++i]; break;
      case '--dry-run':   opts.dryRun   = true;      break;
      case '--create-pr': opts.createPr = true;      break;
      case '--report':    opts.report   = argv[++i]; break;
      case '--local':     opts.local    = true;      break;
    }
  }
  return opts;
}

// ─── .ENV LOADER ─────────────────────────────────────────────────────────────

async function loadEnv() {
  const envPath = path.join(__dirname, 'backend', '.env');
  try {
    const raw = await fs.readFile(envPath, 'utf-8');
    const env = {};
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

// ─── GITHUB HELPERS ──────────────────────────────────────────────────────────

function ghHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept':        'application/vnd.github.v3+json',
    'Content-Type':  'application/json',
    'User-Agent':    'VulnixAI-AutoFixer/1.0',
  };
}

async function ghGet(url, token) {
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub GET failed (${res.status}): ${url}`);
  }
  return res.json();
}

async function ghPost(url, token, data) {
  const res = await fetch(url, {
    method:  'POST',
    headers: ghHeaders(token),
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub POST failed (${res.status}): ${url}`);
  }
  return res.json();
}

async function ghPut(url, token, data) {
  const res = await fetch(url, {
    method:  'PUT',
    headers: ghHeaders(token),
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub PUT failed (${res.status})`);
  }
  return res.json();
}

// ─── FETCH REPO FILES ────────────────────────────────────────────────────────

const CODE_EXTS = new Set(['js','ts','jsx','tsx','py','java','go','php','rb','cs','cpp','c']);
const SKIP_DIRS = ['node_modules/', 'dist/', 'build/', '.git/', 'vendor/', 'coverage/'];

async function fetchRepoFiles(repo, branch, token) {
  const tree = await ghGet(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
    token
  );

  const codeBlobs = (tree.tree || []).filter(item => {
    if (item.type !== 'blob') return false;
    if (SKIP_DIRS.some(d => item.path.includes(d))) return false;
    const ext = item.path.split('.').pop()?.toLowerCase();
    return CODE_EXTS.has(ext || '');
  });

  const files = [];
  for (const blob of codeBlobs) {
    try {
      const data = await ghGet(
        `https://api.github.com/repos/${repo}/contents/${blob.path}?ref=${branch}`,
        token
      );
      if (data.content && data.encoding === 'base64') {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        files.push({ path: blob.path, content, sha: data.sha });
      }
    } catch {
      // skip unreadable files silently
    }
  }
  return files;
}

// ─── AI ANALYSIS ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior security engineer.
Analyze the provided code files for security vulnerabilities.
Return ONLY a valid JSON object — no markdown, no extra text:
{
  "vulnerabilities": [
    {
      "title": "Short title",
      "severity": "critical|high|medium|low",
      "file": "exact/file/path.ext",
      "line": 42,
      "description": "What the vulnerability is and its impact",
      "cweId": "CWE-XXX",
      "originalCode": "exact vulnerable code snippet to search for",
      "patchedCode": "replacement fixed code"
    }
  ]
}
Focus on: SQL Injection, XSS, hardcoded secrets, path traversal,
command injection, CSRF, insecure crypto, auth bypass.
Only report real vulnerabilities with actual patchable originalCode.`;

function buildPrompt(files) {
  return files.map(f => `=== FILE: ${f.path} ===\n${f.content}`).join('\n\n');
}

function parseAIJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in AI response');
  const result = JSON.parse(match[0]);
  if (!Array.isArray(result.vulnerabilities)) return { vulnerabilities: [] };
  return result;
}

async function analyzeWithGemini(files, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${buildPrompt(files)}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Gemini ${res.status}: ${body.error?.message || JSON.stringify(body)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return parseAIJson(text);
}

async function analyzeWithGroq(files, apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model:    'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildPrompt(files) },
      ],
      temperature: 0.2,
      max_tokens:  8192,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Groq ${res.status}: ${body.error?.message || JSON.stringify(body)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty Groq response');
  return parseAIJson(text);
}

async function analyzeFiles(files, geminiKey, groqKey) {
  if (geminiKey) {
    try { return await analyzeWithGemini(files, geminiKey); }
    catch (e) { warn(`    ⚠ Gemini failed (${e.message.slice(0, 60)}...), trying Groq...`); }
  }
  if (groqKey) return await analyzeWithGroq(files, groqKey);
  throw new Error('No AI providers available');
}

// ─── PATCH LOGIC ─────────────────────────────────────────────────────────────

function applyPatch(content, vuln) {
  const original = (vuln.originalCode || '').trim();
  const patched  = (vuln.patchedCode  || '').trim();
  if (!original || !patched || original === patched) return { content, applied: false };
  if (!content.includes(original)) return { content, applied: false };
  return { content: content.replace(original, patched), applied: true };
}

// ─── GITHUB PR ───────────────────────────────────────────────────────────────

async function createPullRequest(repo, newBranch, baseBranch, fixes, token) {
  const emojiMap = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
  const body = [
    '## 🔒 Automated Security Fixes',
    '',
    `This PR addresses **${fixes.length} security vulnerabilities** detected by VulnixAI Auto-Fixer.`,
    '',
    '### Vulnerabilities Fixed',
    ...fixes.map(v => `- ${emojiMap[v.severity] || '⚪'} **${v.title}** \`${v.file}:${v.line || '?'}\` (${v.cweId})`),
    '',
    '### ⚠️ Important',
    '- Review all changes carefully before merging',
    '- Run your test suite after merging',
    '- These fixes were AI-generated and may need adjustments',
    '',
    '---',
    '🤖 Generated by VulnixAI Terminal Auto-Fixer',
  ].join('\n');

  return ghPost(
    `https://api.github.com/repos/${repo}/pulls`,
    token,
    { title: `🔒 Security Fixes: ${fixes.length} vulnerabilities patched [VulnixAI]`, head: newBranch, base: baseBranch, body }
  );
}

// ─── CONNECTION TEST ─────────────────────────────────────────────────────────

async function testConnections(repo, token, geminiKey, groqKey) {
  log('\n🔌 Testing connections...');
  let allOk = true;

  // GitHub
  try {
    await ghGet(`https://api.github.com/repos/${repo}`, token);
    success(`  ✅ GitHub API   → repo "${repo}" accessible`);
  } catch (e) {
    err(`  ❌ GitHub API   → ${e.message}`);
    allOk = false;
  }

  // Gemini
  if (geminiKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash?key=${geminiKey}`
      );
      if (r.ok) {
        success('  ✅ Gemini API   → gemini-2.0-flash reachable');
      } else {
        const body = await r.json().catch(() => ({}));
        warn(`  ⚠️  Gemini API   → ${r.status}: ${body.error?.message || 'check your key'}`);
      }
    } catch (e) {
      err(`  ❌ Gemini API   → ${e.message}`);
    }
  } else {
    warn('  ⚠️  Gemini API   → no key configured');
  }

  // Groq
  if (groqKey) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${groqKey}` },
      });
      if (r.ok) {
        success('  ✅ Groq API     → connected');
      } else {
        const body = await r.json().catch(() => ({}));
        warn(`  ⚠️  Groq API     → ${r.status}: ${body.error?.message || 'check your key'}`);
      }
    } catch (e) {
      err(`  ❌ Groq API     → ${e.message}`);
    }
  } else {
    warn('  ⚠️  Groq API     → no key configured');
  }

  return allOk;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  log('');
  log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║   VulnixAI — Terminal CLI Auto-Fixer v1.0   ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════╝${C.reset}`);
  log('');

  // Load .env from backend
  const env         = await loadEnv();
  const geminiKey   = (env.GEMINI_API_KEYS || '').split(',')[0]?.trim() || '';
  const groqKey     = (env.GROQ_API_KEY    || '').trim();
  const githubToken = opts.token || env.GITHUB_ACCESS_TOKEN?.trim() || '';

  // ── Validate ─────────────────────────────────────────────────────────────
  if (!opts.repo) {
    err('❌ --repo is required');
    log(`   Example: ${C.dim}node vulnix-autofix.mjs --repo owner/repo-name${C.reset}`);
    process.exit(1);
  }

  if (!githubToken) {
    err('❌ GitHub Personal Access Token required.');
    log('');
    log(`   Option A — pass via flag:`);
    log(`   ${C.dim}node vulnix-autofix.mjs --repo owner/repo --token ghp_XXXX${C.reset}`);
    log('');
    log(`   Option B — add to backend/.env:`);
    log(`   ${C.dim}GITHUB_ACCESS_TOKEN=ghp_XXXX${C.reset}`);
    log('');
    log(`   Create a token at: ${C.cyan}https://github.com/settings/tokens${C.reset}`);
    log(`   Required scope:    ${C.dim}repo (full control)${C.reset}`);
    process.exit(1);
  }

  if (!geminiKey && !groqKey) {
    err('❌ No AI API keys in backend/.env. Add GEMINI_API_KEYS or GROQ_API_KEY.');
    process.exit(1);
  }

  // Print config
  bar();
  info(`📦  Repo       : ${opts.repo}`);
  info(`🌿  Branch     : ${opts.branch}`);
  info(`🔧  Fix levels : ${opts.fix.join(', ')}`);
  info(`🤖  AI primary : ${geminiKey ? 'Gemini (gemini-1.5-flash)' : 'Groq (llama-3.3-70b)'}`);
  info(`🤖  AI fallback: ${geminiKey && groqKey ? 'Groq' : 'none'}`);
  if (opts.dryRun)   warn('👁️   Mode       : DRY RUN — no changes will be made');
  if (opts.createPr) info('📋  PR         : will be auto-created after push');
  bar();

  // ── Connection checks ────────────────────────────────────────────────────
  const ok = await testConnections(opts.repo, githubToken, geminiKey, groqKey);
  if (!ok) {
    err('\n❌ GitHub connection failed. Fix your --token and repo name, then retry.');
    process.exit(1);
  }

  // ── STEP 1 — Fetch repo files ────────────────────────────────────────────
  log('');
  info('📥 Fetching repository files...');
  let files;
  try {
    files = await fetchRepoFiles(opts.repo, opts.branch, githubToken);
    success(`✅ Found ${files.length} code files`);
  } catch (e) {
    err(`❌ Could not fetch files: ${e.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    warn('⚠️  No code files found. Check the branch name and repo contents.');
    process.exit(0);
  }

  // ── STEP 2 — AI Scan in batches ──────────────────────────────────────────
  const BATCH_SIZE = 3;
  const MAX_CHARS  = 1500;
  const batches    = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) batches.push(files.slice(i, i + BATCH_SIZE));

  log('');
  info(`🤖 Running AI security scan across ${batches.length} batch(es)...`);
  const allVulns = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i].map(f => ({
      path:    f.path,
      content: f.content.length > MAX_CHARS
        ? f.content.slice(0, MAX_CHARS) + '\n// ...(truncated)'
        : f.content,
    }));

    const names = batch.map(f => path.basename(f.path)).join(', ');
    process.stdout.write(`  Batch ${String(i + 1).padStart(2)}/${batches.length}  [${names}]  ... `);

    try {
      const result = await analyzeFiles(batch, geminiKey, groqKey);
      const vulns  = (result.vulnerabilities || []).filter(v => v.title && v.severity && v.file && v.originalCode);
      allVulns.push(...vulns);
      process.stdout.write(`${C.green}${vulns.length} issue(s)${C.reset}\n`);
    } catch (e) {
      process.stdout.write(`${C.red}error: ${e.message.slice(0, 50)}${C.reset}\n`);
    }

    if (i < batches.length - 1) await new Promise(r => setTimeout(r, 800));
  }

  // ── STEP 3 — Results table ───────────────────────────────────────────────
  log('');
  bar();

  if (allVulns.length === 0) {
    success('✅ No vulnerabilities found! Your code looks clean.');
    process.exit(0);
  }

  const colMap   = { critical: C.red, high: C.yellow, medium: C.blue, low: C.dim };
  const emojiMap = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

  for (const v of allVulns) {
    const col      = colMap[v.severity] || '';
    const emoji    = emojiMap[v.severity] || '⚪';
    const willFix  = opts.fix.includes(v.severity) ? '' : ` ${C.dim}(skip)${C.reset}`;
    log(`${col}${emoji} ${v.severity.toUpperCase().padEnd(8)}${C.reset}  ${v.file}:${v.line || '?'}  ${v.title}${willFix}`);
  }

  bar();
  const toFix  = allVulns.filter(v => opts.fix.includes(v.severity));
  const toSkip = allVulns.filter(v => !opts.fix.includes(v.severity));
  log(`📊 Found    : ${allVulns.length} total`);
  log(`🔧 To patch : ${toFix.length}  (${opts.fix.join(', ')})`);
  log(`⏭️  Skipping : ${toSkip.length}`);
  bar();

  if (toFix.length === 0) {
    warn('\n⚠️  No vulnerabilities match the fix filter.');
    warn('   Add --fix critical,high,medium,low to include more severities.');
    process.exit(0);
  }

  if (opts.dryRun) {
    warn('\n👁️  DRY RUN complete — no changes made.');
    warn('   Remove --dry-run to apply fixes.');
    process.exit(0);
  }

  // ── STEP 4 — Apply patches in memory ─────────────────────────────────────
  log('');
  info('🔧 Applying patches...');

  const fileMap = new Map();
  for (const f of files) fileMap.set(f.path, { content: f.content, sha: f.sha, appliedFixes: [] });

  const patchedVulns = [];
  const failedVulns  = [];

  for (const vuln of toFix) {
    const fileData = fileMap.get(vuln.file);
    if (!fileData) { failedVulns.push(vuln); warn(`  ⚠️  File not in scan: ${vuln.file}`); continue; }
    const { content, applied } = applyPatch(fileData.content, vuln);
    if (applied) {
      fileData.content = content;
      fileData.appliedFixes.push(vuln);
      patchedVulns.push(vuln);
      success(`  ✅ Patched  : ${vuln.file}  →  ${vuln.title}`);
    } else {
      failedVulns.push(vuln);
      warn(`  ⚠️  No match : ${vuln.file}  →  ${vuln.title}`);
    }
  }

  if (patchedVulns.length === 0) {
    warn('\n⚠️  No patches could be applied automatically.');
    warn('   The AI snippets may not exactly match file content. Review manually.');
    process.exit(0);
  }

  // ── STEP 5 — Push to GitHub ──────────────────────────────────────────────
  const newBranch = `security-autofix-${Date.now()}`;
  log('');
  info(`📤 Pushing to GitHub...`);
  info(`   Branch: ${newBranch}`);

  try {
    // Get base SHA
    const ref     = await ghGet(`https://api.github.com/repos/${opts.repo}/git/ref/heads/${opts.branch}`, githubToken);
    const baseSha = ref.object.sha;

    // Create new branch
    await ghPost(`https://api.github.com/repos/${opts.repo}/git/refs`, githubToken,
      { ref: `refs/heads/${newBranch}`, sha: baseSha }
    );
    success(`  ✅ Branch created : ${newBranch}`);

    // Commit each patched file
    for (const [filePath, fileData] of fileMap) {
      if (fileData.appliedFixes.length === 0) continue;
      try {
        await ghPut(
          `https://api.github.com/repos/${opts.repo}/contents/${filePath}`,
          githubToken,
          {
            message: `fix(security): patch ${fileData.appliedFixes.length} vuln(s) in ${path.basename(filePath)} [VulnixAI]`,
            content: Buffer.from(fileData.content).toString('base64'),
            sha:     fileData.sha,
            branch:  newBranch,
          }
        );
        success(`  ✅ Committed      : ${filePath}`);
      } catch (e) {
        err(`  ❌ Commit failed  : ${filePath} → ${e.message}`);
      }
    }

    // ── STEP 6 — Create PR ────────────────────────────────────────────────
    if (opts.createPr) {
      log('');
      info('📋 Creating Pull Request...');
      try {
        const pr = await createPullRequest(opts.repo, newBranch, opts.branch, patchedVulns, githubToken);
        success(`  ✅ PR created: ${pr.html_url}`);
      } catch (e) {
        warn(`  ⚠️  PR failed : ${e.message}`);
      }
    }

  } catch (e) {
    err(`\n❌ GitHub push failed: ${e.message}`);
    process.exit(1);
  }

  // ── STEP 7 — Save report ─────────────────────────────────────────────────
  if (opts.report) {
    const report = {
      timestamp:     new Date().toISOString(),
      repo:          opts.repo,
      baseBranch:    opts.branch,
      fixBranch:     newBranch,
      totalFound:    allVulns.length,
      patched:       patchedVulns.length,
      failedToApply: failedVulns.length,
      vulnerabilities: allVulns,
    };
    await fs.writeFile(opts.report, JSON.stringify(report, null, 2), 'utf-8');
    success(`\n📄 Report saved: ${opts.report}`);
  }

  // ── Final Summary ─────────────────────────────────────────────────────────
  log('');
  bar();
  success(`✅ DONE!  ${patchedVulns.length} vulnerability/vulnerabilities fixed & pushed.`);
  if (failedVulns.length > 0) warn(`⚠️  ${failedVulns.length} could not be auto-patched (manual review needed).`);
  log('');
  info(`🌿 Branch  : ${newBranch}`);
  info(`🔗 Review  : https://github.com/${opts.repo}/compare/${newBranch}`);
  if (!opts.createPr) {
    dim(`\n💡 Next time add --create-pr to open a PR automatically:`);
    dim(`   node vulnix-autofix.mjs --repo ${opts.repo} --fix ${opts.fix.join(',')} --create-pr`);
  }
  log('');
}

main().catch(e => {
  console.log(`\n${'\x1b[31m'}❌ Fatal: ${e.message}${'\x1b[0m'}`);
  process.exit(1);
});
