import { ToolDecorator as Tool, z, ExecutionContext, Injectable, UseInterceptors } from '@nitrostack/core';
import { UserRepository } from '../../data/repositories/user-repository.js';
import { LabRepository } from '../../data/repositories/lab-repository.js';
import { HistoryRepository } from '../../data/repositories/history-repository.js';
import { DishRepository } from '../../data/repositories/dish-repository.js';

import { BudgetRepository } from '../../data/repositories/budget-repository.js';
import { clinicalTools } from '../clinical/clinical.tools.js';
import { applyFilters } from '../catalog/catalog.tools.js';
import { evaluateDishSafety } from '../../domain/safety-evaluator.js';

import { ClinicalScorerService, CLINICAL_SCORER_CONFIG } from './scoring/clinical-scorer.service.js';
import { ContextualScorerService, CONTEXTUAL_SCORER_CONFIG } from './scoring/contextual-scorer.service.js';
import { BudgetScorerService, BUDGET_SCORER_CONFIG } from './scoring/budget-scorer.service.js';
import { CravingScorerService, CRAVING_SCORER_CONFIG } from './scoring/craving-scorer.service.js';
import { SafetyInterceptor } from '../../interceptors/safety.interceptor.js';
import { Dish } from '../../domain/types.js';

const ResolveRecommendationInputSchema = z.object({
  userId: z.string().describe('User ID.'),
  meal_slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).describe('The meal slot.'),
  craving: z.string().optional().describe('Optional craving (dish_id, cuisine, or free-text).'),
  candidate_dish_ids: z.array(z.string()).optional().describe('Optional array of dish IDs to evaluate.'),
  context: z.any().optional().describe('Optional context object (e.g. weather).'),
  budget_override: z.object({ reason: z.string() }).optional().describe('Optional budget override reason.'),
  max_results: z.number().default(3).describe('Max results to return.'),
});

type ResolveRecommendationInput = z.infer<typeof ResolveRecommendationInputSchema>;

interface ScoredCandidate {
  dish: Dish;
  clinicalScore: number;
  contextualScore: number;
  budgetScore: number;
  cravingScore: number;
  warns: any[];
  allBreakdowns: any;
  lost_because?: string;
}

@Injectable()
export class resolverTools {
  private userRepo: UserRepository;
  private labRepo: LabRepository;
  private historyRepo: HistoryRepository;
  private dishRepo: DishRepository;
  private budgetRepo: BudgetRepository;

  private clinicalToolsModule = new clinicalTools();
  private clinicalScorer = new ClinicalScorerService();
  private contextualScorer = new ContextualScorerService();
  private budgetScorer = new BudgetScorerService();
  private cravingScorer = new CravingScorerService();

  constructor(
    userRepo?: UserRepository,
    labRepo?: LabRepository,
    historyRepo?: HistoryRepository,
    dishRepo?: DishRepository,
    budgetRepo?: BudgetRepository
  ) {
    this.userRepo = userRepo || new UserRepository();
    this.labRepo = labRepo || new LabRepository();
    this.historyRepo = historyRepo || new HistoryRepository();
    this.dishRepo = dishRepo || new DishRepository();
    this.budgetRepo = budgetRepo || new BudgetRepository();
  }

  @Tool({
    name: 'resolve_recommendation',
    description: 'PRIMARY ENTRY POINT for any question about what to eat, order, or be recommended. Call this tool ALONE and FIRST. It internally computes the user\'s nutritional envelope, searches the catalog, applies all clinical safety rules, and resolves conflicts across clinical, contextual, budget and craving objectives. Do NOT call compute_nutritional_envelope, search_catalog, or check_meal_safety before it — they are already run inside. Present the conflict_log to the user, not just the winning dish.',
    inputSchema: ResolveRecommendationInputSchema,
  })
  @UseInterceptors(SafetyInterceptor)
  async resolveRecommendation(input: ResolveRecommendationInput, context: ExecutionContext) {
    const profile = this.userRepo.getById(input.userId);
    if (!profile) throw new Error(`User not found: ${input.userId}`);
    const labReports = this.labRepo.getByUserId(input.userId);
    const latestLabs = labReports.length > 0 ? labReports.sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())[0] : undefined;
    const history = this.historyRepo.getByUserId(input.userId);

