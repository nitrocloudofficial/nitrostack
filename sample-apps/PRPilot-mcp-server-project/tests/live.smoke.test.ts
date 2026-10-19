import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubService } from '../src/modules/pull-request/github.service.js';
import { HeuristicsService } from '../src/modules/pull-request/heuristics.service.js';
import { DossierService } from '../src/modules/pull-request/dossier.service.js';

test('Live Smoke Test: queries public repository on GitHub (skips on offline/rate limit)', async (t) => {
  const gh = new GitHubService();
  const heuristics = new HeuristicsService();
  const dossier = new DossierService();

  try {
    // Test on octocat/Hello-World PR #788 (or fallback public PR)
    const rawPr = await gh.getPullRequest('octocat', 'Hello-World', 788);
    assert.ok(rawPr.title, 'PR title should exist');
    assert.ok(rawPr.head?.sha, 'Head SHA should exist');

    const rawFiles = await gh.getPullRequestFiles('octocat', 'Hello-World', 788);
    const changeMap = heuristics.buildChangeMap(rawFiles, rawPr.additions || 0, rawPr.deletions || 0);
    assert.equal(typeof changeMap.total_files, 'number');

    const checkRuns = await gh.getCommitCheckRuns('octocat', 'Hello-World', rawPr.head.sha);
    const verification = dossier.buildVerificationEvidence(rawPr.head.sha, checkRuns, []);
    assert.ok(verification.honest_assessment);

    console.log(`Live Smoke Test Passed: Retrieved public PR "${rawPr.title}" with status "${rawPr.state}"`);
  } catch (err: any) {
    if (err.message && err.message.includes('rate limit exceeded')) {
      t.skip('Skipped live smoke test due to unauthenticated GitHub IP rate limit');
    } else {
      throw err;
    }
  }
});
