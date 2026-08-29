import { resolverTools } from './src/modules/resolver/resolver.tools.js';
import { DishRepository } from './src/data/repositories/dish-repository.js';
import { BudgetRepository } from './src/data/repositories/budget-repository.js';
import { clinicalTools } from './src/modules/clinical/clinical.tools.js';
import { Dish } from './src/domain/types.js';
import { evaluateDishSafety } from './src/domain/safety-evaluator.js';
import { UserRepository } from './src/data/repositories/user-repository.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const reportPath = path.resolve(process.cwd(), 'diagnostic_report.md');
  fs.writeFileSync(reportPath, '# Diagnostic Report\n\n');

  const append = (text: string) => fs.appendFileSync(reportPath, text + '\n');
  const resolver = new resolverTools();

  // Helper for scenarios
  const runScenario = async (name: string, input: any, customResolver?: resolverTools) => {
    append(`## Scenario: ${name}`);
    const r = customResolver || resolver;
    const res = await r.resolveRecommendation(input, {} as any);
    
    const trace = res.calculation_trace;
    if (!trace) {
      append('No trace found (possibly blocked immediately).\n');
      return;
    }
    
    append(`**Stage 1 (Assembly):** Assembled ${trace.stages.assembly.count} candidates via ${trace.stages.assembly.method}.`);
    if (trace.stages.assembly.filters) {
      append(`Filters applied: \`${JSON.stringify(trace.stages.assembly.filters)}\``);
    }
    
    append(`\n**Stage 2 (Safety):** ${trace.stages.safety_filter.dropped_count} BLOCKed.`);
    if (res.dropped_for_safety) {
      for (const d of res.dropped_for_safety) {
        append(` - ${d.dish_id}: ${d.killed_by_rules.join(', ')}`);
      }
    }
    
    append(`\n**Stage 3 (Scoring):**`);
    if (trace.stages.scoring) {
      for (const c of trace.stages.scoring.candidates) {
        append(` - ${c.dish_id}: clin=${c.scores.clinical.toFixed(2)} ctx=${c.scores.contextual.toFixed(2)} budg=${c.scores.budget.toFixed(2)} crav=${c.scores.craving.toFixed(2)}`);
      }
    }
    
    if (trace.stages.pareto_front) {
      append(`\n**Stage 4 (Pareto Front):** Size = ${trace.stages.pareto_front.front_size}`);
      if (trace.stages.pareto_front.front_size === 1 && trace.stages.pareto_front.single_dominator) {
        append(` - Dominated by: ${trace.stages.pareto_front.single_dominator}`);
        const ru = trace.stages.pareto_front.runner_up_dominated;
        if (ru) {
          append(` - Example runner up ${ru.dish_id} scores: clin=${ru.scores.clinical.toFixed(2)} ctx=${ru.scores.contextual.toFixed(2)} budg=${ru.scores.budget.toFixed(2)} crav=${ru.scores.craving.toFixed(2)}`);
        }
      }
    }
    
    if (trace.stages.tiebreak) {
      append(`\n**Stage 5 (Tiebreak):** Decided by lexicographic step ${trace.stages.tiebreak.decided_by_step}`);
    }
    append('\n---\n');
  };

  // Run the 6 scenarios (from resolver.test.ts)
  
  // Scenario 1: U1, craving "biryani"
  await runScenario('U1, craving "biryani"', { userId: 'u1', meal_slot: 'dinner', craving: 'biryani' });

  // Scenario 2: U1, ~₹150 remaining
  class MockBudgetRepo extends BudgetRepository {
    getBudgetState(userId: string) {
      return { daily_cap: 400, weekly_cap: 2800, spend_to_date: 0, remaining: 150, days_left_in_week: 7, budget_inr_remaining: 150 };
    }
  }
  await runScenario('U1, ~₹150 Budget Remaining', { userId: 'u1', meal_slot: 'dinner' }, new resolverTools(undefined, undefined, undefined, undefined, new MockBudgetRepo()));

  // Scenario 3: U2, Post-workout
  await runScenario('U2, Post-Workout Dinner', { userId: 'u2', meal_slot: 'dinner' });

  // Scenario 4: U3, Renal Risk
  await runScenario('U3, Dinner (Renal Risk)', { userId: 'u3', meal_slot: 'dinner' });

  // Scenario 5: Pathological (1 candidate)
  await runScenario('Pathological (1 Candidate Survives)', { userId: 'u2', meal_slot: 'dinner', candidate_dish_ids: ['d005'] });

  // Scenario 6: No Safe Option
  await runScenario('No Safe Option', { userId: 'u1', meal_slot: 'dinner', candidate_dish_ids: ['d027'] });

  // Q1: Biryani
  append(`\n## Q1: Biryani`);
  const catalog = JSON.parse(fs.readFileSync('./data/catalog.json', 'utf8'));
  const allDishes: Dish[] = catalog.dishes;
  const biryanis = allDishes.filter(d => d.name.toLowerCase().includes('biryani') || d.description.toLowerCase().includes('biryani'));
  append(`Biryani dishes in catalog: ${biryanis.length}`);
  if (biryanis.length > 0) {
    biryanis.forEach(b => append(JSON.stringify(b, null, 2)));
  }

  // Q2: U2 Safety
  append(`\n## Q2: U2 Safety check against all 108 dishes`);
  const userRepo = new UserRepository();
  const u2Profile = userRepo.getById('u2');
  let blockCount = 0;
  const pbVitKList: any[] = [];
  for (const d of allDishes) {
    const verdicts = evaluateDishSafety(d, u2Profile!);
    const blocks = verdicts.filter(v => v.status === 'BLOCK');
    if (blocks.length > 0) blockCount++;
    
    // Check if peanut/tree_nut or high-vit-k
    const text = JSON.stringify(d).toLowerCase();
    const hasPeanut = text.includes('peanut') || text.includes('tree nut');
    const hasVitK = d.micros.vitamin_k_ug > 50; // Arbitrary high threshold check
    if (hasPeanut || hasVitK || blocks.some(b => b.rule_id.includes('ALLERGY_PEANUT') || b.rule_id.includes('WARFARIN'))) {
      pbVitKList.push({ dish_id: d.id, name: d.name, verdicts: verdicts.map(v => v.rule_id) });
    }
  }
  append(`Total BLOCKS for U2: ${blockCount}`);
  append(`Peanut/Vit-K dishes and their verdicts:\n\`\`\`json\n${JSON.stringify(pbVitKList, null, 2)}\n\`\`\``);

  // Q3: U3 Renal Risk for d005
  append(`\n## Q3: U3 Renal Risk for d005`);
  const d005 = allDishes.find(d => d.id === 'd005')!;
  append(`d005 Potassium: ${d005.micros.potassium_mg} mg, Phosphorus: ${d005.micros.phosphorus_mg} mg`);
  const clinTools = new clinicalTools();
  const envU3 = await clinTools.computeNutritionalEnvelope({ userId: 'u3', meal_slot: 'dinner' }, {} as any);
  append(`U3 Hard Constraints:\n\`\`\`json\n${JSON.stringify(envU3.hard_constraints, null, 2)}\n\`\`\``);

  // Q4: Score breakdown for d005 under U1 vs U3
  append(`\n## Q4: Score breakdown for d005 (U1 vs U3)`);
  const rU1 = await resolver.resolveRecommendation({ userId: 'u1', meal_slot: 'dinner', candidate_dish_ids: ['d005'] }, {} as any);
  const rU3 = await resolver.resolveRecommendation({ userId: 'u3', meal_slot: 'dinner', candidate_dish_ids: ['d005'] }, {} as any);
  append(`U1 Scores for d005:\n\`\`\`json\n${JSON.stringify(rU1.calculation_trace.stages.scoring.candidates[0].scores, null, 2)}\n\`\`\``);
  append(`U3 Scores for d005:\n\`\`\`json\n${JSON.stringify(rU3.calculation_trace.stages.scoring.candidates[0].scores, null, 2)}\n\`\`\``);
  
  // Q5: Stage 1 Filters
  append(`\n## Q5: Stage 1 Filters derived from hard constraints`);
  append(`Code from resolver.tools.ts:\n\`\`\`typescript
      const filters: any = {};
      const sodiumConstraint = envelope.hard_constraints.find(c => c.nutrient === 'sodium_mg');
      if (sodiumConstraint) filters.max_sodium_mg = sodiumConstraint.threshold;
      
      const sugarConstraint = envelope.hard_constraints.find(c => c.nutrient === 'sugar_g');
      if (sugarConstraint) filters.max_sugar_g = sugarConstraint.threshold;
      
      const allDishes = this.dishRepo.getAll();
      candidates = allDishes.filter(d => applyFilters(d, filters)).slice(0, 60);
\`\`\``);

  console.log("Diagnostic report generated.");
}

main().catch(console.error);