    // Get envelope
    const envelope = await this.clinicalToolsModule.computeNutritionalEnvelope({ userId: input.userId, meal_slot: input.meal_slot }, context);

    const calculation_trace: any = {
      envelope_used: envelope,
      stages: {},
      scoring_config_versions: {
        clinical: CLINICAL_SCORER_CONFIG.version,
        contextual: CONTEXTUAL_SCORER_CONFIG.version,
        budget: BUDGET_SCORER_CONFIG.version,
        craving: CRAVING_SCORER_CONFIG.version,
      },
      pareto_front: []
    };

    // Stage 1 - CANDIDATE ASSEMBLY
    let candidates: Dish[] = [];
    if (input.candidate_dish_ids && input.candidate_dish_ids.length > 0) {
      candidates = input.candidate_dish_ids.map(id => this.dishRepo.getAll().find(d => d.id === id)).filter(Boolean) as Dish[];
      calculation_trace.stages.assembly = { method: 'explicit_ids', count: candidates.length };
    } else {
      const allDishes = this.dishRepo.getAll();
      const historyOrders = history.orders.map(o => ({ user_id: o.user_id, timestamp: o.timestamp, dish_id: o.dish_id, portion_multiplier: 1 }));
      
      const sorted = [...allDishes].sort((a, b) => {
        if (input.craving) {
          const scoreB = this.cravingScorer.scoreCravingSatisfaction(b, input.craving, historyOrders).score;
          const scoreA = this.cravingScorer.scoreCravingSatisfaction(a, input.craving, historyOrders).score;
          return scoreB - scoreA;
        } else {
          const scoreB = this.contextualScorer.scoreContextualFit(b, profile, historyOrders, input.context).score;
          const scoreA = this.contextualScorer.scoreContextualFit(a, profile, historyOrders, input.context).score;
          return scoreB - scoreA;
        }
      });
      
      candidates = sorted.slice(0, 60);

      // Force-include craving anchor and swap
      if (input.craving) {
        // Simple search for anchor matching craving
        const term = input.craving.toLowerCase();
        const anchor = allDishes.find(d => d.conflict_role === 'craving_anchor' && 
          (d.name.toLowerCase().includes(term) || d.description.toLowerCase().includes(term) || d.id === term));
        
        if (anchor && !candidates.some(c => c.id === anchor.id)) {
          candidates.push(anchor);
        }
        if (anchor && anchor.swap_for) {
          const swap = allDishes.find(d => d.id === anchor.swap_for);
          if (swap && !candidates.some(c => c.id === swap.id)) {
            candidates.push(swap);
          }
        }
      }
      
      calculation_trace.stages.assembly = { method: 'ranked_by_preference', count: candidates.length };
    }

    // Stage 2 - SAFETY FILTER
    // Check assertion as requested by user
    if (!envelope || !envelope.hard_constraints) {
      throw new Error("Envelope not computed correctly");
    }

    const safeCandidates: Dish[] = [];
    const droppedForSafety: any[] = [];
    const safeCandidatesWarns = new Map<string, any[]>();

    for (const dish of candidates) {
      const verdicts = evaluateDishSafety(dish, profile, latestLabs, envelope.hard_constraints);
      const blocks = verdicts.filter(v => v.status === 'BLOCK');
      if (blocks.length > 0) {
        droppedForSafety.push({
          dish_id: dish.id,
          dish_name: dish.name,
          killed_by_rules: blocks.map(b => b.rule_id)
        });
      } else {
        safeCandidates.push(dish);
        safeCandidatesWarns.set(dish.id, verdicts.filter(v => v.status === 'WARN'));
      }
    }
    calculation_trace.stages.safety_filter = { surviving_count: safeCandidates.length, dropped_count: droppedForSafety.length };

