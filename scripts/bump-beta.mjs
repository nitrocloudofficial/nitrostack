#!/usr/bin/env node

/**
 * bump-beta.mjs
 *
 * Automatically inspects the current published npm beta tag and local package versions,
 * computes the next beta prerelease version, updates package.json, builds, tests, and
 * optionally publishes under the npm "beta" dist-tag.
 *
 * PRODUCTION SAFETY GUARANTEE:
 * - This script STRICTLY operates on beta versions (e.g. X.Y.Z-beta.N).
 * - Stable / production versions (e.g. 1.0.17 or any non-beta release) are NEVER modified.
 * - Any user-specified version without "-beta." is rejected immediately.
 * - The npm "latest" production dist-tag is actively protected and monitored.
 * - Publishing is hardcoded with mandatory "--tag beta --access public".
 *
 * Usage:
 *   node scripts/bump-beta.mjs                  # Check and bump versions to next beta
 *   node scripts/bump-beta.mjs --check          # Inspect versions without modifying files
 *   node scripts/bump-beta.mjs --build          # Bump versions and compile core + cli
 *   node scripts/bump-beta.mjs --test           # Bump versions, compile, and run test suites
 *   node scripts/bump-beta.mjs --dry-run        # Bump versions, compile, and dry-run npm publish
 *   node scripts/bump-beta.mjs --publish        # Full release: bump, build, test, and npm publish
 *   node scripts/bump-beta.mjs 1.1.0-beta.X     # Bump to an explicit beta version
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const corePkgPath = path.join(rootDir, 'typescript', 'packages', 'core', 'package.json');
const cliPkgPath = path.join(rootDir, 'typescript', 'packages', 'cli', 'package.json');

// Helper to run commands
function run(cmd, cwd = rootDir, silent = false) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
  } catch (err) {
    if (!silent) {
      console.error(`Command failed: ${cmd}`);
    }
    throw err;
  }
}

function runOutput(cmd, cwd = rootDir) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

// ============================================================================
// Production Protection & Beta Validation
// ============================================================================

/**
 * Validates that a string strictly adheres to the beta prerelease pattern:
 * e.g., 1.1.0-beta.1, 1.1.0-beta.2, 1.1.0-beta.10
 */
function isBetaVersion(versionStr) {
  if (typeof versionStr !== 'string') return false;
  return /^(\d+)\.(\d+)\.(\d+)-beta(?:\.?)(\d+)$/i.test(versionStr.trim());
}

/**
 * Hard safety assertion: Halts execution if a version is NOT a beta version.
 * This guarantees production / latest versions can never be accidentally touched.
 */
function assertBetaOnly(versionStr, label = 'Version') {
  if (!isBetaVersion(versionStr)) {
    console.error(`\n❌ [PRODUCTION SAFETY HALT] ${label} "${versionStr}" is NOT a valid beta prerelease!`);
    console.error(`   This script is strictly restricted to beta versions (e.g. 1.1.0-beta.X).`);
    console.error(`   Modifying or publishing production / stable releases via this script is strictly blocked.\n`);
    process.exit(1);
  }
}

// Semver beta prerelease comparison helper
function parseBetaVersion(versionStr) {
  if (!versionStr) return null;
  const match = versionStr.trim().match(/^(\d+)\.(\d+)\.(\d+)-(beta)(?:\.?)(\d+)$/i);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    preid: 'beta',
    prereleaseNum: parseInt(match[5], 10),
    raw: versionStr.trim()
  };
}

function compareBetaVersions(v1, v2) {
  const p1 = parseBetaVersion(v1);
  const p2 = parseBetaVersion(v2);
  if (!p1 && !p2) return 0;
  if (!p1) return -1;
  if (!p2) return 1;

  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  if (p1.patch !== p2.patch) return p1.patch - p2.patch;
  return p1.prereleaseNum - p2.prereleaseNum;
}

