import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coerceNumber, coercePositive, normalizeEnum, coerceDateISO } from '../dist/common/validate.js';

test('coerceNumber strips ₹ and commas', () => {
    assert.equal(coerceNumber('₹18,00,000'), 1800000);
});

test('coerceNumber garbage → fallback (no NaN)', () => {
    assert.equal(coerceNumber('abc', { fallback: 0 }), 0);
});

test('coercePositive clamps negatives to 0', () => {
    assert.equal(coercePositive(-5), 0);
});

test('normalizeEnum maps loose input and falls back safely', () => {
    assert.equal(normalizeEnum('Equity Fund', ['equity', 'debt'], 'equity'), 'equity');
    assert.equal(normalizeEnum('debt', ['equity', 'debt'], 'equity'), 'debt');
    assert.equal(normalizeEnum('nonsense', ['equity', 'debt'], 'equity'), 'equity');
});

test('coerceDateISO normalizes loose date formats (no retries)', () => {
    assert.equal(coerceDateISO('2024/1/23'), '2024-01-23'); // slashes + single digits
    assert.equal(coerceDateISO('2024-01-23'), '2024-01-23'); // already ISO
    assert.equal(coerceDateISO('23-01-2024'), '2024-01-23'); // Indian day-first
    assert.equal(coerceDateISO('not a date'), null);
});
