import { Injectable } from '@nitrostack/core';
import type {
  AnalyzeInput,
  AnalyzeOutput,
  DemographicsResult,
  PlacesResult,
  TrafficResult,
  ZoneCandidate,
} from '../common/types.js';

export interface ZoneToolOutputs {
  zone: ZoneCandidate;
  places: PlacesResult;
  demographics: DemographicsResult;
  traffic: TrafficResult;
}

export const MAX_FOOTFALL_POTENTIAL = 50000;
export const MAX_POPULATION = 100000;
export const MAX_PURCHASING_POWER = 2000;
export const MAX_COMPETITORS = 12;
export const MAX_ANCHORS = 5;

/**
 * Age-concentration normalization band.
 *
 * The share of population aged 18-35 does NOT span 0-100% in practice, so
 * using the raw percentage as a 0-100 score would be wrong: it would pin
 * every real city near 30 and throw the signal away.
 *
 * Observed WorldPop values across our test cities:
 *   Coimbatore  28.1%
 *   Hyderabad   33.5%
 *   Bengaluru   36.8%
 *
 * So the real-world band is roughly 28-37%. These anchors bracket it:
 *
 *   AGE_FLOOR   (25%) — at or below India's broad national young-adult
 *                       share; an area with no youth concentration to speak
 *                       of, and therefore no age-driven retail advantage.
 *   AGE_CEILING (40%) — an exceptionally youth-concentrated urban area.
 *
 * The score is then a straight linear rescale between them, clamped to
 * 0-100. Simple, transparent, and auditable — the anchors are OUR OWN
 * judgement, stated here so they can be retuned, not fitted or learned.
 */
export const AGE_FLOOR_PCT = 25;
export const AGE_CEILING_PCT = 40;

/**
 * COST PRESSURE — relative, derived, and NOT a rent figure.
 *
 * There is no free, reliable locality-level rent data for Indian
 * neighbourhoods, so this does not attempt to state what a zone costs. It
 * blends two signals we already measure, both of which genuinely track
 * commercial rent:
 *
 *   purchasing power (0.6) — density of banks, ATMs, supermarkets and malls;
 *                            the strongest available affluence marker, and
 *                            affluent catchments command higher rents.
 *   footfall potential (0.4) — how prime the retail pitch is; prime pitches
 *                            cost more than quiet ones.
 *
 * Both are already computed per zone, so this adds no API calls and no
 * latency. The weighting is our judgement, stated here to be retuned.
 */
export const COST_PRESSURE_WEIGHTS = { purchasingPower: 0.6, footfall: 0.4 } as const;

/**
 * BUDGET BANDS — THE WEAKEST LINK IN THIS ENGINE. READ BEFORE TRUSTING.
 *
 * Every other number in RetailMind is either measured or derived from
 * measurements. These four thresholds are NOT. They are our judgement about
 * what an Indian retail budget can reach, and they are not backed by rent
 * data, because no free source for it exists at this granularity.
 *
 * They are deliberately isolated in this one block, reported to the caller via
 * AnalyzeOutput.budgetAssumption, and should be replaced with real figures (or
 * the operator's own market knowledge) the moment either is available.
 *
 * Each band maps a budget to the highest cost pressure it can comfortably
 * carry. A zone above that ceiling is not excluded — it is penalised in
 * proportion to how far past the ceiling it sits.
 */
export const BUDGET_BANDS: { maxBudget: number; costCeiling: number }[] = [
  { maxBudget: 300_000, costCeiling: 40 },
  { maxBudget: 1_000_000, costCeiling: 65 },
  { maxBudget: 2_500_000, costCeiling: 85 },
  { maxBudget: Infinity, costCeiling: 100 },
];

/**
 * How far above its ceiling a zone can sit before budget fit reaches zero.
 * A soft slope rather than a hard cut-off, because the ceilings themselves are
 * assumptions — a cliff edge would give them more authority than they deserve.
 */
export const BUDGET_OVERRUN_TOLERANCE = 30;

/**
 * Opportunity Score weights. These MUST sum to 1.0, otherwise the score can
 * never reach 100 and the "/100" reported to the user is a lie. The sum is
 * asserted at module load below so the invariant cannot silently regress.
 *
 * budgetFit carries the smallest weight of any major component on purpose: it
 * rests on the assumed bands above rather than on measurement, so it should
 * shift a ranking without ever dominating one.
 */
export const WEIGHTS = {
  footfallPotential: 0.25,
  population: 0.18,
  purchasingPower: 0.13,
  ageProfile: 0.09,
  competition: 0.18,
  anchors: 0.05,
  budgetFit: 0.12,
} as const;

const WEIGHT_SUM = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(
    `Opportunity Score weights must sum to 1.0, but they sum to ${WEIGHT_SUM}.`
  );
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Highest cost pressure the given budget is assumed to carry. A missing,
 * zero, negative or non-finite budget is treated as unconstrained rather than
 * as an error, so callers that omit it keep working exactly as before.
 */
