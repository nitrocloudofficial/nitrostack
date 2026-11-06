import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damerauLevenshtein, findLookalikes } from '../src/modules/analysis/name-similarity.js';

const popular = ['express', 'lodash', 'chalk', 'cross-env', 'react-dom', 'preact', 'crypto-js', 'is-number'];
const names = (name: string) => findLookalikes(name, popular).map(item => item.name);

test('Damerau-Levenshtein handles edits and transpositions', () => {
  assert.equal(damerauLevenshtein('express', 'expresss'), 1);
  assert.equal(damerauLevenshtein('ab', 'ba'), 1);
});

test('finds typos, separator variants, suffixes, and extra affixes', () => {
  assert.ok(names('expresss').includes('express'));
  assert.ok(names('lodahs').includes('lodash'));
  assert.ok(names('chalkk').includes('chalk'));
  assert.ok(findLookalikes('crossenv', popular).some(x => x.name === 'cross-env' && x.kind === 'separator'));
  assert.ok(findLookalikes('react-dom-js', popular).some(x => x.name === 'react-dom' && x.kind === 'suffix'));
  assert.ok(findLookalikes('plain-crypto-js', popular).some(x => x.name === 'crypto-js' && x.kind === 'affix'));
});

test('does not flag popular names or unrelated near-neighbors', () => {
  for (const name of ['react-dom', 'preact', 'express', 'chalk', 'crypto-js', 'is-number'])
    assert.deepEqual(names(name), []);
});
