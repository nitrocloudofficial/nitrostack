import { describe, expect, it } from 'vitest';
import { loadJsonData, resolveDataPath } from '../../lib/load-data.js';

describe('load-data', () => {
  it('resolves pricing-table.json from src or dist', () => {
    const path = resolveDataPath('pricing-table.json');
    expect(path).toMatch(/pricing-table\.json$/);
  });

  it('loads pricing table JSON', () => {
    const table = loadJsonData<{ asOf: string; currency: string }>('pricing-table.json');
    expect(table.asOf).toBeTruthy();
    expect(table.currency).toBe('USD');
  });

  it('loads mock history JSON', () => {
    const history = loadJsonData<{ users: Record<string, unknown> }>('mock-history.json');
    expect(history.users['demo-user']).toBeTruthy();
  });
});
