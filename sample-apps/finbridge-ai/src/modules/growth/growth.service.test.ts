import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { computeCagr, NavCacheService } from './growth.service.js';

// @nitrostack/core's @Injectable decorator registers into a process-wide DI
// container that keeps the event loop alive (it's designed for a long-running
// server, not a one-off test process). Force exit once this file's tests
// finish so `npm test` doesn't hang.
after(() => {
  // A short delay lets the test reporter flush stdout before we force-exit.
  setTimeout(() => process.exit(process.exitCode ?? 0), 100);
});

function fixtureHistory() {
  // Most-recent-first, matching mfapi.in's actual ordering.
  return [
    { date: '24-07-2026', nav: '200.0' },
    { date: '24-07-2023', nav: '150.0' }, // ~3 years back
    { date: '24-07-2021', nav: '110.0' } // ~5 years back
  ];
}

test('computeCagr computes the correct 3-year trailing CAGR', () => {
  const cagr = computeCagr(fixtureHistory(), 3);
  assert.ok(cagr !== null);
  const expected = Math.pow(200 / 150, 1 / 3) - 1;
  assert.ok(Math.abs((cagr as number) - expected) < 0.0005);
});

test('computeCagr returns null when no point exists near the requested horizon', () => {
  const shortHistory = [
    { date: '24-07-2026', nav: '200.0' },
    { date: '01-07-2026', nav: '199.0' }
  ];
  assert.equal(computeCagr(shortHistory, 5), null);
});

test('falls back to the cached band when a later live fetch fails', async () => {
  let callCount = 0;
  const fakeClient = {
    async getSchemeHistory() {
      callCount++;
      if (callCount === 1) {
        return {
          meta: { scheme_name: 'Test Fund', fund_house: '', scheme_type: '', scheme_category: '', scheme_code: 1 },
          data: [
            { date: '24-07-2026', nav: '200.0' },
            { date: '24-07-2023', nav: '150.0' },
            { date: '24-07-2021', nav: '110.0' }
          ]
        };
      }
      throw new Error('mfapi.in unreachable');
    }
  };

  const service = new NavCacheService(fakeClient as any);
  const first = await service.getCagrBand('index');
  assert.equal(first.source, 'live');

  const second = await service.getCagrBand('index');
  assert.equal(second.source, 'cached');
  assert.equal(second.low, first.low);
});

test('falls back to the static band when there is no live data and no cache', async () => {
  const fakeClient = {
    async getSchemeHistory() {
      throw new Error('down');
    }
  };

  const service = new NavCacheService(fakeClient as any);
  const result = await service.getCagrBand('debt');
  assert.equal(result.source, 'static');
  assert.ok(result.low > 0 && result.high > result.low);
});