    if (safeCandidates.length === 0) {
      return {
        results: [],
        no_safe_option: {
          message: 'No safe candidates found.',
          binding_constraints: droppedForSafety.flatMap(d => d.killed_by_rules),
          suggestion: 'Relax explicit candidate list or loosen soft constraints if any.'
        },
        dropped_for_safety: droppedForSafety,
        calculation_trace
      };
    }

    // Stage 3 - SCORE
    const budgetState = this.budgetRepo.getBudgetState(input.userId);
    
    const historyOrders = history.orders.map(o => ({
      user_id: o.user_id,
      timestamp: o.timestamp,
      dish_id: o.dish_id,
      portion_multiplier: 1
    }));
    
    const scoredCandidates: ScoredCandidate[] = safeCandidates.map(dish => {
      const warns = safeCandidatesWarns.get(dish.id) || [];
      const clin = this.clinicalScorer.scoreClinicalFit(dish, envelope, warns);
      const ctx = this.contextualScorer.scoreContextualFit(dish, profile, historyOrders, input.context);
      const budg = this.budgetScorer.scoreBudgetFit(dish, budgetState, profile);
      const crav = this.cravingScorer.scoreCravingSatisfaction(dish, input.craving, historyOrders);

      return {
        dish,
        clinicalScore: clin.score,
        contextualScore: ctx.score,
        budgetScore: budg.score,
        cravingScore: crav.score,
        warns,
        allBreakdowns: { clinical: clin, contextual: ctx, budget: budg, craving: crav }
      };
    });

    calculation_trace.stages.scoring = {
      candidates: scoredCandidates.map(c => ({
        dish_id: c.dish.id,
        scores: {
          clinical: c.clinicalScore,
          contextual: c.contextualScore,
          budget: c.budgetScore,
          craving: c.cravingScore
        }
      }))
    };

    // Stage 4 - PARETO FRONT
    const EPSILON = 0.02;
    const paretoFront: ScoredCandidate[] = [];
    let dominatedCount = 0;
    
    // For instrumentation
    let singleFrontDominator = null;
    let dominatedRunnerUp = null;

    for (const a of scoredCandidates) {
      let isDominated = false;
      for (const b of scoredCandidates) {
        if (a === b) continue;
        
        const bDominatesA = 
          b.clinicalScore >= a.clinicalScore - EPSILON &&
          b.contextualScore >= a.contextualScore - EPSILON &&
          b.budgetScore >= a.budgetScore - EPSILON &&
          b.cravingScore >= a.cravingScore - EPSILON &&
          (
            b.clinicalScore > a.clinicalScore + EPSILON ||
            b.contextualScore > a.contextualScore + EPSILON ||
            b.budgetScore > a.budgetScore + EPSILON ||
            b.cravingScore > a.cravingScore + EPSILON
          );

        if (bDominatesA) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        paretoFront.push(a);
      } else {
        dominatedCount++;
      }
    }
    
    if (paretoFront.length === 1 && scoredCandidates.length > 1) {
      singleFrontDominator = paretoFront[0].dish.id;
      // Find one of the dominated dishes
      const runUp = scoredCandidates.find(c => c !== paretoFront[0]);
      if (runUp) {
        dominatedRunnerUp = {
          dish_id: runUp.dish.id,
          scores: {
            clinical: runUp.clinicalScore,
            contextual: runUp.contextualScore,
            budget: runUp.budgetScore,
            craving: runUp.cravingScore
          }
        };
      }
    }
    
    calculation_trace.stages.pareto_front = { 
      front_size: paretoFront.length, 
      dominated_count: dominatedCount,
      single_dominator: singleFrontDominator,
      runner_up_dominated: dominatedRunnerUp
    };
    calculation_trace.pareto_front = paretoFront.map(c => ({ dish_id: c.dish.id, scores: c.allBreakdowns }));

    // Stage 5 - LEXICOGRAPHIC TIEBREAK
    let lexicographicStepDecided = 0;
    
