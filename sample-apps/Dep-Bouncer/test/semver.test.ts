import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare, satisfies } from '../src/modules/registry/semver.js';

test('compare orders releases and prereleases', () => {
  assert.ok(compare('1.14.1', '1.14.0') > 0);
  assert.ok(compare('6.0.0-rc.1', '6.0.0') < 0);
  assert.ok(compare('6.0.0-beta.4', '6.0.0-rc.1') < 0);
  assert.ok(compare('1.10.0', '1.9.9') > 0);
});

test('satisfies handles the range forms agents pass', () => {
  assert.ok(satisfies('5.6.0', '^5.0.0'));
  assert.ok(!satisfies('6.0.0', '^5.0.0'));
  assert.ok(satisfies('1.14.0', '<1.14.1'));
  assert.ok(!satisfies('1.14.1', '<1.14.1'));
  assert.ok(satisfies('1.2.9', '~1.2.0'));
  assert.ok(!satisfies('1.3.0', '~1.2.0'));
  assert.ok(satisfies('1.9.0', '^1.2'));
  assert.ok(satisfies('2.4.1', '2.x'));
  assert.ok(satisfies('3.0.0', '*'));
  assert.ok(!satisfies('3.0.0-beta.1', '*'));
  assert.ok(satisfies('0.30.3', '>=0.30.0 <0.31.0'));
});

test('npm partial comparator boundaries, unions and hyphen ranges', () => {
  const cases: [string, string, boolean][] = [
    ['1.5.0', '>1', false], ['2.0.0', '>1', true],
    ['1.2.9', '<=1.2', true], ['1.3.0', '<=1.2', false],
    ['1.2.0', '>=1.2', true], ['1.1.99', '>=1.2', false],
    ['1.1.99', '<1.2', true], ['1.2.0', '<1.2', false],
    ['1.9.0', '^1 || ^2', true], ['2.9.0', '^1 || ^2', true], ['3.0.0', '^1 || ^2', false],
    ['1.2.3', '1.2.3 - 2.3.4', true], ['2.3.4', '1.2.3 - 2.3.4', true],
    ['2.3.5', '1.2.3 - 2.3.4', false], ['2.3.99', '1.2 - 2.3', true],
    ['2.4.0', '1.2 - 2.3', false], ['0.2.9', '^0.2', true], ['0.3.0', '^0.2', false],
    ['0.0.9', '^0.0', true], ['0.1.0', '^0.0', false],
    ['1.2.0', '>= 1.2 < 2', true], ['2.0.0', '>= 1.2 < 2', false],
  ];
  for (const [version, range, expected] of cases) assert.equal(satisfies(version, range), expected, `${version} ${range}`);
});

test('prereleases require an explicit comparator with the same version tuple in their set', () => {
  for (const range of ['*', '^1', '1.2.3 - 2.3.4', '>=1.2.3-beta.1 <2.0.0', '^1.2.3-beta.1 || ^2']) {
    assert.equal(satisfies('1.9.0-beta.1', range), false, range);
  }
  assert.ok(satisfies('1.2.3-beta.2', '>=1.2.3-beta.1 <2.0.0'));
  assert.equal(satisfies('1.2.3-beta.2', '>2 || <1.2.3 || >1.2.3-beta.1 >3'), false);
  assert.ok(satisfies('2.3.4-beta.2', '^1 || >=2.3.4-beta.1 <3'));
  assert.equal(satisfies('1.2.3-beta.1', '* || 1.2.3-beta.1'), false);
});

test('unsupported and malformed ranges fail closed without throwing', () => {
  for (const range of ['latest', 'next', 'constructor', '__proto__', '!=1.2.3', '1.2.3,2.0.0', '1.x.2',
    '01.2.3', '^wat', '1.2.3 - nope', '>=', '1.2.3 || invalid']) {
    assert.equal(satisfies('1.2.3', range), false, range);
  }
  assert.equal(satisfies('1.2.3-beta..1', '*'), false);
  assert.equal(satisfies('1.2.3-01', '>=1.2.3-0'), false);
  assert.equal(satisfies('1.2.3', null as unknown as string), false);
  assert.equal(satisfies('9007199254740991.0.0-beta.1', '^9007199254740991.0.0-beta.1'), false);
});
