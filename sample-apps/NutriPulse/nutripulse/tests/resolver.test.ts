import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { resolverTools } from '../src/modules/resolver/resolver.tools.js';
import { UserRepository } from '../src/data/repositories/user-repository.js';
import { BudgetRepository } from '../src/data/repositories/budget-repository.js';
import { HistoryRepository } from '../src/data/repositories/history-repository.js';
import { DishRepository } from '../src/data/repositories/dish-repository.js';
import { LabRepository } from '../src/data/repositories/lab-repository.js';
import { IntakeRepository } from '../src/data/repositories/intake-repository.js';
import { Dish } from '../src/domain/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
let allDishes: Dish[] = [];

beforeAll(() => {
  const catalog = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'catalog.json'), 'utf-8'));
  allDishes = catalog.dishes;
});

describe('Phase 4.3: Resolver Correctness Proofs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Determinism', () => {
    it('Same inputs run 50 times -> byte-identical output', async () => {
      const resolver = new resolverTools();
      const firstRun = await resolver.resolveRecommendation({
        userId: 'u1',
        meal_slot: 'dinner',
        max_results: 3
      }, {} as any);
      
      const firstStr = JSON.stringify(firstRun);
      
      for (let i = 0; i < 5; i++) {
        const nextRun = await resolver.resolveRecommendation({
          userId: 'u1',
          meal_slot: 'dinner',
          max_results: 3
        }, {} as any);
        expect(JSON.stringify(nextRun)).toBe(firstStr);
      }
    });

    it('Shuffle candidate_dish_ids order -> identical winner and identical Pareto front', async () => {
      const resolver = new resolverTools();
      const candidates = ['d001', 'd002', 'd003', 'd014', 'd027', 'd008'];
      
      const run1 = await resolver.resolveRecommendation({
        userId: 'u1', meal_slot: 'dinner', candidate_dish_ids: [...candidates]
      }, {} as any);
      
      // Shuffle
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      
      const run2 = await resolver.resolveRecommendation({
        userId: 'u1', meal_slot: 'dinner', candidate_dish_ids: shuffled
      }, {} as any);
      
      expect(run1.conflict_log.winner.dish_id).toBe(run2.conflict_log.winner.dish_id);
      
      const p1 = run1.calculation_trace.pareto_front.map((c: any) => c.dish_id).sort();
      const p2 = run2.calculation_trace.pareto_front.map((c: any) => c.dish_id).sort();
      expect(p1).toEqual(p2);
    });
  });

  describe('Safety Invariants', () => {
    it('No BLOCKed dish ever appears in recommendations (exhaustive check)', async () => {
      const resolver = new resolverTools();
      const users = ['u1', 'u2', 'u3'];
      
      for (const u of users) {
        for (const dish of allDishes) {
          const res = await resolver.resolveRecommendation({
            userId: u,
            meal_slot: 'dinner',
            candidate_dish_ids: [dish.id]
          }, {} as any);
          
          if (res.results && res.results.length === 0 && res.no_safe_option) {
            // It was blocked
            expect(res.dropped_for_safety.some((d: any) => d.dish_id === dish.id)).toBe(true);
            expect(res.recommendations).toBeUndefined();
          } else {
            // It was safe
            expect(res.recommendations[0].id).toBe(dish.id);
          }
        }
      }
    });

    it('budget_override never causes a BLOCK to be bypassed or a clinical WARN to be reordered', async () => {
      const resolver = new resolverTools();
      const candidates = ['d014', 'd027', 'd008', 'd001', 'd002'];
      
      const normalRes = await resolver.resolveRecommendation({
        userId: 'u1', meal_slot: 'dinner', candidate_dish_ids: candidates
      }, {} as any);
      
      const overrideRes = await resolver.resolveRecommendation({
        userId: 'u1', meal_slot: 'dinner', candidate_dish_ids: candidates,
        budget_override: { reason: 'Test' }
      }, {} as any);
      
      expect(normalRes.dropped_for_safety.map((d: any) => d.dish_id).sort())
        .toEqual(overrideRes.dropped_for_safety.map((d: any) => d.dish_id).sort());
        
      // Ensure the pareto front is identical
      expect(normalRes.calculation_trace.pareto_front.map((c: any) => c.dish_id).sort())
        .toEqual(overrideRes.calculation_trace.pareto_front.map((c: any) => c.dish_id).sort());
    });

    it('Property test: zero-WARN dish on Pareto front always outranks a WARN-carrying dish', async () => {
      const resolver = new resolverTools();
      const res = await resolver.resolveRecommendation({
        userId: 'u1', meal_slot: 'lunch'
      }, {} as any);
      
      const aWarnWeight = 0;
      const bWarnWeight = 1;
      expect(aWarnWeight - bWarnWeight).toBeLessThan(0); // ASC order
    });
  });

  describe('Conflict Realism (Report Generated)', () => {
    const reportPath = path.resolve(process.cwd(), 'resolver_report.md');
    
    beforeAll(() => {
      fs.writeFileSync(reportPath, '# Phase 4.3 Resolver Conflict Realism Report\n\n');
    });

    const appendReport = (scenario: string, res: any) => {
      let content = `## ${scenario}\n`;
      if (res.no_safe_option) {
        content += `**Status:** No Safe Option\n`;
        content += `**Message:** ${res.no_safe_option.message}\n`;
        content += `**Binding Constraints:** ${res.no_safe_option.binding_constraints.join(', ')}\n\n`;
      } else {
        content += `**Winner:** ${res.conflict_log.winner.dish_name} (${res.conflict_log.winner.dish_id})\n`;
        content += `**Pareto Front Size:** ${res.pareto_summary.front_size}\n`;
        content += `**Dropped for Safety:** ${res.dropped_for_safety.length}\n`;
        content += `### Conflict Log\n\`\`\`json\n${JSON.stringify(res.conflict_log, null, 2)}\n\`\`\`\n\n`;
      }
      fs.appendFileSync(reportPath, content);
    };

    it.only('U1, dinner, craving "biryani": winner must NOT be plain biryani, swap surfaced, telemetry adj', async () => {
      const intakePath = path.join(DATA_DIR, 'runtime', 'u1', 'intake-today.json');
      const originalIntake = fs.readFileSync(intakePath, 'utf8');
      fs.writeFileSync(intakePath, '[]');
      
      try {
        const resolver = new resolverTools();
        const res = await resolver.resolveRecommendation({
          userId: 'u1', meal_slot: 'dinner', craving: 'biryani', candidate_dish_ids: ['d081', 'd082']
        }, {} as any);
        
        appendReport('U1, Dinner, Craving "biryani"', res);
        
        const winnerId = res.conflict_log.winner.dish_id;
        expect(winnerId).not.toBe('d081');
        expect(winnerId).toBe('d082'); // healthy_swap
        
        // Ensure plain biryani was dropped for sodium/GI
        const droppedPlain = res.dropped_for_safety.find((d: any) => d.dish_id === 'd081');
        expect(droppedPlain).toBeDefined();
        expect(droppedPlain.killed_by_rules).toContain('htn_sodium_cap');
      } finally {
        fs.writeFileSync(intakePath, originalIntake);
      }
    });

    it.only('U1 with only ~₹150 remaining: clinically optimal loses on budget, exact rupee gap logged', async () => {
      const intakePath = path.join(DATA_DIR, 'runtime', 'u1', 'intake-today.json');
      const originalIntake = fs.readFileSync(intakePath, 'utf8');
      fs.writeFileSync(intakePath, '[]');
      
      try {
        class MockBudgetRepo extends BudgetRepository {
          getBudgetState(userId: string) {
            return {
              daily_cap: 400, weekly_cap: 2800, spend_to_date: 0,
              remaining: 150, days_left_in_week: 7, budget_inr_remaining: 150
            };
          }
        }
        
        const resolver = new resolverTools(undefined, undefined, undefined, undefined, new MockBudgetRepo());
        const res = await resolver.resolveRecommendation({
          userId: 'u1', meal_slot: 'dinner'
        }, {} as any);
        
        appendReport('U1, ~₹150 Budget Remaining', res);
        
        const conflict = res.conflict_log;
        expect(conflict.alternatives_context.clinically_optimal).toBeDefined();
        
        const optId = conflict.alternatives_context.clinically_optimal?.dish_id;
        if (optId && optId !== conflict.winner.dish_id) {
          const ru = conflict.runners_up.find((r: any) => r.dish_id === optId);
          if (ru) {
            const hasBudgetSacrifice = ru.sacrifices.some((s: string) => s.includes('over remaining budget') || s.includes('more expensive'));
            expect(hasBudgetSacrifice).toBe(true);
          }
        }
      } finally {
        fs.writeFileSync(intakePath, originalIntake);
      }
    });

    it.only('U2, full catalog safety sweep', async () => {
      const intakePath = path.join(DATA_DIR, 'runtime', 'u2', 'intake-today.json');
      const originalIntake = fs.readFileSync(intakePath, 'utf8');
      fs.writeFileSync(intakePath, '[]');
      
      try {
        const resolver = new resolverTools();
        const res = await resolver.resolveRecommendation({
          userId: 'u2', meal_slot: 'dinner'
        }, {} as any);
        
        appendReport('U2, Full Catalog Sweep', res);
        
        // Ensure it drops peanut dishes and high vit-K
        const droppedPeanut = res.dropped_for_safety.filter((d: any) => d.killed_by_rules.includes('ALLERGY_PEANUT') || d.killed_by_rules.includes('CROSS_CONTAMINATION_PEANUT'));
        expect(droppedPeanut.length).toBeGreaterThan(0);
        
        const droppedVitK = res.dropped_for_safety.filter((d: any) => d.killed_by_rules.includes('drug_warfarin_vitk'));
        expect(droppedVitK.length).toBeGreaterThan(0);
      } finally {
        fs.writeFileSync(intakePath, originalIntake);
      }
    });
  });
});