    const sortedFront = [...paretoFront].sort((a, b) => {
      // 1. Fewest/least severe WARNs
      const aWarnWeight = a.warns.reduce((sum, w) => sum + (w.severity === 'severe' ? 2 : 1), 0);
      const bWarnWeight = b.warns.reduce((sum, w) => sum + (w.severity === 'severe' ? 2 : 1), 0);
      if (aWarnWeight !== bWarnWeight) { 
        lexicographicStepDecided = lexicographicStepDecided || 1; 
        // Attach exact comparison to loser
        if (aWarnWeight > bWarnWeight) a.lost_because = `Disqualified at step 1 (safety): ${aWarnWeight} warning weight vs ${bWarnWeight} for winner`;
        else b.lost_because = `Disqualified at step 1 (safety): ${bWarnWeight} warning weight vs ${aWarnWeight} for winner`;
        return aWarnWeight - bWarnWeight; 
      }

      // 2. Hard budget cap (unless overridden)
      if (!input.budget_override) {
        const aOverBudget = a.dish.price_inr > budgetState.budget_inr_remaining;
        const bOverBudget = b.dish.price_inr > budgetState.budget_inr_remaining;
        if (aOverBudget !== bOverBudget) { 
          lexicographicStepDecided = lexicographicStepDecided || 2;
          if (aOverBudget) a.lost_because = `Disqualified at step 2 (budget): ₹${a.dish.price_inr} vs ₹${budgetState.budget_inr_remaining} remaining — ₹${a.dish.price_inr - budgetState.budget_inr_remaining} over`;
          else b.lost_because = `Disqualified at step 2 (budget): ₹${b.dish.price_inr} vs ₹${budgetState.budget_inr_remaining} remaining — ₹${b.dish.price_inr - budgetState.budget_inr_remaining} over`;
          return aOverBudget ? 1 : -1; 
        }
      }

      // 3. Craving satisfaction
      if (Math.abs(a.cravingScore - b.cravingScore) > EPSILON) { 
        lexicographicStepDecided = lexicographicStepDecided || 3;
        if (a.cravingScore < b.cravingScore) a.lost_because = `Disqualified at step 3 (craving): Score ${a.cravingScore.toFixed(2)} vs ${b.cravingScore.toFixed(2)}`;
        else b.lost_because = `Disqualified at step 3 (craving): Score ${b.cravingScore.toFixed(2)} vs ${a.cravingScore.toFixed(2)}`;
        return b.cravingScore - a.cravingScore; 
      }

      // 4. Contextual score
      if (Math.abs(a.contextualScore - b.contextualScore) > EPSILON) { 
        lexicographicStepDecided = lexicographicStepDecided || 4; 
        if (a.contextualScore < b.contextualScore) a.lost_because = `Disqualified at step 4 (context): Score ${a.contextualScore.toFixed(2)} vs ${b.contextualScore.toFixed(2)}`;
        else b.lost_because = `Disqualified at step 4 (context): Score ${b.contextualScore.toFixed(2)} vs ${a.contextualScore.toFixed(2)}`;
        return b.contextualScore - a.contextualScore; 
      }

      // 5. Lowest dish_id
      lexicographicStepDecided = lexicographicStepDecided || 5;
      if (a.dish.id.localeCompare(b.dish.id) > 0) a.lost_because = `Disqualified at step 5 (tiebreak): ID ${a.dish.id} > ${b.dish.id}`;
      else b.lost_because = `Disqualified at step 5 (tiebreak): ID ${b.dish.id} > ${a.dish.id}`;
      return a.dish.id.localeCompare(b.dish.id);
    });

    if (paretoFront.length > 1 && !lexicographicStepDecided) {
      throw new Error("Tiebreak failed to attribute a lexicographic step.");
    }

    const winner = sortedFront[0];
    const topRunnersUp = sortedFront.slice(1, Math.min(sortedFront.length, 1 + Math.max(3, input.max_results)));
    
