import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEVERITY_WEIGHT } from '../src/modules/analysis/signal.js';
import { decide } from '../src/modules/analysis/verdict.js';

test('severity weights increase with severity', () => {
  assert.ok(SEVERITY_WEIGHT.info < SEVERITY_WEIGHT.warn);
  assert.ok(SEVERITY_WEIGHT.warn < SEVERITY_WEIGHT.high);
  assert.ok(SEVERITY_WEIGHT.high < SEVERITY_WEIGHT.critical);
  assert.equal(SEVERITY_WEIGHT.critical, 70);
});

test('structured incomplete findings require REVIEW independently of titles and weights', () => {
  for (const weight of [0, 15]) {
    const incomplete = { signal: 'fixture', severity: 'info' as const, title: 'Coverage unavailable',
      evidence: [], weight, incomplete: true as const };
    const result = decide([incomplete]);
    assert.equal(result.verdict, 'REVIEW');
    assert.equal(result.score, weight);
    assert.equal(decide([incomplete, { ...incomplete, severity: 'critical', weight: 70 }]).verdict, 'BLOCK');
    assert.equal(decide([{ ...incomplete, incomplete: undefined }]).verdict, 'ALLOW');
  }
  assert.equal(decide([{ signal: 'fixture', severity: 'warn', title: 'check incomplete: just text',
    evidence: [], weight: 15 }]).verdict, 'ALLOW');
});
