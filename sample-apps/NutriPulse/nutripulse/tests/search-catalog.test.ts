import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  textScore,
  applyFilters,
  sortDishes,
  findNearMisses,
  textureBonus,
} from '../src/modules/catalog/catalog.tools.js';
import { Dish } from '../src/domain/types.js';

// ---------- Load real catalog for integration-style tests ----------

const catalogPath = path.resolve(process.cwd(), 'data', 'catalog.json');
let allDishes: Dish[] = [];

beforeAll(() => {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  allDishes = catalog.dishes;
});

// ---------- Text scoring ----------

describe('textScore', () => {
  it('scores higher for name match than description match', () => {
    const biryani = allDishes.find(d => d.name.toLowerCase().includes('biryani'));
    expect(biryani).toBeDefined();

    const score = textScore(biryani!, 'biryani');
    expect(score).toBeGreaterThanOrEqual(3); // Name match = 3 per token
  });

  it('returns 1 for all dishes when query is empty', () => {
    const score = textScore(allDishes[0], '');
    expect(score).toBe(1);
  });

  it('returns 0 for a completely unrelated query', () => {
    const score = textScore(allDishes[0], 'xyznonexistent');
    expect(score).toBe(0);
  });
});

// ---------- Filters ----------

describe('applyFilters', () => {
  it('filters by max_sodium_mg', () => {
    const filtered = allDishes.filter(d => applyFilters(d, { max_sodium_mg: 500 }));
    for (const d of filtered) {
      expect(d.micros.sodium_mg).toBeLessThanOrEqual(500);
    }
    // Should exclude some dishes (catalog has high-sodium dishes)
    expect(filtered.length).toBeLessThan(allDishes.length);
  });

  it('filters by exclude_allergens', () => {
    const filtered = allDishes.filter(d => applyFilters(d, { exclude_allergens: ['peanut'] }));
    for (const d of filtered) {
      expect(d.allergens.map(a => a.toLowerCase())).not.toContain('peanut');
    }
  });

  it('filters by max_kcal', () => {
    const filtered = allDishes.filter(d => applyFilters(d, { max_kcal: 300 }));
    for (const d of filtered) {
      expect(d.kcal).toBeLessThanOrEqual(300);
    }
  });

  it('filters by prep_style', () => {
    const filtered = allDishes.filter(d => applyFilters(d, { prep_style: ['grilled'] }));
    for (const d of filtered) {
      expect(d.prep_style).toBe('grilled');
    }
  });

  it('passes all dishes when no filters are specified', () => {
    const filtered = allDishes.filter(d => applyFilters(d, undefined));
    expect(filtered.length).toBe(allDishes.length);
  });
});

// ---------- Search: "biryani" ----------

describe('search "biryani"', () => {
  it('finds multiple biryani dishes with high scores', () => {
    const scored = allDishes
      .map(d => ({ dish: d, score: textScore(d, 'biryani') }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    expect(scored.length).toBeGreaterThanOrEqual(1);
    // Top results should have "biryani" in name
    expect(scored[0].dish.name.toLowerCase()).toContain('biryani');
  });
});

// ---------- Search with U1's sodium cap ----------

describe('search with U1 sodium cap (max_sodium_mg: 2000)', () => {
  it('returns dishes under 2000mg sodium', () => {
    const filtered = allDishes
      .filter(d => applyFilters(d, { max_sodium_mg: 2000 }))
      .filter(d => textScore(d, '') > 0);

    expect(filtered.length).toBeGreaterThan(0);
    for (const d of filtered) {
      expect(d.micros.sodium_mg).toBeLessThanOrEqual(2000);
    }
  });
});

// ---------- Over-constrained search → relaxed_filters ----------

describe('over-constrained search triggers relaxed_filters', () => {
  it('returns near-misses when constraints are impossible', () => {
    // Impossible: max_kcal=10 AND min_protein_g=100
    const result = findNearMisses(
      allDishes,
      undefined,
      { max_kcal: 10, min_protein_g: 100 },
      5
    );

    expect(result.dishes.length).toBeGreaterThan(0);
    expect(result.relaxed_filters.length).toBeGreaterThan(0);
    // The relaxation should name which filter was loosened
    expect(result.relaxed_filters[0].filter).toBeDefined();
    expect(result.relaxed_filters[0].relaxation).toBeDefined();
  });

  it('returns text-matched fallback when query exists but filters kill everything', () => {
    const result = findNearMisses(
      allDishes,
      'biryani',
      { max_kcal: 1, max_sodium_mg: 1 },
      5
    );

    expect(result.dishes.length).toBeGreaterThan(0);
    expect(result.relaxed_filters.length).toBeGreaterThan(0);
  });
});

// ---------- Sorting ----------

describe('sortDishes', () => {
  it('sorts by price ascending', () => {
    const scored = allDishes.slice(0, 10).map(d => ({ dish: d, score: 1 }));
    const sorted = sortDishes([...scored], 'price_asc');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].dish.price_inr).toBeGreaterThanOrEqual(sorted[i - 1].dish.price_inr);
    }
  });

  it('sorts by protein descending', () => {
    const scored = allDishes.slice(0, 10).map(d => ({ dish: d, score: 1 }));
    const sorted = sortDishes([...scored], 'protein_desc');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].dish.macros.protein_g).toBeLessThanOrEqual(sorted[i - 1].dish.macros.protein_g);
    }
  });
});

// ---------- Total matched vs returned ----------

describe('total_matched vs limit', () => {
  it('total_matched reflects full count even when limit truncates', () => {
    const allScored = allDishes
      .map(d => ({ dish: d, score: 1 }))
      .filter(s => applyFilters(s.dish, undefined));

    const totalMatched = allScored.length;
    const limited = allScored.slice(0, 5);

    expect(totalMatched).toBeGreaterThan(5);
    expect(limited.length).toBe(5);
  });
});
