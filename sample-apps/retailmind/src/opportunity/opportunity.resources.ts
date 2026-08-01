import { ResourceDecorator as Resource, Injectable } from '@nitrostack/core';
import {
  AGE_CEILING_PCT,
  AGE_FLOOR_PCT,
  BUDGET_BANDS,
  BUDGET_OVERRUN_TOLERANCE,
  COST_PRESSURE_WEIGHTS,
  MAX_ANCHORS,
  MAX_COMPETITORS,
  MAX_FOOTFALL_POTENTIAL,
  MAX_POPULATION,
  MAX_PURCHASING_POWER,
  WEIGHTS,
} from './opportunity-engine.service.js';
import {
  CATCHMENT_RADIUS_METERS,
  FOOTFALL_SATURATION,
  FOOTFALL_WEIGHTS,
  FOOT_TRAFFIC_MAX,
} from '../tools/traffic/traffic.service.js';
import {
  AFFLUENCE_SATURATION,
  AFFLUENCE_WEIGHTS,
  CATCHMENT_RADIUS_KM,
  CATCHMENT_REUSE_RADIUS_KM,
  INCOME_INDEX_MAX,
  WORLDPOP_DATASET,
  WORLDPOP_YEAR,
} from '../tools/demographics/demographics.service.js';

/**
 * Methodology Resource
 *
 * Publishes exactly how an Opportunity Score is produced, so a client can
 * explain or challenge a number instead of taking it on trust.
 *
 * Every value below is imported from the module that actually uses it — none
 * of it is restated here. That matters: a hand-copied constant would keep
 * reporting the old figure after a retune, which is worse than publishing no
 * methodology at all.
 */
@Injectable()
export class OpportunityResources {
  @Resource({
    uri: 'retailmind://methodology',
    name: 'RetailMind Scoring Methodology',
    description:
      'The complete Opportunity Score model: component weights, normalization anchors, budget assumptions, and which values are measured, derived, or assumed.',
    mimeType: 'application/json',
  })
  async getMethodology() {
    return {
      summary:
        'The Opportunity Score is a weighted blend of six normalized components, each on a 0-100 scale. Weights sum to exactly 1.0, so the score can reach a true 100.',

      // The single most useful thing a reader can know about this system.
      dataProvenance: {
        measured: [
          'Zone coordinates and names (Geoapify geocoding, OpenStreetMap)',
          'Competitor and anchor-point counts (Geoapify Places)',
          'Catchment population (WorldPop gridded population)',
          'Share of population aged 18-35 (WorldPop age/sex pyramid)',
          'Counts of transit stops, schools, shops, eateries and venues (Geoapify Places)',
        ],
        derived: [
          'Footfall Potential Index — weighted facility counts, not observed pedestrian traffic',
          'Purchasing Power Proxy — affluence-signal density, NOT measured household income',
          'Cost Pressure Index — blend of purchasing power and footfall, NOT a rent figure',
        ],
        assumed: [
          'All component weights',
          'Footfall category weights and saturation point',
          'Age normalization anchors',
          'Budget-to-cost-ceiling bands — the weakest link; no free locality-level rent data exists for Indian neighbourhoods',
        ],
      },

      opportunityScore: {
        formula:
          'sum(weight_i * componentScore_i), each component clamped to 0-100',
        weights: WEIGHTS,
        weightSum: Object.values(WEIGHTS).reduce((a, b) => a + b, 0),
        note: 'The weight sum is asserted at module load; a drift from 1.0 throws rather than silently capping the score below 100.',
      },

      components: {
        footfallPotential: {
          type: 'derived',
          formula: 'sqrt(min(1, weightedFacilities / saturation)) * scaleMax',
          catchmentRadiusMeters: CATCHMENT_RADIUS_METERS,
          categoryWeights: FOOTFALL_WEIGHTS,
          saturation: FOOTFALL_SATURATION,
          scaleMax: FOOT_TRAFFIC_MAX,
          normalizedBy: MAX_FOOTFALL_POTENTIAL,
          caveat:
            'Reflects facility density, not observed movement. Saturates in very dense metros where the provider result cap is reached.',
        },
        population: {
          type: 'measured',
          source: `WorldPop ${WORLDPOP_DATASET} ${WORLDPOP_YEAR}`,
          catchmentRadiusKm: CATCHMENT_RADIUS_KM,
          normalizedBy: MAX_POPULATION,
          caveat: `Fetched once per analysis and reused for zones within ${CATCHMENT_REUSE_RADIUS_KM}km, so it is a catchment-level figure and is identical across the zones of one analysis.`,
        },
        purchasingPower: {
          type: 'derived',
          formula: 'log-scaled weighted count of affluence signals',
          categoryWeights: AFFLUENCE_WEIGHTS,
          saturation: AFFLUENCE_SATURATION,
          scaleMax: INCOME_INDEX_MAX,
          normalizedBy: MAX_PURCHASING_POWER,
          caveat:
            'Carried in the medianIncome field for schema compatibility, but it is NOT measured income and is not denominated in rupees.',
        },
        ageProfile: {
          type: 'measured input, assumed normalization',
          formula: `clamp((age18to35Pct - ${AGE_FLOOR_PCT}) / (${AGE_CEILING_PCT} - ${AGE_FLOOR_PCT}) * 100, 0, 100)`,
          floorPct: AGE_FLOOR_PCT,
          ceilingPct: AGE_CEILING_PCT,
          rationale:
            'The young-adult share spans roughly 28-37% across observed Indian cities, so the raw percentage would pin every city near 30. The anchors bracket that real range.',
        },
        competition: {
          type: 'measured',
          formula: '(1 - competitorCount / maxCompetitors) * 100',
          maxCompetitors: MAX_COMPETITORS,
          note: 'Fewer nearby competitors scores higher.',
        },
        anchors: {
          type: 'measured',
          formula: '(anchorPoints / maxAnchors) * 100',
          maxAnchors: MAX_ANCHORS,
        },
        budgetFit: {
          type: 'assumed',
          costPressureFormula:
            'costPressure = 0.6 * purchasingPowerScore + 0.4 * footfallPotentialScore',
          costPressureWeights: COST_PRESSURE_WEIGHTS,
          budgetBands: BUDGET_BANDS.map((band) => ({
            maxBudgetInr: band.maxBudget === Infinity ? null : band.maxBudget,
            affordableCostCeiling: band.costCeiling,
          })),
          overrunTolerance: BUDGET_OVERRUN_TOLERANCE,
          formula:
            'budgetFit = 100 within the ceiling, then falls linearly to 0 across the overrun tolerance',
          warning:
            'The budget bands are NOT backed by rent data. They are a judgement call and carry the smallest major weight for that reason. Verify actual rents before acting on budget fit.',
        },
      },

      knownLimitations: [
        'Population and age profile are catchment-level, so they shift a whole city up or down rather than separating zones within it.',
        'Footfall potential saturates in very dense metros such as Bengaluru, where zones hit the provider result cap.',
        'Budget fit stops discriminating when every candidate zone sits far above the affordable ceiling.',
        'All weights are reasoned judgement for retail siting, not coefficients fitted to outcome data.',
      ],
    };
  }
}