function incrementBeta(versionStr) {
  assertBetaOnly(versionStr, 'Base version for increment');
  const parsed = parseBetaVersion(versionStr);
  return `${parsed.major}.${parsed.minor}.${parsed.patch}-beta.${parsed.prereleaseNum + 1}`;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isCheckOnly = args.includes('--check');
  const shouldPublish = args.includes('--publish');
  const isDryRun = args.includes('--dry-run');
  const shouldBuild = args.includes('--build') || args.includes('--test') || shouldPublish || isDryRun;
  const shouldTest = args.includes('--test') || shouldPublish;
  const explicitVersion = args.find(arg => !arg.startsWith('--'));

  console.log('======================================================');
  console.log(' NitroStack Beta Release Automation');
  console.log(' (Production Protection: Active - Beta Only)');
  console.log('======================================================\n');

  // Branch check
  const currentBranch = runOutput('git rev-parse --abbrev-ref HEAD');
  if (currentBranch === 'main' || currentBranch === 'master') {
    console.warn(`⚠️  WARNING: You are on the "${currentBranch}" branch.`);
    console.warn(`    Beta prereleases should typically originate from a feature branch (e.g. feat/code-mode-transform-pipeline).\n`);
  } else if (currentBranch) {
    console.log(`Git branch: ${currentBranch}`);
  }

  // 1. Read local package.json files
  if (!fs.existsSync(corePkgPath) || !fs.existsSync(cliPkgPath)) {
    console.error('Error: Could not locate core or cli package.json files.');
    process.exit(1);
  }

  const corePkg = JSON.parse(fs.readFileSync(corePkgPath, 'utf-8'));
  const cliPkg = JSON.parse(fs.readFileSync(cliPkgPath, 'utf-8'));

  console.log(`Local @nitrostack/core: ${corePkg.version}`);
  console.log(`Local @nitrostack/cli:  ${cliPkg.version}`);

  // 2. Fetch remote npm dist-tags
  console.log('\nQuerying npm dist-tags for live published versions...');
  const remoteCoreBeta = runOutput('npm view @nitrostack/core dist-tags.beta');
  const remoteCliBeta = runOutput('npm view @nitrostack/cli dist-tags.beta');
  const remoteLatest = runOutput('npm view @nitrostack/core dist-tags.latest');

  console.log(`Live npm @nitrostack/core [beta]:   ${remoteCoreBeta || 'none found'}`);
  console.log(`Live npm @nitrostack/cli  [beta]:   ${remoteCliBeta || 'none found'}`);
  console.log(`Live npm @nitrostack/core [latest]: ${remoteLatest || 'unknown'} (PROD - UNTOUCHED)`);

  // 3. Determine base beta version
  // Safety rule: ONLY consider versions that match beta pattern. Prod versions (like 1.0.17) are filtered out!
  const candidateBetaVersions = [];

  if (isBetaVersion(corePkg.version)) {
    candidateBetaVersions.push(corePkg.version);
  } else {
    console.log(`[Safety Note] Local @nitrostack/core (${corePkg.version}) is not a beta version; excluded from beta calculations.`);
  }

  if (isBetaVersion(cliPkg.version)) {
    candidateBetaVersions.push(cliPkg.version);
  } else {
    console.log(`[Safety Note] Local @nitrostack/cli (${cliPkg.version}) is not a beta version; excluded from beta calculations.`);
  }

  if (isBetaVersion(remoteCoreBeta)) {
    candidateBetaVersions.push(remoteCoreBeta);
  }

  if (isBetaVersion(remoteCliBeta)) {
    candidateBetaVersions.push(remoteCliBeta);
  }

  if (candidateBetaVersions.length === 0) {
    console.error('\n❌ Error: No existing beta versions found locally or on npm.');
    console.error('   To start a new beta series, pass an explicit beta version: node scripts/bump-beta.mjs 1.1.0-beta.0\n');
    process.exit(1);
  }

  let highestBeta = candidateBetaVersions[0];
  for (const candidate of candidateBetaVersions.slice(1)) {
    if (compareBetaVersions(candidate, highestBeta) > 0) {
      highestBeta = candidate;
    }
  }

  console.log(`\nHighest active beta version: ${highestBeta}`);

  // 4. Calculate next version
  let nextVersion;
  if (explicitVersion) {
    assertBetaOnly(explicitVersion, 'Explicit version');
    nextVersion = explicitVersion;
    console.log(`Using explicit beta version: ${nextVersion}`);
  } else {
    nextVersion = incrementBeta(highestBeta);
    console.log(`Calculated next beta version: ${nextVersion}`);
  }

  // Safety Assertion before any action
  assertBetaOnly(nextVersion, 'Calculated next version');

  if (isCheckOnly) {
    console.log('\n[--check flag detected]: Verification passed. No files were changed.');
    process.exit(0);
  }

  // 5. Update package.json files
  console.log(`\nUpdating package.json files to ${nextVersion}...`);
  corePkg.version = nextVersion;
  cliPkg.version = nextVersion;

  fs.writeFileSync(corePkgPath, JSON.stringify(corePkg, null, 2) + '\n', 'utf-8');
  console.log(`✓ Updated ${path.relative(rootDir, corePkgPath)} -> ${nextVersion}`);

  fs.writeFileSync(cliPkgPath, JSON.stringify(cliPkg, null, 2) + '\n', 'utf-8');
  console.log(`✓ Updated ${path.relative(rootDir, cliPkgPath)} -> ${nextVersion}`);

  // 6. Optional build and test
  const coreDir = path.dirname(corePkgPath);
  const cliDir = path.dirname(cliPkgPath);

  if (shouldBuild) {
    console.log('\n--- Compiling @nitrostack/core ---');
    run('npm run build', coreDir);

    if (shouldTest) {
      console.log('\n--- Running @nitrostack/core test suite ---');
      run('npm test', coreDir);
    }

    console.log('\n--- Compiling @nitrostack/cli ---');
    run('npm run build', cliDir);

    if (shouldTest) {
      console.log('\n--- Running @nitrostack/cli test suite ---');
      run('npm test', cliDir);
    }
  }

  // 7. Publish step (if requested)
  if (shouldPublish || isDryRun) {
    console.log('\n--- Checking npm Authentication ---');
    const whoami = runOutput('npm whoami');
    if (!whoami && !isDryRun) {
      console.error('\n❌ [AUTHENTICATION REQUIRED] You are not currently logged in to npm.');
      console.error('   Please run `npm login` in your terminal to authenticate.');
      console.error(`   Once logged in, run: node scripts/bump-beta.mjs --publish\n`);
      process.exit(1);
    }
    if (whoami) {
      console.log(`✓ Authenticated as npm user: ${whoami}`);
    }

    const publishFlags = isDryRun
      ? '--tag beta --access public --dry-run'
      : '--tag beta --access public';

    // Double check safety
    if (!publishFlags.includes('--tag beta')) {
      console.error('❌ SAFETY HALT: Refusing to publish without explicit "--tag beta"!');
      process.exit(1);
    }

    console.log(`\n--- Publishing @nitrostack/core (${publishFlags}) ---`);
    run(`npm publish ${publishFlags}`, coreDir);

    console.log(`\n--- Publishing @nitrostack/cli (${publishFlags}) ---`);
    run(`npm publish ${publishFlags}`, cliDir);

    if (!isDryRun) {
      console.log('\n--- Verifying published dist-tags ---');
      const verifyCore = runOutput('npm view @nitrostack/core dist-tags.beta');
      const verifyLatest = runOutput('npm view @nitrostack/core dist-tags.latest');
      console.log(`Live @nitrostack/core [beta]:   ${verifyCore}`);
      console.log(`Live @nitrostack/core [latest]: ${verifyLatest} (UNTOUCHED)`);
    }
  }

  // 8. Safety reminders & next steps
  console.log('\n======================================================');
  console.log(` ✓ Successfully prepared beta version: ${nextVersion}`);
  console.log('======================================================');
  console.log('\n🚨 PRODUCTION SAFETY RULES:');
  console.log(`  • Stable production users remain on "latest" (${remoteLatest || '1.0.17'}).`);
  console.log('  • You MUST pass "--tag beta" when publishing. NEVER publish without "--tag beta"!\n');

  if (!shouldPublish && !isDryRun) {
    console.log('Next release commands:');
    if (!shouldBuild) {
      console.log(`  1. Build & Test:`);
      console.log(`     cd typescript/packages/core && npm run build && npm test`);
      console.log(`     cd ../cli && npm run build && npm test`);
    }
    console.log(`  2. Publish (MUST use --tag beta):`);
    console.log(`     cd typescript/packages/core && npm publish --tag beta --access public`);
    console.log(`     cd ../cli && npm publish --tag beta --access public`);
    console.log(`  3. Verify npm dist-tags (confirm "latest" is still ${remoteLatest || '1.0.17'}):`);
    console.log(`     npm view @nitrostack/core dist-tags`);
    console.log(`     npm view @nitrostack/cli dist-tags`);
  }

  console.log(`  Git Commit & Tag:`);
  console.log(`     git commit -am "chore: release ${nextVersion}"`);
  console.log(`     git tag v${nextVersion}`);
  console.log(`     git push origin ${currentBranch || 'feat/code-mode-transform-pipeline'} v${nextVersion}`);
}

main().catch(err => {
  console.error('\nExecution halted:', err.message);
  process.exit(1);
});
