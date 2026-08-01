import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xirr, cagr } from '../dist/common/xirr.js';

test('xirr ≈ 21% for -100k → +121k over one year', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const later = new Date('2025-01-01T00:00:00Z');
    const r = xirr([{ amount: -100000, date: now }, { amount: 121000, date: later }]);
    assert.ok(Math.abs(r - 0.21) < 0.01, `xirr was ${r}`);
});

test('cagr for a value doubling over 3 years ≈ 25.99%', () => {
    const c = cagr(100000, 200000, 3);
    assert.ok(Math.abs(c - 0.2599) < 0.001, `cagr was ${c}`);
});