function costCeilingForBudget(budget: number): number {
  if (!Number.isFinite(budget) || budget <= 0) return 100;
  return BUDGET_BANDS.find((band) => budget <= band.maxBudget)!.costCeiling;
}

/**
 * 100 while the zone sits within the affordable ceiling, then falling away
 * linearly across BUDGET_OVERRUN_TOLERANCE points of overrun.
 */
function budgetFitFor(costPressure: number, ceiling: number): number {
  if (costPressure <= ceiling) return 100;
  return clampScore(
    100 - ((costPressure - ceiling) / BUDGET_OVERRUN_TOLERANCE) * 100
  );
}

function describeBudgetAssumption(budget: number): string {
  if (!Number.isFinite(budget) || budget <= 0) {
    return 'No budget supplied, so budget fit was scored as unconstrained for every zone.';
  }
  return (
    `Budget of ₹${budget.toLocaleString('en-IN')} was matched against a cost pressure ceiling of ` +
    `${costCeilingForBudget(budget)}/100. Cost pressure is derived from real affluence and ` +
    `footfall signals, but the budget-to-ceiling bands are an ASSUMPTION, not measured rent ` +
    `data — no free locality-level rent source exists for Indian neighbourhoods. Treat budget ` +
    `fit as directional guidance and verify actual rents on the ground.`
  );
}

/**
 * Opportunity Engine
 *
 * Combines location, competition, demographic, and footfall-potential
 * signals into a single Opportunity Score.
 *
 * What each input actually is:
 * - traffic.footTraffic is a derived Footfall Potential Index, not a
 *   measured pedestrian count.
 * - demographics.medianIncome carries the PURCHASING POWER PROXY, not
 *   measured median household income. The field keeps its original name
 *   only for schema compatibility; nothing here treats it as rupees.
 * - demographics.population and age18to35Pct are real measured WorldPop
 *   values, but are catchment-level, so they are constant across the zones
 *   of a single analysis (see DemographicsService). They therefore shift a
 *   city's scores up or down as a whole rather than separating zones within
 *   it; footfall, competition and purchasing power do the separating.
 *
 * `input.budget` is deliberately NOT used. It is collected and carried
 * through for compatibility, but it does not affect ranking because we have
 * no defensible locality-level rent or location-cost data for Indian
 * neighbourhoods. Inventing a budget-fit term would produce a confident
 * number with nothing real behind it, so the input stays inert until a
 * genuine cost source is available.
 */
