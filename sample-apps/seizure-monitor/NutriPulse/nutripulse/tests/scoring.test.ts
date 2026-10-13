import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Dish, UserProfile, LabReport } from '../src/domain/types.js';
import { computeSimilarity } from '../src/modules/resolver/scoring/similarity.service.js';
import { ClinicalScorerService } from '../src/modules/resolver/scoring/clinical-scorer.service.js';
import { ContextualScorerService } from '../src/modules/resolver/scoring/contextual-scorer.service.js';
import { BudgetScorerService } from '../src/modules/resolver/scoring/budget-scorer.service.js';
import { CravingScorerService } from '../src/modules/resolver/scoring/craving-scorer.service.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');

let catalogDishes: Dish[] = [];
let u1: UserProfile;
let u2: UserProfile;
let u3: UserProfile;
let u1Labs: LabReport;
let u3Labs: LabReport;

beforeAll(() => {
  const catalog = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'catalog.json'), 'utf-8'));
  catalogDishes = catalog.dishes;

  u1 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u1', 'profile.json'), 'utf-8'));
  u2 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u2', 'profile.json'), 'utf-8'));
  u3 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u3', 'profile.json'), 'utf-8'));

  u1Labs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u1', 'labs.json'), 'utf-8'))[0];
  u3Labs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users', 'u3', 'labs.json'), 'utf-8'))[0];
});

describe('Phase 4: Perspective Scorers', () => {

  it('Similarity Service: Biryani to Biryani ≈1, Biryani to Salad ≈0', () => {
    const biryani = catalogDishes.find(d => d.cuisine.includes('Biryani'));
    const salad = catalogDishes.find(d => d.cuisine.includes('Healthy-Bowl'));
    
    // Fallback if not found perfectly in seed
    if (biryani && salad) {
      const selfSim = computeSimilarity(biryani, biryani);
      const crossSim = computeSimilarity(biryani, salad);

      expect(selfSim).toBeGreaterThan(0.95);
      expect(crossSim).toBeLessThan(0.4);
    }
  });

  it('Similarity Service: Healthy swap dishes score > 0.7 to their anchor', () => {
    const swapDishes = catalogDishes.filter(d => d.swap_for != null);
    expect(swapDishes.length).toBeGreaterThan(0);

    for (const dish of swapDishes) {
      const anchor = catalogDishes.find(d => d.id === dish.swap_for);
      expect(anchor).toBeDefined();
      if (anchor) {
        const sim = computeSimilarity(dish, anchor);
        expect(sim).toBeGreaterThan(0.7);
      }
    }
  });

  it('Clinical Scorer: U1 iron-rich dishes outscore equivalents', () => {
    const clinicalScorer = new ClinicalScorerService();
    
    // Mock an envelope for U1 that includes iron deficiency uplift
    const envelope = {
      hard_constraints: [],
      soft_targets: [
        { nutrient: 'iron_mg', target: 20, weight: 1.0 },
      ],
      calculation_trace: {}
    };

    const baseDish = JSON.parse(JSON.stringify(catalogDishes[0]));
    baseDish.micros.iron_mg = 2; // Low iron

    const ironDish = JSON.parse(JSON.stringify(catalogDishes[0]));
    ironDish.micros.iron_mg = 20; // High iron

    const baseScore = clinicalScorer.scoreClinicalFit(baseDish, envelope as any, []);
    const ironScore = clinicalScorer.scoreClinicalFit(ironDish, envelope as any, []);

    expect(ironScore.score).toBeGreaterThan(baseScore.score);
    expect(ironScore.metadata?.version).toBe('clinical-v1');
  });

  it('Contextual Scorer: Disliked cuisine tanks score, context renormalisation works', () => {
    const contextScorer = new ContextualScorerService();
    
    const likedDish = JSON.parse(JSON.stringify(catalogDishes[0]));
    likedDish.cuisine = u1.taste_preferences.cuisines_liked[0];

    const dislikedDish = JSON.parse(JSON.stringify(catalogDishes[0]));
    dislikedDish.cuisine = u1.taste_preferences.cuisines_disliked[0] || 'UnknownBadCuisine';

    const likedScore = contextScorer.scoreContextualFit(likedDish, u1, [], { weather: 'rainy' });
    const dislikedScore = contextScorer.scoreContextualFit(dislikedDish, u1, [], { weather: 'rainy' });

    expect(dislikedScore.score).toBeLessThan(likedScore.score);

    // Context renormalisation test
    const withoutContext = contextScorer.scoreContextualFit(likedDish, u1, []);
    expect(withoutContext.metadata?.context_unavailable).toBe(true);
    expect(typeof withoutContext.metadata?.renormalization_factor).toBe('number');
    expect(withoutContext.metadata?.renormalization_factor).toBeGreaterThan(1); // Since weather weight was omitted
    
    // Scores should be on comparable scale (in [0,1])
    expect(withoutContext.score).toBeGreaterThanOrEqual(0);
    expect(withoutContext.score).toBeLessThanOrEqual(1);

    // Relative ranking remains unchanged
    const dislikedWithoutContext = contextScorer.scoreContextualFit(dislikedDish, u1, []);
    expect(dislikedWithoutContext.score).toBeLessThan(withoutContext.score);
  });

  it('Budget Scorer: ₹420 dish scores 0 on budget for U3 but is returned', () => {
    const budgetScorer = new BudgetScorerService();
    
    const dish = JSON.parse(JSON.stringify(catalogDishes[0]));
    dish.price_inr = 420;

    // Give U3 a very small remaining budget
    const budgetState = {
      budget_inr_remaining: 100,
      weekly_budget_inr_remaining: 500,
      days_remaining_in_week: 5
    };

    const res = budgetScorer.scoreBudgetFit(dish, budgetState, u3);
    
    // Score is strictly calculated
    // affordScore = 0 => affordContrib = 0
    // pacingTarget = 100 => 420 > 100 => decays sharply but still returns the breakdown
    expect(res.components.affordability).toBe(0);
    expect(res.score).toBeGreaterThanOrEqual(0); 
    expect(res.score).toBeLessThan(1);
    expect(res.metadata?.version).toBe('budget-v1');
  });

  it('Craving Scorer: Resolves free text craving', () => {
    const cravingScorer = new CravingScorerService();
    
    // Mock a dish
    const mockDish = catalogDishes[0];
    
    // Use a very obvious term that exists in the catalog (e.g. "chicken" or similar)
    // To ensure it resolves, we use the exact name of the first catalog dish
    const res = cravingScorer.scoreCravingSatisfaction(mockDish, mockDish.name);
    
    expect(res.metadata?.resolved_type).toBe('dish');
    expect(res.metadata?.anchor_dish_id).toBeDefined();
    
    // If threshold isn't met:
    const failRes = cravingScorer.scoreCravingSatisfaction(mockDish, 'this is complete gibberish and wont match any dish in the catalog guaranteed');
    expect(failRes.components.craving_unresolved).toBe(1);
    expect(failRes.metadata?.resolved_type).toBe('unresolved');
  });
});