    calculation_trace.stages.tiebreak = { winner_dish_id: winner.dish.id, decided_by_step: lexicographicStepDecided };

    // Stage 6 - CONFLICT LOG
    const clinicallyOptimal = [...scoredCandidates].sort((a, b) => b.clinicalScore - a.clinicalScore)[0];
    const cheapestSafe = [...scoredCandidates].sort((a, b) => a.dish.price_inr - b.dish.price_inr)[0];
    const highestCraving = [...scoredCandidates].sort((a, b) => b.cravingScore - a.cravingScore)[0];

    const generateTradeoff = (candidate: ScoredCandidate) => {
      const sacrifices = [];
      if (candidate.clinicalScore < clinicallyOptimal.clinicalScore - EPSILON) {
        // Find main reason
        const targetProtein = envelope.soft_targets.find(t => t.nutrient === 'protein_g')?.target || 0;
        const targetCarbs = envelope.soft_targets.find(t => t.nutrient === 'carbs_g')?.target || 0;
        const targetFat = envelope.soft_targets.find(t => t.nutrient === 'fat_g')?.target || 0;
        const targetFibre = envelope.soft_targets.find(t => t.nutrient === 'fibre_g')?.target || 0;
        
        sacrifices.push(`Lower clinical score than optimal: Protein ${candidate.dish.macros.protein_g}g (vs ${clinicallyOptimal.dish.macros.protein_g}g), Carbs ${candidate.dish.macros.carbs_g}g (vs ${clinicallyOptimal.dish.macros.carbs_g}g), Fat ${candidate.dish.macros.fat_g}g (vs ${clinicallyOptimal.dish.macros.fat_g}g), Fibre ${candidate.dish.macros.fibre_g}g (vs ${clinicallyOptimal.dish.macros.fibre_g}g)`);
      }
      if (candidate.dish.price_inr > cheapestSafe.dish.price_inr) {
        sacrifices.push(`₹${candidate.dish.price_inr - cheapestSafe.dish.price_inr} more expensive than cheapest safe option`);
      }
      if (candidate.dish.price_inr > budgetState.budget_inr_remaining) {
        sacrifices.push(`₹${candidate.dish.price_inr - budgetState.budget_inr_remaining} over remaining budget`);
      }
      return sacrifices;
    };

    const conflict_log = {
      winner: {
        dish_id: winner.dish.id,
        dish_name: winner.dish.name,
        sacrifices: generateTradeoff(winner),
        carried_warns: winner.warns.map(w => ({ 
          rule_id: w.rule_id,
          text: w.rule_text, 
          citation: w.source_citation,
          actual_value: w.actual_value,
          threshold: w.threshold
        }))
      },
      runners_up: topRunnersUp.slice(0, 3).map(ru => ({
        dish_id: ru.dish.id,
        dish_name: ru.dish.name,
        lost_because: (ru as any).lost_because || `Dominated or lower rank.`,
        sacrifices: generateTradeoff(ru)
      })),
      alternatives_context: {
        clinically_optimal: {
          dish_id: clinicallyOptimal.dish.id,
          disqualified_reason: clinicallyOptimal === winner ? "Winner" : ((clinicallyOptimal as any).lost_because || "Lost in tiebreak.")
        },
        cheapest_safe: {
          dish_id: cheapestSafe.dish.id,
          disqualified_reason: cheapestSafe === winner ? "Winner" : ((cheapestSafe as any).lost_because || "Lost in tiebreak.")
        },
        highest_craving: {
          dish_id: highestCraving.dish.id,
          disqualified_reason: highestCraving === winner ? "Winner" : ((highestCraving as any).lost_because || "Lost in tiebreak.")
        },
      }
    };

    return {
      recommendations: sortedFront.slice(0, input.max_results).map(c => c.dish),
      conflict_log,
      dropped_for_safety: droppedForSafety,
      pareto_summary: { front_size: paretoFront.length, dominated: dominatedCount },
      calculation_trace
    };
  }
}