@Injectable()
export class OpportunityEngineService {
  evaluate(input: AnalyzeInput, zoneOutputs: ZoneToolOutputs[]): AnalyzeOutput {
    if (zoneOutputs.length === 0) {
      throw new Error(
        `Cannot evaluate opportunity for "${input.city}": no candidate zones ` +
          `were successfully analyzed. Every zone's data lookup failed, so ` +
          `there is nothing to score.`
      );
    }

    // Budget is a property of the search, not of any one zone, so the ceiling
    // is resolved once and applied to every candidate.
    const costCeiling = costCeilingForBudget(input.budget);

    const evaluations = zoneOutputs.map(
      ({ zone, places, demographics, traffic }) => {

        // Derived from real accessibility / POI signals.
        const footfallPotentialScore = clampScore(
          (traffic.footTraffic / MAX_FOOTFALL_POTENTIAL) * 100
        );

        // WorldPop can be offline; when it is, population and age are absent
        // rather than guessed, and their weight is redistributed below.
        const hasPopulation = demographics.population !== null;
        const hasAge = demographics.age18to35Pct !== null;

        const populationScore = clampScore(
          ((demographics.population ?? 0) / MAX_POPULATION) * 100
        );

        // medianIncome carries the derived purchasing-power proxy, not income.
        const purchasingPowerScore = clampScore(
          (demographics.medianIncome / MAX_PURCHASING_POWER) * 100
        );

        // Linear rescale of the young-adult share across the documented
        // AGE_FLOOR_PCT..AGE_CEILING_PCT band (see the constants above).
        const ageProfileScore = clampScore((((demographics.age18to35Pct ?? 0) - AGE_FLOOR_PCT) /
            (AGE_CEILING_PCT - AGE_FLOOR_PCT)) *
            100
        );

        // Fewer nearby competitors = higher opportunity.
        const competitionScore = clampScore(
          (1 - places.competitorCount / MAX_COMPETITORS) * 100
        );

        const anchorScore = clampScore(
          (places.anchorPoints.length / MAX_ANCHORS) * 100
        );

        // Relative cost pressure from signals already measured above — no
        // extra lookups, and no claim about what the zone actually costs.
        const costPressureIndex = clampScore(
          COST_PRESSURE_WEIGHTS.purchasingPower * purchasingPowerScore +
            COST_PRESSURE_WEIGHTS.footfall * footfallPotentialScore
        );

        const budgetFitScore = budgetFitFor(costPressureIndex, costCeiling);

        /**
         * Only components we actually measured contribute. Their weights are
         * renormalized to sum to 1.0, so a missing upstream lowers confidence
         * without silently dragging every zone's score down — which is what
         * scoring an absent signal as zero would do.
         */
        const weightedAverage = (
          parts: { weight: number; score: number; available?: boolean }[]
        ): number => {
          const usable = parts.filter((p) => p.available !== false);
          const totalWeight = usable.reduce((sum, p) => sum + p.weight, 0);
          if (totalWeight === 0) return 0;
          return (
            usable.reduce((sum, p) => sum + p.weight * p.score, 0) / totalWeight
          );
        };

        // The demographic figure shown to the user combines exactly the
        // demographic components the Opportunity Score uses, in exactly the
        // proportion they carry there — so it explains the ranking instead of
        // being an unrelated average.
        const demographicScore = clampScore(
          weightedAverage([
            { weight: WEIGHTS.population, score: populationScore, available: hasPopulation },
            { weight: WEIGHTS.purchasingPower, score: purchasingPowerScore },
            { weight: WEIGHTS.ageProfile, score: ageProfileScore, available: hasAge },
          ])
        );

        const opportunityScore = clampScore(
          weightedAverage([
            { weight: WEIGHTS.footfallPotential, score: footfallPotentialScore },
            { weight: WEIGHTS.population, score: populationScore, available: hasPopulation },
            { weight: WEIGHTS.purchasingPower, score: purchasingPowerScore },
            { weight: WEIGHTS.ageProfile, score: ageProfileScore, available: hasAge },
            { weight: WEIGHTS.competition, score: competitionScore },
            { weight: WEIGHTS.anchors, score: anchorScore },
            { weight: WEIGHTS.budgetFit, score: budgetFitScore },
          ])
        );

        return {
          zone: zone.name,
          lat: zone.lat,
          lng: zone.lng,
          opportunityScore: Math.round(opportunityScore),
          footfallPotentialScore: Math.round(footfallPotentialScore),
          competitionScore: Math.round(competitionScore),
          demographicScore: Math.round(demographicScore),
          populationScore: Math.round(populationScore),
          purchasingPowerScore: Math.round(purchasingPowerScore),
          ageProfileScore: Math.round(ageProfileScore),
          anchorScore: Math.round(anchorScore),
          population: demographics.population,
          competitorCount: places.competitorCount,
          costPressureIndex: Math.round(costPressureIndex),
          budgetFitScore: Math.round(budgetFitScore),
        };
      }
    );

    evaluations.sort(
      (a, b) => b.opportunityScore - a.opportunityScore
    );

    const top = evaluations[0];

    console.error(
      `[opportunity] winner="${top.zone}" footfallPotential=${top.footfallPotentialScore} ` +
        `population=${top.populationScore} purchasingPower=${top.purchasingPowerScore} ` +
        `ageProfile=${top.ageProfileScore} competition=${top.competitionScore} ` +
        `anchors=${top.anchorScore} costPressure=${top.costPressureIndex} ` +
        `budgetFit=${top.budgetFitScore} (ceiling=${costCeiling}) ` +
        `=> opportunity=${top.opportunityScore}`
    );

    const executiveSummary =
      `Based on analysis of ${evaluations.length} candidate zones for a ${input.businessType} ` +
      `in ${input.city}, ${top.zone} presents the strongest opportunity with a score of ` +
      `${top.opportunityScore}/100 — driven by a footfall potential score of ` +
      `${top.footfallPotentialScore}/100 and a demographic score of ` +
      `${top.demographicScore}/100.`;

    return {
      opportunityScore: top.opportunityScore,
      recommendedArea: top.zone,

      // AnalyzeOutput calls this field "traffic" and the name is kept for
      // schema compatibility, but the value is the Footfall Potential Score —
      // not measured vehicle or pedestrian traffic.
      traffic: top.footfallPotentialScore,

      competition: top.competitionScore,
      demographics: top.demographicScore,
      executiveSummary,

      // Every evaluated zone, best first. These are the same numbers that
      // produced the ranking above — no separate derivation.
      zones: evaluations.map((e) => ({
        name: e.zone,
        lat: e.lat,
        lng: e.lng,
        opportunityScore: e.opportunityScore,
        footfallPotentialScore: e.footfallPotentialScore,
        demographicScore: e.demographicScore,
        competitionScore: e.competitionScore,
        anchorScore: e.anchorScore,
        population: e.population,
        competitorCount: e.competitorCount,
        costPressureIndex: e.costPressureIndex,
        budgetFitScore: e.budgetFitScore,
      })),

      budgetAssumption: describeBudgetAssumption(input.budget),

      // Stated explicitly rather than left for the reader to notice that a
      // column is empty.
      dataAvailabilityNote: zoneOutputs.some(
        (z) => z.demographics.population === null
      )
        ? 'Population and age profile are unavailable — the WorldPop API did not respond. ' +
          'Scores were computed from the remaining measured signals (footfall potential, ' +
          'purchasing power, competition, anchor points and budget fit) with their weights ' +
          'renormalized. No population figures were estimated or substituted.'
        : null,
    };
  }
}